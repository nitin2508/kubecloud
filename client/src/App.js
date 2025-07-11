import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Components
import KubeconfigManager from './components/KubeconfigManager';
import NamespaceDropdown from './components/NamespaceDropdown';
import PodList from './components/PodList';
import PortForwardDialog from './components/PortForwardDialog';
import ActivePortForwards from './components/ActivePortForwards';
import LogViewer from './components/LogViewer';
import DeploymentUpdateDialog from './components/DeploymentUpdateDialog';
import AggregateLogViewer from './components/AggregateLogViewer';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Cloud, AlertCircle, CheckCircle } from 'lucide-react';

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

  const getDisplayTitle = () => {
    if (selectedNamespace === 'all') {
      return 'All Pods';
    }
    return `Pods in ${selectedNamespace}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="header">
        <div className="container">
          <div className="flex items-center justify-center gap-3">
            <Cloud className="h-8 w-8" />
            <h1>KubeCloud</h1>
          </div>
          <p>Kubernetes Management Dashboard</p>
          {healthInfo && (
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                {healthInfo.kubeconfigLoaded ? (
                  <CheckCircle className="h-4 w-4 text-green-200" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-200" />
                )}
                <span>
                  {healthInfo.kubeconfigLoaded 
                    ? `Active: ${healthInfo.activeKubeconfig}` 
                    : 'No kubeconfig loaded'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {healthInfo.totalKubeconfigs} config{healthInfo.totalKubeconfigs !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container py-6">
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
          <div className="max-w-4xl mx-auto">
            <KubeconfigManager onKubeconfigChange={handleKubeconfigChange} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Section - Kubeconfig Management and Namespace Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <KubeconfigManager onKubeconfigChange={handleKubeconfigChange} />
              </div>
              <div>
                <NamespaceDropdown 
                  namespaces={namespaces} 
                  selectedNamespace={selectedNamespace}
                  onNamespaceChange={fetchNamespacePods}
                />
              </div>
            </div>

            {/* Main Content - Pod List */}
            <Card>
              <CardHeader>
                <CardTitle>{getDisplayTitle()}</CardTitle>
                <CardDescription>
                  {selectedNamespace === 'all' 
                    ? 'All pods across all namespaces' 
                    : `Pods in the ${selectedNamespace} namespace`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PodList 
                  pods={pods} 
                  loading={loading}
                  onPortForward={handlePortForward}
                  onViewLogs={handleViewLogs}
                  onViewAggregateLogs={handleViewAggregateLogs}
                  onUpdateDeployment={handleUpdateDeployment}
                />
              </CardContent>
            </Card>

            {/* Active Port Forwards */}
            {activePortForwards.length > 0 && (
              <ActivePortForwards 
                portForwards={activePortForwards}
                onRemove={removePortForward}
              />
            )}
          </div>
        )}

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
      </main>
    </div>
  );
}

export default App; 