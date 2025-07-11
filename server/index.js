const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const k8s = require('@kubernetes/client-node');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Storage for uploaded kubeconfigs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\.[^/.]+$/, "");
    cb(null, `kubeconfig-${timestamp}-${originalName}`);
  }
});

const upload = multer({ storage });

// Global variables to store Kubernetes clients and kubeconfigs
let kubeconfigFiles = [];
let activeKubeconfig = null;
let k8sApi = null;

// Store active log streams and port forwards
const activeLogStreams = new Map();
const activePortForwards = new Map();

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
    
    activeKubeconfig = kubeconfigPath;
    return true;
  } catch (error) {
    console.error('Failed to initialize Kubernetes client:', error);
    return false;
  }
}

// Helper function to get kubeconfig info
function getKubeconfigInfo(kubeconfigPath) {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromFile(kubeconfigPath);
    
    const currentContext = kc.getCurrentContext();
    const cluster = kc.getCurrentCluster();
    const user = kc.getCurrentUser();
    
    return {
      currentContext: currentContext,
      clusterName: cluster?.name || 'Unknown',
      userName: user?.name || 'Unknown',
      server: cluster?.server || 'Unknown'
    };
  } catch (error) {
    console.error('Failed to get kubeconfig info:', error);
    return null;
  }
}

// Load existing kubeconfigs on startup
function loadExistingKubeconfigs() {
  try {
    const uploadDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach(file => {
        if (file.startsWith('kubeconfig-')) {
          const filePath = path.join(uploadDir, file);
          const info = getKubeconfigInfo(filePath);
          if (info) {
            kubeconfigFiles.push({
              id: file,
              name: file.replace('kubeconfig-', '').replace(/^\d+-/, ''),
              path: filePath,
              uploadedAt: fs.statSync(filePath).mtime,
              ...info
            });
          }
        }
      });
      
      // Set the first kubeconfig as active if none is set
      if (kubeconfigFiles.length > 0 && !activeKubeconfig) {
        initializeK8sClient(kubeconfigFiles[0].path);
      }
    }
  } catch (error) {
    console.error('Failed to load existing kubeconfigs:', error);
  }
}

// Initialize existing kubeconfigs
loadExistingKubeconfigs();

// Routes

// Get all kubeconfigs with active status
app.get('/api/kubeconfig/list', (req, res) => {
  try {
    const configs = kubeconfigFiles.map(config => ({
      id: config.id,
      name: config.name,
      contextName: config.currentContext,
      uploadedAt: config.uploadedAt
    }));
    
    const active = kubeconfigFiles.find(config => config.path === activeKubeconfig);
    
    res.json({
      kubeconfigs: configs,
      active: active ? {
        id: active.id,
        name: active.name,
        contextName: active.currentContext,
        uploadedAt: active.uploadedAt
      } : null
    });
  } catch (error) {
    console.error('Error fetching kubeconfigs:', error);
    res.status(500).json({ error: 'Failed to fetch kubeconfigs' });
  }
});

// Get all kubeconfigs (legacy endpoint)
app.get('/api/kubeconfigs', (req, res) => {
  const configs = kubeconfigFiles.map(config => ({
    ...config,
    isActive: config.path === activeKubeconfig
  }));
  res.json(configs);
});

// Upload kubeconfig
app.post('/api/kubeconfig/upload', upload.single('kubeconfig'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No kubeconfig file uploaded' });
    }

    const kubeconfigPath = req.file.path;
    const info = getKubeconfigInfo(kubeconfigPath);
    
    if (!info) {
      fs.unlinkSync(kubeconfigPath); // Clean up invalid file
      return res.status(400).json({ error: 'Invalid kubeconfig file' });
    }

    const newConfig = {
      id: req.file.filename,
      name: req.file.originalname,
      path: kubeconfigPath,
      uploadedAt: new Date(),
      ...info
    };

    kubeconfigFiles.push(newConfig);

    // If this is the first kubeconfig, make it active
    if (kubeconfigFiles.length === 1) {
      initializeK8sClient(kubeconfigPath);
    }

    // Return the updated list
    const configs = kubeconfigFiles.map(config => ({
      id: config.id,
      name: config.name,
      contextName: config.currentContext,
      uploadedAt: config.uploadedAt
    }));
    
    const active = kubeconfigFiles.find(config => config.path === activeKubeconfig);

    res.json({
      message: 'Kubeconfig uploaded successfully',
      kubeconfigs: configs,
      active: active ? {
        id: active.id,
        name: active.name,
        contextName: active.currentContext,
        uploadedAt: active.uploadedAt
      } : null
    });
  } catch (error) {
    console.error('Error uploading kubeconfig:', error);
    res.status(500).json({ error: 'Failed to upload kubeconfig' });
  }
});

