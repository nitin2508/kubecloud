import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { 
  Container, 
  Network, 
  Eye, 
  Activity, 
  Calendar, 
  Settings,
  Layers,
  FileText
} from 'lucide-react';

const PodList = ({ pods, loading, onPortForward, onViewLogs, onViewAggregateLogs, onUpdateDeployment }) => {
  const [selectedContainerForLogs, setSelectedContainerForLogs] = useState(null);

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

  const getUniqueContainerNames = () => {
    const containerNames = new Set();
    pods.forEach(pod => {
      pod.containers.forEach(container => {
        containerNames.add(container.name);
      });
    });
    return Array.from(containerNames);
  };

  const handleViewAggregateLogs = (containerName) => {
    onViewAggregateLogs?.(containerName);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 animate-spin" />
            <span>Loading pods...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pods.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Container className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No pods found</h3>
          <p className="text-gray-500">No pods are available in the selected namespace.</p>
        </CardContent>
      </Card>
    );
  }

  const uniqueContainers = getUniqueContainerNames();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="h-5 w-5" />
            Pods ({pods.length})
          </CardTitle>
          <CardDescription>
            Kubernetes pods in the selected namespace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Namespace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ready</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pods.map((pod) => (
                <TableRow key={`${pod.namespace}-${pod.name}`}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{pod.name}</div>
                      <div className="text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          <span>{pod.containers.length} container{pod.containers.length !== 1 ? 's' : ''}</span>
                        </div>
                        {pod.containers.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {pod.containers.map((container, index) => (
                              <div key={index} className="text-xs">
                                • {container.name}
                                {container.ports && container.ports.length > 0 && (
                                  <span className="text-gray-400 ml-1">
                                    (ports: {container.ports.map(p => p.containerPort).join(', ')})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewLogs(pod)}
                        title="View real-time logs"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Logs
                      </Button>
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
        </CardContent>
      </Card>

      {/* Aggregate Logs Section */}
      {uniqueContainers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aggregate Logs
            </CardTitle>
            <CardDescription>
              View logs from all pods with the same container name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueContainers.map((containerName) => {
                const podsWithContainer = pods.filter(pod => 
                  pod.containers.some(container => container.name === containerName)
                );
                
                return (
                  <div key={containerName} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{containerName}</h4>
                      <Badge variant="secondary">
                        {podsWithContainer.length} pod{podsWithContainer.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      View aggregated logs from all pods with this container
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAggregateLogs(containerName)}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Aggregate Logs
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PodList; 