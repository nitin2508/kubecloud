import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Combobox } from './ui/combobox';
import { 
  Container, 
  Network, 
  Eye, 
  Activity, 
  Calendar, 
  Settings,
  Layers,
  FileText,
  Search,
  Users
} from 'lucide-react';

const PodList = ({ pods, namespaces, loading, loadingPods, loadingNamespaces, onPortForward, onViewLogs, onViewAggregateLogs, onUpdateDeployment, onNamespaceChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [filteredPods, setFilteredPods] = useState([]);

  useEffect(() => {
    let filtered = pods;

    // Filter by namespace
    if (selectedNamespace !== 'all') {
      filtered = filtered.filter(pod => pod.namespace === selectedNamespace);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(pod => 
        pod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pod.namespace.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pod.containers.some(container => 
          container.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    setFilteredPods(filtered);
  }, [pods, selectedNamespace, searchTerm]);

  const handleNamespaceChange = (namespace) => {
    setSelectedNamespace(namespace);
    onNamespaceChange?.(namespace);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusVariant = (status) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'succeeded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      case 'succeeded':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  // Prepare namespace options for the combobox
  const namespaceOptions = [
    { value: 'all', label: 'All Namespaces' },
    ...namespaces.map(ns => ({ value: ns.name, label: ns.name }))
  ];

  // Show loading state when either general loading or specific pod loading is active
  if (loading || loadingPods) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 animate-spin" />
            <span>
              {loadingPods ? 'Loading pods...' : 
               loadingNamespaces ? 'Loading namespaces...' : 
               'Loading...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="h-5 w-5" />
            Pods ({filteredPods.length})
          </CardTitle>
          <CardDescription>
            Kubernetes pods across your cluster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search pods, namespaces, or containers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Namespace Filter */}
            <div className="w-full sm:w-64">
              <Combobox
                options={namespaceOptions}
                value={selectedNamespace}
                onValueChange={handleNamespaceChange}
                placeholder="Select namespace"
                searchPlaceholder="Search namespaces..."
                emptyText="No namespaces found."
              />
            </div>
          </div>

          {filteredPods.length === 0 ? (
            <div className="text-center py-8">
              <Container className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pods found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedNamespace !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'No pods are available in the selected cluster.'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pod Name</TableHead>
                  <TableHead>Containers</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ready</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPods.map((pod) => (
                  <TableRow key={`${pod.namespace}-${pod.name}`}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{pod.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          <span>{pod.containers.length} container{pod.containers.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {pod.containers.map((container, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {container.name}
                            </Badge>
                            {container.ports && container.ports.length > 0 && (
                              <span className="text-xs text-gray-400">
                                :{container.ports.map(p => p.containerPort).join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pod.namespace}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(pod.status)} className={getStatusColor(pod.status)}>
                        {pod.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={pod.ready ? 'text-green-600' : 'text-red-600'}>
                        {pod.ready ? '✅ Ready' : '❌ Not Ready'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(pod.creationTimestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPortForward(pod)}
                          disabled={pod.status !== 'Running' || !pod.ready}
                          title={pod.status !== 'Running' || !pod.ready ? 'Pod must be running and ready' : 'Port forward to localhost'}
                        >
                          <Network className="h-4 w-4 mr-1" />
                          Port Forward
                        </Button>
                        
                        {/* Individual Log Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewLogs(pod)}
                          title="View individual pod logs"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Logs
                        </Button>

                        {/* Aggregate Log Button - only show if there are multiple pods with same container */}
                        {pod.containers.some(container => {
                          const podsWithSameContainer = pods.filter(p => 
                            p.containers.some(c => c.name === container.name)
                          );
                          return podsWithSameContainer.length > 1;
                        }) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Find the first container that has multiple pods
                              const containerWithMultiplePods = pod.containers.find(container => {
                                const podsWithSameContainer = pods.filter(p => 
                                  p.containers.some(c => c.name === container.name)
                                );
                                return podsWithSameContainer.length > 1;
                              });
                              if (containerWithMultiplePods) {
                                onViewAggregateLogs(containerWithMultiplePods.name);
                              }
                            }}
                            title="View aggregated logs from all pods with same container"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Aggregate
                          </Button>
                        )}

                        {onUpdateDeployment && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateDeployment(pod)}
                            title="Update deployment image"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Update
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PodList; 