// Legacy upload endpoint
app.post('/api/upload-kubeconfig', upload.single('kubeconfig'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No kubeconfig file uploaded' });
    }

    const kubeconfigPath = req.file.path;
    const info = getKubeconfigInfo(kubeconfigPath);
    
    if (!info) {
      fs.unlinkSync(kubeconfigPath); // Clean up invalid file
      return res.status(400).json({ error: 'Invalid kubeconfig file' });
    }

    const newConfig = {
      id: req.file.filename,
      name: req.file.originalname,
      path: kubeconfigPath,
      uploadedAt: new Date(),
      ...info
    };

    kubeconfigFiles.push(newConfig);

    // If this is the first kubeconfig, make it active
    if (kubeconfigFiles.length === 1) {
      initializeK8sClient(kubeconfigPath);
    }

    res.json({ 
      message: 'Kubeconfig uploaded successfully',
      kubeconfig: newConfig
    });
  } catch (error) {
    console.error('Error uploading kubeconfig:', error);
    res.status(500).json({ error: 'Failed to upload kubeconfig' });
  }
});

// Activate kubeconfig
app.post('/api/kubeconfig/activate', (req, res) => {
  try {
    const { kubeconfigId } = req.body;
    const config = kubeconfigFiles.find(c => c.id === kubeconfigId);
    
    if (!config) {
      return res.status(404).json({ error: 'Kubeconfig not found' });
    }

    const success = initializeK8sClient(config.path);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to activate kubeconfig' });
    }

    // Return the updated list
    const configs = kubeconfigFiles.map(config => ({
      id: config.id,
      name: config.name,
      contextName: config.currentContext,
      uploadedAt: config.uploadedAt
    }));
    
    const active = kubeconfigFiles.find(config => config.path === activeKubeconfig);

    res.json({
      message: 'Kubeconfig activated successfully',
      kubeconfigs: configs,
      active: active ? {
        id: active.id,
        name: active.name,
        contextName: active.currentContext,
        uploadedAt: active.uploadedAt
      } : null
    });
  } catch (error) {
    console.error('Error activating kubeconfig:', error);
    res.status(500).json({ error: 'Failed to activate kubeconfig' });
  }
});

// Set active kubeconfig (legacy endpoint)
app.post('/api/kubeconfigs/:id/activate', (req, res) => {
  try {
    const { id } = req.params;
    const config = kubeconfigFiles.find(c => c.id === id);
    
    if (!config) {
      return res.status(404).json({ error: 'Kubeconfig not found' });
    }

    const success = initializeK8sClient(config.path);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to activate kubeconfig' });
    }

    res.json({ message: 'Kubeconfig activated successfully' });
  } catch (error) {
    console.error('Error activating kubeconfig:', error);
    res.status(500).json({ error: 'Failed to activate kubeconfig' });
  }
});

// Delete kubeconfig
app.delete('/api/kubeconfig/:id', (req, res) => {
  try {
    const { id } = req.params;
    const configIndex = kubeconfigFiles.findIndex(c => c.id === id);
    
    if (configIndex === -1) {
      return res.status(404).json({ error: 'Kubeconfig not found' });
    }

    const config = kubeconfigFiles[configIndex];
    
    // If this is the active kubeconfig, deactivate it
    if (config.path === activeKubeconfig) {
      activeKubeconfig = null;
      k8sApi = null;
      
      // Activate another kubeconfig if available
      const remainingConfigs = kubeconfigFiles.filter((_, index) => index !== configIndex);
      if (remainingConfigs.length > 0) {
        initializeK8sClient(remainingConfigs[0].path);
      }
    }

    // Delete the file
    fs.unlinkSync(config.path);
    
    // Remove from array
    kubeconfigFiles.splice(configIndex, 1);

    // Return the updated list
    const configs = kubeconfigFiles.map(config => ({
      id: config.id,
      name: config.name,
      contextName: config.currentContext,
      uploadedAt: config.uploadedAt
    }));
    
    const active = kubeconfigFiles.find(config => config.path === activeKubeconfig);

    res.json({
      message: 'Kubeconfig deleted successfully',
      kubeconfigs: configs,
      active: active ? {
        id: active.id,
        name: active.name,
        contextName: active.currentContext,
        uploadedAt: active.uploadedAt
      } : null
    });
  } catch (error) {
    console.error('Error deleting kubeconfig:', error);
    res.status(500).json({ error: 'Failed to delete kubeconfig' });
  }
});

