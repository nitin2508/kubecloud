import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Components
import FileUpload from './components/FileUpload';
import NamespaceDropdown from './components/NamespaceDropdown';
import PodList from './components/PodList';
import PortForwardDialog from './components/PortForwardDialog';
import ActivePortForwards from './components/ActivePortForwards';
import LogViewer from './components/LogViewer';

function App() {
  const [kubeconfigUploaded, setKubeconfigUploaded] = useState(false);
  const [namespaces, setNamespaces] = useState([]);
  const [pods, setPods] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPortForward, setShowPortForward] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [selectedPod, setSelectedPod] = useState(null);
  const [activePortForwards, setActivePortForwards] = useState([]);

  const checkHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      setKubeconfigUploaded(response.data.kubeconfigLoaded);
      if (response.data.kubeconfigLoaded) {
        fetchNamespaces();
        fetchAllPods();
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleKubeconfigUpload = async (file) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('kubeconfig', file);

      const response = await axios.post('/api/upload-kubeconfig', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(response.data.message);
      setKubeconfigUploaded(true);
      fetchNamespaces();
      fetchAllPods();
      setActivePortForwards([]); // Clear any previous port forwards
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload kubeconfig');
    } finally {
      setLoading(false);
    }
  };

  const fetchNamespaces = async () => {
    try {
      const response = await axios.get('/api/namespaces');
      setNamespaces(response.data);
    } catch (error) {
      setError('Failed to fetch namespaces');
    }
  };

  const fetchAllPods = async () => {
    try {
      const response = await axios.get('/api/pods');
      setPods(response.data);
      setSelectedNamespace('all');
    } catch (error) {
      setError('Failed to fetch pods');
    }
  };

  const fetchNamespacePods = async (namespace) => {
    if (namespace === 'all') {
      fetchAllPods();
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`/api/namespaces/${namespace}/pods`);
      setPods(response.data);
      setSelectedNamespace(namespace);
    } catch (error) {
      setError('Failed to fetch pods for namespace');
    } finally {
      setLoading(false);
    }
  };

  const handlePortForward = (pod) => {
    setSelectedPod(pod);
    setShowPortForward(true);
  };

  const handleViewLogs = (pod) => {
    setSelectedPod(pod);
    setShowLogViewer(true);
  };

  const executePortForward = async (namespace, podName, containerPort, localPort) => {
    try {
      const response = await axios.post('/api/port-forward', {
        namespace,
        podName,
        containerPort,
        localPort,
      });

      const newPortForward = {
        id: `${namespace}-${podName}-${containerPort}-${localPort}`,
        namespace,
        podName,
        containerPort,
        localPort,
        startTime: new Date().toLocaleString(),
        pid: response.data.pid,
        status: 'active'
      };

      setActivePortForwards(prev => [...prev, newPortForward]);
      setSuccess(`Port forwarding started: localhost:${localPort} -> ${podName}:${containerPort}`);
      setShowPortForward(false);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to start port forwarding');
    }
  };

  const removePortForward = (id) => {
    setActivePortForwards(prev => prev.filter(pf => pf.id !== id));
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const getDisplayTitle = () => {
    if (selectedNamespace === 'all') {
      return 'All Pods';
    }
    return `Pods in ${selectedNamespace}`;
  };

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <h1>KubeCloud</h1>
          <p>Kubernetes Management Dashboard</p>
        </div>
      </header>

      <main className="container">
        {error && (
          <div className="error">
            {error}
            <button onClick={clearMessages} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="success">
            {success}
            <button onClick={clearMessages} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              ×
            </button>
          </div>
        )}

        {!kubeconfigUploaded ? (
          <FileUpload onUpload={handleKubeconfigUpload} loading={loading} />
        ) : (
          <>
            <div className="grid">
              <div className="card">
                <h2>Namespace Selection</h2>
                <NamespaceDropdown 
                  namespaces={namespaces} 
                  selectedNamespace={selectedNamespace}
                  onNamespaceChange={fetchNamespacePods}
                />
              </div>

              <div className="card">
                <h2>{getDisplayTitle()}</h2>
                <PodList 
                  pods={pods} 
                  loading={loading}
                  onPortForward={handlePortForward}
                  onViewLogs={handleViewLogs}
                />
              </div>
            </div>

            {activePortForwards.length > 0 && (
              <ActivePortForwards 
                portForwards={activePortForwards}
                onRemove={removePortForward}
              />
            )}
          </>
        )}

        {showPortForward && selectedPod && (
          <PortForwardDialog
            pod={selectedPod}
            onClose={() => setShowPortForward(false)}
            onPortForward={executePortForward}
          />
        )}

        {showLogViewer && selectedPod && (
          <LogViewer
            pod={selectedPod}
            onClose={() => setShowLogViewer(false)}
          />
        )}
      </main>
    </div>
  );
}

export default App; 