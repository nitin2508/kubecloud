/**
 * KubeCloud - Kubernetes Management Web Application
 * 
 * This component implements duplicate API call prevention using refs to track
 * ongoing requests. This prevents issues with React.StrictMode in development
 * which intentionally double-invokes effects to detect side effects.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/toaster';
import { useToast } from './hooks/use-toast';
import Sidebar from './components/Sidebar';
import PodList from './components/PodList';
import PortForwardDialog from './components/PortForwardDialog';
import LogViewer from './components/LogViewer';
import AggregateLogViewer from './components/AggregateLogViewer';
import DeploymentUpdateDialog from './components/DeploymentUpdateDialog';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Container, 
  Network,
  Server,
  Play,
  Square,
  Trash2,
  RefreshCw
} from 'lucide-react';
import './App.css';

function App() {
  const [pods, setPods] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [kubeconfigs, setKubeconfigs] = useState([]);
  const [activeKubeconfig, setActiveKubeconfig] = useState(null);
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [loading, setLoading] = useState(false);
  const [loadingPods, setLoadingPods] = useState(false);
  const [loadingNamespaces, setLoadingNamespaces] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Persistent state management
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('kubecloud-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('kubecloud-active-tab');
    return saved || 'pods';
  });
  
  const [portForwards, setPortForwards] = useState([]);
  const [isRefreshingPortForwards, setIsRefreshingPortForwards] = useState(false);
  const { toast } = useToast();
  const pollIntervalRef = useRef(null);

  // Refs to prevent duplicate API calls
  const fetchingKubeconfigs = useRef(false);
  const fetchingPortForwards = useRef(false);
  const fetchingPods = useRef(false);
  const fetchingNamespaces = useRef(false);

  // Dialog states
  const [portForwardDialog, setPortForwardDialog] = useState({ open: false, pod: null });
  const [logViewer, setLogViewer] = useState({ open: false, pod: null });
  const [aggregateLogViewer, setAggregateLogViewer] = useState({ open: false, containerName: '' });
  const [deploymentUpdateDialog, setDeploymentUpdateDialog] = useState({ open: false, pod: null });

  // Save persistent state changes
  useEffect(() => {
    localStorage.setItem('kubecloud-sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem('kubecloud-active-tab', activeTab);
  }, [activeTab]);

  // Initial data fetch on component mount
  // Note: In development mode with React.StrictMode, this will run twice
  // The ref guards above prevent actual duplicate API calls
  useEffect(() => {
    fetchKubeconfigs();
    fetchPortForwards();
  }, []);

  useEffect(() => {
    if (activeKubeconfig) {
      fetchNamespaces();
      fetchPods();
    }
  }, [activeKubeconfig, selectedNamespace]);

  // Port forward polling effect
  useEffect(() => {
    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Only poll if we have port forwards and we're on the port forwards tab
    if (portForwards.length > 0 && activeTab === 'port-forwards') {
      // Check if any port forward is in 'starting' state
      const hasStartingPortForward = portForwards.some(pf => pf.status === 'starting');
      
      // Set interval based on status: 5 seconds if any are starting, 10 seconds otherwise
      const interval = hasStartingPortForward ? 5000 : 10000;
      
      pollIntervalRef.current = setInterval(() => {
        fetchPortForwards(true); // Silent fetch (don't show loading/errors)
      }, interval);
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [portForwards, activeTab]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Helper function to show error toasts
  const showErrorToast = (title, description) => {
    toast({
      variant: "destructive",
      title: title,
      description: description,
    });
  };

  // Helper function to show success toasts
  const showSuccessToast = (title, description) => {
    toast({
      title: title,
      description: description,
    });
  };

  const fetchKubeconfigs = async () => {
    if (fetchingKubeconfigs.current) {
      return;
    }
    
    try {
      fetchingKubeconfigs.current = true;
      
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/kubeconfig/list`);
      const data = await response.json();
      
      if (response.ok) {
        setKubeconfigs(data.kubeconfigs);
        setActiveKubeconfig(data.active);
        setConnectionStatus(data.active ? 'connected' : 'disconnected');
      } else {
        setError(data.error || 'Failed to fetch kubeconfigs');
        showErrorToast('Connection Error', data.error || 'Failed to fetch kubeconfigs');
      }
    } catch (error) {
      console.error('Error fetching kubeconfigs:', error);
      setError('Failed to connect to backend');
      setConnectionStatus('error');
      showErrorToast('Backend Error', 'Failed to connect to backend server');
    } finally {
      fetchingKubeconfigs.current = false;
    }
  };

  const fetchPortForwards = async (silent = false) => {
    if (fetchingPortForwards.current && !silent) {
      return;
    }
    
    try {
      if (!silent) {
        fetchingPortForwards.current = true;
        setIsRefreshingPortForwards(true);
      }
      
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/port-forwards`);
      const data = await response.json();
      
      if (response.ok) {
        setPortForwards(data.portForwards || []);
      } else {
        if (!silent) {
          showErrorToast('Port Forward Error', data.error || 'Failed to fetch port forwards');
        }
      }
    } catch (error) {
      console.error('Error fetching port forwards:', error);
      if (!silent) {
        showErrorToast('Network Error', 'Failed to fetch port forwards');
      }
    } finally {
      if (!silent) {
        fetchingPortForwards.current = false;
        setIsRefreshingPortForwards(false);
      }
    }
  };

  const handleRefreshPortForwards = () => {
    fetchPortForwards(false);
  };

  const fetchNamespaces = async () => {
    if (!activeKubeconfig) return;
    
    if (fetchingNamespaces.current) {
      return;
    }
    
    try {
      fetchingNamespaces.current = true;
      setLoadingNamespaces(true);
      setLoading(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/namespaces`);
      const data = await response.json();
      
      if (response.ok) {
        setNamespaces(data.namespaces || []);
        setError('');
      } else {
        const errorMsg = data.error || 'Failed to fetch namespaces';
        setError(errorMsg);
        
        // Provide more specific error messages for common issues
        if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connection refused')) {
          showErrorToast('Kubernetes Connection Error', 'Cannot connect to Kubernetes cluster. Please check your kubeconfig and cluster status.');
        } else {
          showErrorToast('Kubernetes Error', errorMsg);
        }
        setNamespaces([]);
      }
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      const errorMsg = 'Failed to fetch namespaces';
      setError(errorMsg);
      
      if (error.message.includes('fetch')) {
        showErrorToast('Network Error', 'Unable to connect to the backend server');
      } else {
        showErrorToast('Network Error', errorMsg);
      }
      setNamespaces([]);
    } finally {
      fetchingNamespaces.current = false;
      setLoadingNamespaces(false);
      setLoading(false);
    }
  };

  const fetchPods = async () => {
    if (!activeKubeconfig) return;
    
    if (fetchingPods.current) {
      return;
    }
    
    try {
      fetchingPods.current = true;
      setLoadingPods(true);
      setLoading(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const url = selectedNamespace === 'all' 
        ? `${backendUrl}/api/pods`
        : `${backendUrl}/api/pods?namespace=${selectedNamespace}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setPods(data.pods || []);
        setError('');
        setConnectionStatus('connected');
      } else {
        const errorMsg = data.error || 'Failed to fetch pods';
        setError(errorMsg);
        
        // Provide more specific error messages for common issues
        if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connection refused')) {
          showErrorToast('Kubernetes Connection Error', 'Cannot connect to Kubernetes cluster. Please check your kubeconfig and cluster status.');
          setConnectionStatus('error');
        } else if (errorMsg.includes('No kubeconfig loaded')) {
          showErrorToast('Configuration Error', 'No kubeconfig is currently active. Please upload and activate a kubeconfig.');
          setConnectionStatus('disconnected');
        } else {
          showErrorToast('Kubernetes Error', errorMsg);
          setConnectionStatus('error');
        }
        setPods([]);
      }
    } catch (error) {
      console.error('Error fetching pods:', error);
      const errorMsg = 'Failed to fetch pods';
      setError(errorMsg);
      
      if (error.message.includes('fetch')) {
        showErrorToast('Network Error', 'Unable to connect to the backend server');
      } else {
        showErrorToast('Network Error', errorMsg);
      }
      setPods([]);
      setConnectionStatus('error');
    } finally {
      fetchingPods.current = false;
      setLoadingPods(false);
      setLoading(false);
    }
  };

  const handleKubeconfigUpload = (result) => {
    setKubeconfigs(result.kubeconfigs);
    setActiveKubeconfig(result.active);
    setConnectionStatus(result.active ? 'connected' : 'disconnected');
    if (result.active) {
      showSuccessToast('Kubeconfig Uploaded', 'Configuration uploaded and activated successfully');
      fetchNamespaces();
      fetchPods();
    }
  };

  const handleKubeconfigActivate = (result) => {
    setKubeconfigs(result.kubeconfigs);
    setActiveKubeconfig(result.active);
    setConnectionStatus('connected');
    showSuccessToast('Kubeconfig Activated', 'Configuration activated successfully');
    fetchNamespaces();
    fetchPods();
  };

  const handleKubeconfigDelete = (result) => {
    setKubeconfigs(result.kubeconfigs);
    setActiveKubeconfig(result.active);
    setConnectionStatus(result.active ? 'connected' : 'disconnected');
    showSuccessToast('Kubeconfig Deleted', 'Configuration deleted successfully');
    if (result.active) {
      fetchNamespaces();
      fetchPods();
    } else {
      setNamespaces([]);
      setPods([]);
    }
  };

  const handlePortForward = (pod) => {
    setPortForwardDialog({ open: true, pod });
  };

  const handlePortForwardSuccess = (data) => {
    setPortForwardDialog({ open: false, pod: null });
    showSuccessToast('Port Forward Created', `Port forwarding active on localhost:${data.portForward.localPort}`);
    fetchPortForwards();
  };

  const handleViewLogs = (pod) => {
    setLogViewer({ open: true, pod });
  };

  const handleViewAggregateLogs = (containerName) => {
    setAggregateLogViewer({ open: true, containerName });
  };

  const handleUpdateDeployment = (pod) => {
    setDeploymentUpdateDialog({ open: true, pod });
  };

  const handleNamespaceChange = (namespace) => {
    setSelectedNamespace(namespace);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleStartPortForward = async (portForwardId) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/port-forwards/${portForwardId}/start`, {
        method: 'POST'
      });
      
      if (response.ok) {
        showSuccessToast('Port Forward Started', 'Port forward started successfully');
        fetchPortForwards();
      } else {
        const data = await response.json();
        showErrorToast('Start Failed', data.error || 'Failed to start port forward');
      }
    } catch (error) {
      console.error('Error starting port forward:', error);
      showErrorToast('Network Error', 'Failed to start port forward');
    }
  };

  const handleStopPortForward = async (portForwardId) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/port-forwards/${portForwardId}/stop`, {
        method: 'POST'
      });
      
      if (response.ok) {
        showSuccessToast('Port Forward Stopped', 'Port forward stopped successfully');
        fetchPortForwards();
      } else {
        const data = await response.json();
        showErrorToast('Stop Failed', data.error || 'Failed to stop port forward');
      }
    } catch (error) {
      console.error('Error stopping port forward:', error);
      showErrorToast('Network Error', 'Failed to stop port forward');
    }
  };

  const handleDeletePortForward = async (portForwardId) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/port-forwards/${portForwardId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showSuccessToast('Port Forward Deleted', 'Port forward deleted successfully');
        fetchPortForwards();
      } else {
        const data = await response.json();
        showErrorToast('Delete Failed', data.error || 'Failed to delete port forward');
      }
    } catch (error) {
      console.error('Error deleting port forward:', error);
      showErrorToast('Network Error', 'Failed to delete port forward');
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getPortForwardStatusVariant = (status) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'starting':
        return 'secondary';
      case 'stopped':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPortForwardStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'starting':
        return 'bg-yellow-100 text-yellow-800';
      case 'stopped':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        kubeconfigs={kubeconfigs}
        activeKubeconfig={activeKubeconfig}
        onUpload={handleKubeconfigUpload}
        onActivate={handleKubeconfigActivate}
        onDelete={handleKubeconfigDelete}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-gray-600" />
                <span className="font-medium">
                  {activeKubeconfig ? activeKubeconfig.name : 'No Configuration'}
                </span>
              </div>
              <div className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
                {getConnectionStatusIcon()}
                <span className="text-sm capitalize">{connectionStatus}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={loadingNamespaces ? 'animate-pulse' : ''}>
                {loadingNamespaces ? (
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  `${namespaces.length} namespace${namespaces.length !== 1 ? 's' : ''}`
                )}
              </Badge>
              <Badge variant="outline" className={loadingPods ? 'animate-pulse' : ''}>
                {loadingPods ? (
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  `${pods.length} pod${pods.length !== 1 ? 's' : ''}`
                )}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {!activeKubeconfig ? (
            <Card>
              <CardHeader>
                <CardTitle>Welcome to KubeCloud</CardTitle>
                <CardDescription>
                  Upload a kubeconfig file to get started with managing your Kubernetes cluster
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Container className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    Use the sidebar to upload and manage your kubeconfig files
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="pods" className="flex items-center gap-2">
                  <Container className="h-4 w-4" />
                  Pods
                </TabsTrigger>
                <TabsTrigger value="port-forwards" className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Port Forwards ({portForwards.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pods" className="space-y-4">
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-700">
                      <div className="space-y-2">
                        <div className="font-medium">
                          {error.includes('ECONNREFUSED') || error.includes('connection refused') 
                            ? 'Kubernetes Cluster Connection Failed'
                            : error.includes('No kubeconfig loaded')
                            ? 'No Configuration Active'
                            : 'Error Loading Data'
                          }
                        </div>
                        <div className="text-sm">
                          {error.includes('ECONNREFUSED') || error.includes('connection refused') 
                            ? 'Cannot connect to your Kubernetes cluster. Please check that your cluster is running and accessible.'
                            : error.includes('No kubeconfig loaded')
                            ? 'Please upload and activate a kubeconfig file from the sidebar.'
                            : error
                          }
                        </div>
                        {(error.includes('ECONNREFUSED') || error.includes('connection refused')) && (
                          <div className="mt-3 space-y-1 text-xs">
                            <div><strong>Troubleshooting tips:</strong></div>
                            <div>• Check if your Kubernetes cluster is running</div>
                            <div>• Verify your kubeconfig file is valid and up-to-date</div>
                            <div>• Ensure you have network access to the cluster</div>
                            <div>• Try running: <code className="bg-gray-100 px-1 rounded">kubectl get pods</code> in your terminal</div>
                          </div>
                        )}
                        <div className="mt-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setError('');
                              if (activeKubeconfig) {
                                fetchNamespaces();
                                fetchPods();
                              }
                            }}
                            disabled={loading || loadingPods || loadingNamespaces}
                            className="bg-white hover:bg-gray-50"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || loadingPods || loadingNamespaces) ? 'animate-spin' : ''}`} />
                            Retry Connection
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <PodList
                  pods={pods}
                  namespaces={namespaces}
                  loading={loading}
                  loadingPods={loadingPods}
                  loadingNamespaces={loadingNamespaces}
                  onPortForward={handlePortForward}
                  onViewLogs={handleViewLogs}
                  onViewAggregateLogs={handleViewAggregateLogs}
                  onUpdateDeployment={handleUpdateDeployment}
                  onNamespaceChange={handleNamespaceChange}
                />
              </TabsContent>

              <TabsContent value="port-forwards" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Network className="h-5 w-5" />
                          Active Port Forwards
                        </CardTitle>
                        <CardDescription>
                          Manage your active port forward connections
                          {portForwards.some(pf => pf.status === 'starting') && (
                            <span className="block text-yellow-600 text-sm mt-1">
                              • Auto-refreshing every 5 seconds (starting port forwards detected)
                            </span>
                          )}
                          {portForwards.length > 0 && !portForwards.some(pf => pf.status === 'starting') && (
                            <span className="block text-gray-500 text-sm mt-1">
                              • Auto-refreshing every 10 seconds
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshPortForwards}
                        disabled={isRefreshingPortForwards}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingPortForwards ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {portForwards.length === 0 ? (
                      <div className="text-center py-8">
                        <Network className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No active port forwards</h3>
                        <p className="text-gray-500">
                          Create port forwards from the Pods tab to see them here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {portForwards.map((pf) => (
                          <Card key={pf.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{pf.podName}</span>
                                  <Badge variant="outline">{pf.namespace}</Badge>
                                  <Badge 
                                    variant={getPortForwardStatusVariant(pf.status)}
                                    className={getPortForwardStatusColor(pf.status)}
                                  >
                                    {pf.status === 'starting' && (
                                      <Activity className="h-3 w-3 mr-1 animate-spin" />
                                    )}
                                    {pf.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-500">
                                  localhost:{pf.localPort} → {pf.containerName}:{pf.containerPort}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Created: {new Date(pf.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {pf.status === 'active' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStopPortForward(pf.id)}
                                  >
                                    <Square className="h-4 w-4 mr-1" />
                                    Stop
                                  </Button>
                                ) : pf.status === 'starting' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                  >
                                    <Activity className="h-4 w-4 mr-1 animate-spin" />
                                    Starting...
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStartPortForward(pf.id)}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Start
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeletePortForward(pf.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <PortForwardDialog
        open={portForwardDialog.open}
        pod={portForwardDialog.pod}
        onClose={() => setPortForwardDialog({ open: false, pod: null })}
        onSuccess={handlePortForwardSuccess}
      />

      <LogViewer
        open={logViewer.open}
        pod={logViewer.pod}
        onClose={() => setLogViewer({ open: false, pod: null })}
      />

      <AggregateLogViewer
        open={aggregateLogViewer.open}
        containerName={aggregateLogViewer.containerName}
        onClose={() => setAggregateLogViewer({ open: false, containerName: '' })}
      />

      <DeploymentUpdateDialog
        open={deploymentUpdateDialog.open}
        pod={deploymentUpdateDialog.pod}
        onClose={() => setDeploymentUpdateDialog({ open: false, pod: null })}
        onSuccess={() => {
          setDeploymentUpdateDialog({ open: false, pod: null });
          showSuccessToast('Deployment Updated', 'Deployment image updated successfully');
          fetchPods();
        }}
      />

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

export default App; 