// Delete kubeconfig (legacy endpoint)
app.delete('/api/kubeconfigs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const configIndex = kubeconfigFiles.findIndex(c => c.id === id);
    
    if (configIndex === -1) {
      return res.status(404).json({ error: 'Kubeconfig not found' });
    }

    const config = kubeconfigFiles[configIndex];
    
    // If this is the active kubeconfig, deactivate it
    if (config.path === activeKubeconfig) {
      activeKubeconfig = null;
      k8sApi = null;
      
      // Activate another kubeconfig if available
      const remainingConfigs = kubeconfigFiles.filter((_, index) => index !== configIndex);
      if (remainingConfigs.length > 0) {
        initializeK8sClient(remainingConfigs[0].path);
      }
    }

    // Delete the file
    fs.unlinkSync(config.path);
    
    // Remove from array
    kubeconfigFiles.splice(configIndex, 1);

    res.json({ message: 'Kubeconfig deleted successfully' });
  } catch (error) {
    console.error('Error deleting kubeconfig:', error);
    res.status(500).json({ error: 'Failed to delete kubeconfig' });
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

    res.json({ namespaces });
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
      ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True',
      labels: pod.metadata.labels || {}
    }));

    res.json({ pods });
  } catch (error) {
    console.error('Error fetching pods:', error);
    res.status(500).json({ error: 'Failed to fetch pods' });
  }
});

// Get all pods (across all namespaces or filtered by namespace)
app.get('/api/pods', async (req, res) => {
  try {
    if (!k8sApi) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const { namespace } = req.query;
    let response;
    
    if (namespace) {
      response = await k8sApi.core.listNamespacedPod(namespace);
    } else {
      response = await k8sApi.core.listPodForAllNamespaces();
    }
    
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
      ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True',
      labels: pod.metadata.labels || {}
    }));

    res.json({ pods });
  } catch (error) {
    console.error('Error fetching pods:', error);
    res.status(500).json({ error: 'Failed to fetch pods' });
  }
});

