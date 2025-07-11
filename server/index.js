const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const k8s = require('@kubernetes/client-node');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage for uploaded kubeconfig
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'kubeconfig');
  }
});

const upload = multer({ storage });

// Global variables to store Kubernetes client
let k8sApi = null;
let currentKubeconfig = null;

// Store active log streams
const activeLogStreams = new Map();

// Helper function to initialize Kubernetes client
function initializeK8sClient(kubeconfigPath) {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromFile(kubeconfigPath);
    
    const k8sAppsV1Api = kc.makeApiClient(k8s.AppsV1Api);
    const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    
    k8sApi = {
      apps: k8sAppsV1Api,
      core: k8sCoreV1Api
    };
    
    currentKubeconfig = kubeconfigPath;
    return true;
  } catch (error) {
    console.error('Failed to initialize Kubernetes client:', error);
    return false;
  }
}

// Routes

// Upload kubeconfig
app.post('/api/upload-kubeconfig', upload.single('kubeconfig'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No kubeconfig file uploaded' });
    }

    const kubeconfigPath = req.file.path;
    
    // Initialize Kubernetes client
    const success = initializeK8sClient(kubeconfigPath);
    
    if (!success) {
      return res.status(400).json({ error: 'Invalid kubeconfig file' });
    }

    res.json({ message: 'Kubeconfig uploaded successfully' });
  } catch (error) {
    console.error('Error uploading kubeconfig:', error);
    res.status(500).json({ error: 'Failed to upload kubeconfig' });
  }
});

// Get all namespaces
app.get('/api/namespaces', async (req, res) => {
  try {
    if (!k8sApi) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const response = await k8sApi.core.listNamespace();
    const namespaces = response.body.items.map(ns => ({
      name: ns.metadata.name,
      status: ns.status.phase,
      creationTimestamp: ns.metadata.creationTimestamp
    }));

    res.json(namespaces);
  } catch (error) {
    console.error('Error fetching namespaces:', error);
    res.status(500).json({ error: 'Failed to fetch namespaces' });
  }
});

// Get all pods in a namespace
app.get('/api/namespaces/:namespace/pods', async (req, res) => {
  try {
    if (!k8sApi) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const { namespace } = req.params;
    const response = await k8sApi.core.listNamespacedPod(namespace);
    
    const pods = response.body.items.map(pod => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      containers: pod.spec.containers.map(container => ({
        name: container.name,
        image: container.image,
        ports: container.ports || []
      })),
      creationTimestamp: pod.metadata.creationTimestamp,
      ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True'
    }));

    res.json(pods);
  } catch (error) {
    console.error('Error fetching pods:', error);
    res.status(500).json({ error: 'Failed to fetch pods' });
  }
});

// Get pod logs (real-time streaming)
app.get('/api/pods/:namespace/:podName/logs', (req, res) => {
  try {
    if (!currentKubeconfig) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const { namespace, podName } = req.params;
    const { container, follow, tailLines } = req.query;
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const streamId = `${namespace}-${podName}-${container || 'default'}-${Date.now()}`;
    
    // Build kubectl command
    const args = [
      '--kubeconfig', currentKubeconfig,
      'logs',
      '-n', namespace,
      podName
    ];

    if (container) {
      args.push('-c', container);
    }

    if (follow === 'true') {
      args.push('-f');
    }

    if (tailLines) {
      args.push('--tail', tailLines);
    }

    // Start kubectl logs process
    const logProcess = spawn('kubectl', args);
    
    // Store the process for cleanup
    activeLogStreams.set(streamId, logProcess);

    // Send initial connection event
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ message: 'Log stream connected', streamId })}\n\n`);

    // Handle stdout (logs)
    logProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        res.write(`event: log\n`);
        res.write(`data: ${JSON.stringify({ 
          timestamp: new Date().toISOString(), 
          message: line,
          level: 'info'
        })}\n\n`);
      });
    });

    // Handle stderr (errors)
    logProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        res.write(`event: log\n`);
        res.write(`data: ${JSON.stringify({ 
          timestamp: new Date().toISOString(), 
          message: line,
          level: 'error'
        })}\n\n`);
      });
    });

    // Handle process exit
    logProcess.on('close', (code) => {
      res.write(`event: close\n`);
      res.write(`data: ${JSON.stringify({ message: `Log stream closed with code ${code}` })}\n\n`);
      activeLogStreams.delete(streamId);
      res.end();
    });

    // Handle process error
    logProcess.on('error', (error) => {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: `Log stream error: ${error.message}` })}\n\n`);
      activeLogStreams.delete(streamId);
      res.end();
    });

    // Clean up on client disconnect
    req.on('close', () => {
      if (activeLogStreams.has(streamId)) {
        logProcess.kill();
        activeLogStreams.delete(streamId);
      }
    });

  } catch (error) {
    console.error('Error streaming logs:', error);
    res.status(500).json({ error: 'Failed to stream logs' });
  }
});

// Port forward endpoint
app.post('/api/port-forward', async (req, res) => {
  try {
    if (!currentKubeconfig) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const { namespace, podName, containerPort, localPort } = req.body;

    if (!namespace || !podName || !containerPort || !localPort) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Use kubectl port-forward command
    const command = 'kubectl';
    const args = [
      '--kubeconfig', currentKubeconfig,
      'port-forward',
      `-n`, namespace,
      `pod/${podName}`,
      `${localPort}:${containerPort}`
    ];

    const portForward = spawn(command, args, {
      stdio: 'pipe',
      detached: true
    });

    let output = '';
    let errorOutput = '';

    portForward.stdout.on('data', (data) => {
      output += data.toString();
    });

    portForward.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Give it a moment to start
    setTimeout(() => {
      if (portForward.pid) {
        res.json({ 
          message: `Port forwarding started: localhost:${localPort} -> ${podName}:${containerPort}`,
          pid: portForward.pid,
          localPort,
          containerPort,
          podName,
          namespace
        });
      } else {
        res.status(500).json({ error: 'Failed to start port forwarding', details: errorOutput });
      }
    }, 1000);

  } catch (error) {
    console.error('Error starting port forward:', error);
    res.status(500).json({ error: 'Failed to start port forwarding' });
  }
});

// Get all pods (across all namespaces)
app.get('/api/pods', async (req, res) => {
  try {
    if (!k8sApi) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const response = await k8sApi.core.listPodForAllNamespaces();
    
    const pods = response.body.items.map(pod => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      containers: pod.spec.containers.map(container => ({
        name: container.name,
        image: container.image,
        ports: container.ports || []
      })),
      creationTimestamp: pod.metadata.creationTimestamp,
      ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True'
    }));

    res.json(pods);
  } catch (error) {
    console.error('Error fetching all pods:', error);
    res.status(500).json({ error: 'Failed to fetch pods' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', kubeconfigLoaded: !!k8sApi });
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  
  // Kill all active log streams
  activeLogStreams.forEach((process, streamId) => {
    console.log(`Terminating log stream: ${streamId}`);
    process.kill();
  });
  
  activeLogStreams.clear();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 