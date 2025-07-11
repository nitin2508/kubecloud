import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Components
import Sidebar from './components/Sidebar';
import PodList from './components/PodList';
import PortForwardDialog from './components/PortForwardDialog';
import ActivePortForwards from './components/ActivePortForwards';
import LogViewer from './components/LogViewer';
import DeploymentUpdateDialog from './components/DeploymentUpdateDialog';
import AggregateLogViewer from './components/AggregateLogViewer';

// UI Components
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { AlertCircle, CheckCircle, FileText } from 'lucide-react';

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
  const [showDeploymentUpdate, setShowDeploymentUpdate] = useState(false);
  const [showAggregateLogViewer, setShowAggregateLogViewer] = useState(false);
  const [selectedPod, setSelectedPod] = useState(null);
  const [selectedContainerForAggregateLog, setSelectedContainerForAggregateLog] = useState('');
  const [activePortForwards, setActivePortForwards] = useState([]);
  const [healthInfo, setHealthInfo] = useState(null);

  const checkHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      setHealthInfo(response.data);
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

  const handleKubeconfigChange = () => {
    checkHealth();
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

  const handleViewAggregateLogs = (containerName) => {
    setSelectedContainerForAggregateLog(containerName);
    setShowAggregateLogViewer(true);
  };

  const handleUpdateDeployment = (pod) => {
    setSelectedPod(pod);
    setShowDeploymentUpdate(true);
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

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        onKubeconfigChange={handleKubeconfigChange}
        activeKubeconfig={healthInfo?.activeKubeconfig}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kubernetes Dashboard</h1>
              <p className="text-sm text-gray-600">Manage your cluster resources</p>
            </div>
            {healthInfo && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {healthInfo.kubeconfigLoaded ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="text-sm font-medium">
                    {healthInfo.kubeconfigLoaded 
                      ? `Active: ${healthInfo.activeKubeconfig}` 
                      : 'No kubeconfig loaded'
                    }
                  </span>
                </div>
                <Badge variant="secondary">
                  {healthInfo.totalKubeconfigs} config{healthInfo.totalKubeconfigs !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={clearMessages}>
                  ×
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{success}</span>
                <Button variant="ghost" size="sm" onClick={clearMessages}>
                  ×
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!kubeconfigUploaded ? (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Kubeconfig Loaded</h3>
                <p className="text-gray-600 mb-4">
                  Upload a kubeconfig file from the sidebar to get started with managing your Kubernetes cluster.
                </p>
                <div className="text-sm text-gray-500">
                  <p>• Drag and drop your kubeconfig file</p>
                  <p>• Or click "Add Config" in the sidebar</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Pod List */}
              <PodList 
                pods={pods} 
                namespaces={namespaces}
                loading={loading}
                onPortForward={handlePortForward}
                onViewLogs={handleViewLogs}
                onViewAggregateLogs={handleViewAggregateLogs}
                onUpdateDeployment={handleUpdateDeployment}
                onNamespaceChange={fetchNamespacePods}
              />

              {/* Active Port Forwards */}
              {activePortForwards.length > 0 && (
                <ActivePortForwards 
                  portForwards={activePortForwards}
                  onRemove={removePortForward}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Dialogs */}
      <PortForwardDialog
        pod={selectedPod}
        open={showPortForward}
        onClose={() => setShowPortForward(false)}
        onPortForward={executePortForward}
      />

      <LogViewer
        pod={selectedPod}
        open={showLogViewer}
        onClose={() => setShowLogViewer(false)}
      />

      <DeploymentUpdateDialog
        pod={selectedPod}
        open={showDeploymentUpdate}
        onClose={() => setShowDeploymentUpdate(false)}
        onSuccess={(message) => {
          setSuccess(message);
          setShowDeploymentUpdate(false);
        }}
      />

      <AggregateLogViewer
        containerName={selectedContainerForAggregateLog}
        open={showAggregateLogViewer}
        onClose={() => setShowAggregateLogViewer(false)}
      />
    </div>
  );
}

export default App; 