// Get deployments
app.get('/api/deployments', async (req, res) => {
  try {
    if (!k8sApi) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const response = await k8sApi.apps.listDeploymentForAllNamespaces();
    
    const deployments = response.body.items.map(deployment => ({
      name: deployment.metadata.name,
      namespace: deployment.metadata.namespace,
      replicas: deployment.spec.replicas,
      readyReplicas: deployment.status.readyReplicas || 0,
      availableReplicas: deployment.status.availableReplicas || 0,
      containers: deployment.spec.template.spec.containers.map(container => ({
        name: container.name,
        image: container.image
      })),
      creationTimestamp: deployment.metadata.creationTimestamp,
      labels: deployment.metadata.labels || {}
    }));

    res.json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// Update deployment image
app.patch('/api/deployments/:namespace/:name/image', async (req, res) => {
  try {
    if (!k8sApi) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const { namespace, name } = req.params;
    const { containerName, newImage } = req.body;

    if (!containerName || !newImage) {
      return res.status(400).json({ error: 'Container name and new image are required' });
    }

    // Get current deployment
    const deployment = await k8sApi.apps.readNamespacedDeployment(name, namespace);
    
    // Update the image
    const containers = deployment.body.spec.template.spec.containers;
    const containerIndex = containers.findIndex(c => c.name === containerName);
    
    if (containerIndex === -1) {
      return res.status(404).json({ error: 'Container not found in deployment' });
    }

    containers[containerIndex].image = newImage;

    // Patch the deployment
    await k8sApi.apps.patchNamespacedDeployment(
      name,
      namespace,
      deployment.body,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );

    res.json({ 
      message: `Deployment ${name} updated successfully`,
      containerName,
      newImage
    });
  } catch (error) {
    console.error('Error updating deployment:', error);
    res.status(500).json({ error: 'Failed to update deployment' });
  }
});

// Get aggregated logs for pods with same container name
app.get('/api/logs/aggregate', (req, res) => {
  try {
    if (!activeKubeconfig) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const { containerName, namespaces, follow, tailLines } = req.query;
    
    if (!containerName) {
      return res.status(400).json({ error: 'Container name is required' });
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const streamId = `aggregate-${containerName}-${Date.now()}`;
    const processes = [];

    // Send initial connection event
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ message: 'Aggregate log stream connected', streamId })}\n\n`);

    // Function to start log stream for a pod
    const startPodLogStream = async (podName, namespace) => {
      const args = [
        '--kubeconfig', activeKubeconfig,
        'logs',
        '-n', namespace,
        podName,
        '-c', containerName
      ];

      if (follow === 'true') {
        args.push('-f');
      }

      if (tailLines) {
        args.push('--tail', tailLines);
      }

      const logProcess = spawn('kubectl', args);
      processes.push(logProcess);

      logProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          res.write(`event: log\n`);
          res.write(`data: ${JSON.stringify({ 
            timestamp: new Date().toISOString(), 
            message: line,
            podName,
            namespace,
            containerName,
            level: 'info'
          })}\n\n`);
        });
      });

      logProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          res.write(`event: log\n`);
          res.write(`data: ${JSON.stringify({ 
            timestamp: new Date().toISOString(), 
            message: line,
            podName,
            namespace,
            containerName,
            level: 'error'
          })}\n\n`);
        });
      });

      logProcess.on('close', (code) => {
        console.log(`Log stream for ${namespace}/${podName} closed with code ${code}`);
      });
    };

    // Get pods with the specified container name
    k8sApi.core.listPodForAllNamespaces().then(response => {
      const matchingPods = response.body.items.filter(pod => {
        const hasContainer = pod.spec.containers.some(container => container.name === containerName);
        const inNamespace = !namespaces || namespaces.split(',').includes(pod.metadata.namespace);
        return hasContainer && inNamespace && pod.status.phase === 'Running';
      });

      if (matchingPods.length === 0) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ message: 'No running pods found with container name: ' + containerName })}\n\n`);
        return;
      }

      // Start log streams for all matching pods
      matchingPods.forEach(pod => {
        startPodLogStream(pod.metadata.name, pod.metadata.namespace);
      });

      res.write(`event: info\n`);
      res.write(`data: ${JSON.stringify({ message: `Started log streams for ${matchingPods.length} pods` })}\n\n`);
    }).catch(error => {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: 'Failed to fetch pods: ' + error.message })}\n\n`);
    });

    // Store processes for cleanup
    activeLogStreams.set(streamId, processes);

    // Cleanup on disconnect
    req.on('close', () => {
      processes.forEach(process => {
        if (process && !process.killed) {
          process.kill();
        }
      });
      activeLogStreams.delete(streamId);
    });

  } catch (error) {
    console.error('Error starting aggregate log stream:', error);
    res.status(500).json({ error: 'Failed to start aggregate log stream' });
  }
});

// Get pod logs (real-time streaming)
app.get('/api/pods/:namespace/:podName/logs', (req, res) => {
  try {
    if (!activeKubeconfig) {
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
      '--kubeconfig', activeKubeconfig,
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
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ 
          timestamp: new Date().toISOString(), 
          message: line,
          level: 'error'
        })}\n\n`);
      });
    });

    // Handle process close
    logProcess.on('close', (code) => {
      res.write(`event: close\n`);
      res.write(`data: ${JSON.stringify({ message: 'Log stream closed', code })}\n\n`);
      activeLogStreams.delete(streamId);
    });

    // Handle process error
    logProcess.on('error', (error) => {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: 'Process error: ' + error.message })}\n\n`);
      activeLogStreams.delete(streamId);
    });

    // Cleanup on disconnect
    req.on('close', () => {
      if (logProcess && !logProcess.killed) {
        logProcess.kill();
      }
      activeLogStreams.delete(streamId);
    });

  } catch (error) {
    console.error('Error starting log stream:', error);
    res.status(500).json({ error: 'Failed to start log stream' });
  }
});

// Port forward endpoint
app.post('/api/port-forward', async (req, res) => {
  try {
    if (!activeKubeconfig) {
      return res.status(400).json({ error: 'No kubeconfig loaded' });
    }

    const { namespace, podName, containerName, containerPort, localPort } = req.body;

    if (!namespace || !podName || !containerPort || !localPort) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Check if local port is already in use
    const existingPortForward = Array.from(activePortForwards.values()).find(
      pf => pf.localPort === localPort && pf.status === 'active'
    );
    
    if (existingPortForward) {
      return res.status(400).json({ 
        error: `Port ${localPort} is already in use by another port forward` 
      });
    }

    // Generate unique ID for this port forward
    const portForwardId = uuidv4();
    
    // Create port forward entry
    const portForward = {
      id: portForwardId,
      namespace,
      podName,
      containerName: containerName || 'default',
      containerPort,
      localPort,
      status: 'starting',
      createdAt: new Date().toISOString(),
      process: null
    };

    // Store the port forward
    activePortForwards.set(portForwardId, portForward);

    // Use kubectl port-forward command
    const command = 'kubectl';
    const args = [
      '--kubeconfig', activeKubeconfig,
      'port-forward',
      `-n`, namespace,
      `pod/${podName}`,
      `${localPort}:${containerPort}`
    ];

    const portForwardProcess = spawn(command, args, {
      stdio: 'pipe',
      detached: false
    });

    // Update the port forward with the process
    portForward.process = portForwardProcess;

    let output = '';
    let errorOutput = '';

    portForwardProcess.stdout.on('data', (data) => {
      output += data.toString();
      // Check if port forward is ready
      if (data.toString().includes('Forwarding from')) {
        portForward.status = 'active';
        activePortForwards.set(portForwardId, portForward);
      }
    });

    portForwardProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    portForwardProcess.on('close', (code) => {
      console.log(`Port forward ${portForwardId} closed with code ${code}`);
      portForward.status = 'stopped';
      activePortForwards.set(portForwardId, portForward);
    });

    portForwardProcess.on('error', (error) => {
      console.error(`Port forward ${portForwardId} error:`, error);
      portForward.status = 'error';
      activePortForwards.set(portForwardId, portForward);
    });

    // Give it a moment to start
    setTimeout(() => {
      if (portForwardProcess.pid) {
        res.json({ 
          message: `Port forwarding started: localhost:${localPort} -> ${podName}:${containerPort}`,
          portForward: {
            id: portForwardId,
            namespace,
            podName,
            containerName: containerName || 'default',
            containerPort,
            localPort,
            status: 'active',
            createdAt: portForward.createdAt
          }
        });
      } else {
        // Remove failed port forward
        activePortForwards.delete(portForwardId);
        res.status(500).json({ error: 'Failed to start port forwarding', details: errorOutput });
      }
    }, 1000);

  } catch (error) {
    console.error('Error starting port forward:', error);
    res.status(500).json({ error: 'Failed to start port forwarding' });
  }
});

// Get all port forwards
app.get('/api/port-forwards', (req, res) => {
  try {
    const portForwards = Array.from(activePortForwards.values()).map(pf => ({
      id: pf.id,
      namespace: pf.namespace,
      podName: pf.podName,
      containerName: pf.containerName,
      containerPort: pf.containerPort,
      localPort: pf.localPort,
      status: pf.status,
      createdAt: pf.createdAt
    }));
    
    res.json({ portForwards });
  } catch (error) {
    console.error('Error fetching port forwards:', error);
    res.status(500).json({ error: 'Failed to fetch port forwards' });
  }
});

// Start a stopped port forward
app.post('/api/port-forwards/:id/start', (req, res) => {
  try {
    const { id } = req.params;
    const portForward = activePortForwards.get(id);
    
    if (!portForward) {
      return res.status(404).json({ error: 'Port forward not found' });
    }
    
    if (portForward.status === 'active') {
      return res.status(400).json({ error: 'Port forward is already active' });
    }
    
    // Check if local port is already in use
    const existingPortForward = Array.from(activePortForwards.values()).find(
      pf => pf.localPort === portForward.localPort && pf.status === 'active' && pf.id !== id
    );
    
    if (existingPortForward) {
      return res.status(400).json({ 
        error: `Port ${portForward.localPort} is already in use by another port forward` 
      });
    }

    // Kill existing process if it exists
    if (portForward.process && !portForward.process.killed) {
      portForward.process.kill();
    }

    // Start new process
    const command = 'kubectl';
    const args = [
      '--kubeconfig', activeKubeconfig,
      'port-forward',
      `-n`, portForward.namespace,
      `pod/${portForward.podName}`,
      `${portForward.localPort}:${portForward.containerPort}`
    ];

    const portForwardProcess = spawn(command, args, {
      stdio: 'pipe',
      detached: false
    });

    portForward.process = portForwardProcess;
    portForward.status = 'starting';

    portForwardProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Forwarding from')) {
        portForward.status = 'active';
        activePortForwards.set(id, portForward);
      }
    });

    portForwardProcess.on('close', (code) => {
      console.log(`Port forward ${id} closed with code ${code}`);
      portForward.status = 'stopped';
      activePortForwards.set(id, portForward);
    });

    portForwardProcess.on('error', (error) => {
      console.error(`Port forward ${id} error:`, error);
      portForward.status = 'error';
      activePortForwards.set(id, portForward);
    });

    activePortForwards.set(id, portForward);
    
    res.json({ 
      message: 'Port forward started successfully',
      portForward: {
        id: portForward.id,
        namespace: portForward.namespace,
        podName: portForward.podName,
        containerName: portForward.containerName,
        containerPort: portForward.containerPort,
        localPort: portForward.localPort,
        status: portForward.status,
        createdAt: portForward.createdAt
      }
    });
  } catch (error) {
    console.error('Error starting port forward:', error);
    res.status(500).json({ error: 'Failed to start port forward' });
  }
});

// Stop a port forward
app.post('/api/port-forwards/:id/stop', (req, res) => {
  try {
    const { id } = req.params;
    const portForward = activePortForwards.get(id);
    
    if (!portForward) {
      return res.status(404).json({ error: 'Port forward not found' });
    }
    
    if (portForward.status !== 'active') {
      return res.status(400).json({ error: 'Port forward is not active' });
    }
    
    // Kill the process
    if (portForward.process && !portForward.process.killed) {
      portForward.process.kill();
    }
    
    portForward.status = 'stopped';
    activePortForwards.set(id, portForward);
    
    res.json({ 
      message: 'Port forward stopped successfully',
      portForward: {
        id: portForward.id,
        namespace: portForward.namespace,
        podName: portForward.podName,
        containerName: portForward.containerName,
        containerPort: portForward.containerPort,
        localPort: portForward.localPort,
        status: portForward.status,
        createdAt: portForward.createdAt
      }
    });
  } catch (error) {
    console.error('Error stopping port forward:', error);
    res.status(500).json({ error: 'Failed to stop port forward' });
  }
});

// Delete a port forward
app.delete('/api/port-forwards/:id', (req, res) => {
  try {
    const { id } = req.params;
    const portForward = activePortForwards.get(id);
    
    if (!portForward) {
      return res.status(404).json({ error: 'Port forward not found' });
    }
    
    // Kill the process if it's running
    if (portForward.process && !portForward.process.killed) {
      portForward.process.kill();
    }
    
    // Remove from active port forwards
    activePortForwards.delete(id);
    
    res.json({ 
      message: 'Port forward deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting port forward:', error);
    res.status(500).json({ error: 'Failed to delete port forward' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    kubeconfigLoaded: !!k8sApi,
    activeKubeconfig: activeKubeconfig ? path.basename(activeKubeconfig) : null,
    totalKubeconfigs: kubeconfigFiles.length
  });
});

// Cleanup on exit
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up...');
  
  // Clean up log streams
  activeLogStreams.forEach((process, streamId) => {
    if (process && !process.killed) {
      process.kill();
    }
  });
  activeLogStreams.clear();
  
  // Clean up port forwards
  activePortForwards.forEach((portForward, id) => {
    if (portForward.process && !portForward.process.killed) {
      portForward.process.kill();
    }
  });
  activePortForwards.clear();
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up...');
  
  // Clean up log streams
  activeLogStreams.forEach((process, streamId) => {
    if (process && !process.killed) {
      process.kill();
    }
  });
  activeLogStreams.clear();
  
  // Clean up port forwards
  activePortForwards.forEach((portForward, id) => {
    if (portForward.process && !portForward.process.killed) {
      portForward.process.kill();
    }
  });
  activePortForwards.clear();
  
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Loaded ${kubeconfigFiles.length} kubeconfig files`);
  if (activeKubeconfig) {
    console.log(`Active kubeconfig: ${path.basename(activeKubeconfig)}`);
  }
}); 