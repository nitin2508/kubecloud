import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Network, Container, Zap } from 'lucide-react';

const PortForwardDialog = ({ pod, open, onClose, onPortForward }) => {
  const [selectedPort, setSelectedPort] = useState(null);
  const [localPort, setLocalPort] = useState('');
  const [customPort, setCustomPort] = useState('');
  const [useCustomPort, setUseCustomPort] = useState(false);

  useEffect(() => {
    if (open && pod) {
      // Auto-populate the first available port
      const ports = getAllPorts();
      if (ports.length > 0) {
        const firstPort = ports[0];
        setSelectedPort(firstPort);
        setLocalPort(firstPort.containerPort.toString());
        setUseCustomPort(false);
        setCustomPort('');
      } else {
        setSelectedPort(null);
        setLocalPort('');
        setUseCustomPort(false);
        setCustomPort('');
      }
    }
  }, [open, pod]);

  // Get all unique ports from all containers
  const getAllPorts = () => {
    if (!pod) return [];
    
    const ports = [];
    pod.containers.forEach(container => {
      if (container.ports) {
        container.ports.forEach(port => {
          ports.push({
            containerPort: port.containerPort,
            protocol: port.protocol || 'TCP',
            name: port.name || `${container.name}-${port.containerPort}`,
            containerName: container.name
          });
        });
      }
    });
    return ports;
  };

  const ports = getAllPorts();

  const handlePortSelect = (port) => {
    setSelectedPort(port);
    setLocalPort(port.containerPort.toString());
    setUseCustomPort(false);
    setCustomPort('');
  };

  const handleCustomPortToggle = () => {
    setUseCustomPort(!useCustomPort);
    if (!useCustomPort) {
      setSelectedPort(null);
      setLocalPort('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const containerPort = useCustomPort ? customPort : selectedPort?.containerPort;
    const targetLocalPort = localPort;

    if (!containerPort || !targetLocalPort) {
      alert('Please select a port and specify a local port');
      return;
    }

    if (isNaN(containerPort) || isNaN(targetLocalPort)) {
      alert('Ports must be valid numbers');
      return;
    }

    if (containerPort < 1 || containerPort > 65535 || targetLocalPort < 1 || targetLocalPort > 65535) {
      alert('Ports must be between 1 and 65535');
      return;
    }

    onPortForward(pod.namespace, pod.name, containerPort, targetLocalPort);
  };

  const handleClose = () => {
    setSelectedPort(null);
    setLocalPort('');
    setCustomPort('');
    setUseCustomPort(false);
    onClose();
  };

  if (!pod) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Port Forward: {pod.name}
          </DialogTitle>
          <DialogDescription>
            Forward a port from the pod to your local machine
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pod Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Container className="h-4 w-4" />
                Pod Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {pod.name}
                </div>
                <div>
                  <span className="font-medium">Namespace:</span> 
                  <Badge variant="outline" className="ml-2">{pod.namespace}</Badge>
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <Badge variant="secondary" className="ml-2">{pod.status}</Badge>
                </div>
                <div>
                  <span className="font-medium">Ready:</span> 
                  <span className={pod.ready ? 'text-green-600' : 'text-red-600'}>
                    {pod.ready ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Port Selection */}
          {ports.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Select Container Port:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ports.map((port, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-colors ${
                        selectedPort === port 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-gray-400'
                      }`}
                      onClick={() => handlePortSelect(port)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-lg">{port.containerPort}</span>
                          </div>
                          <Badge variant="outline">{port.protocol}</Badge>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Container: {port.containerName}</p>
                          {port.name && <p>Name: {port.name}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Custom Port Option */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="custom-port"
                checked={useCustomPort}
                onChange={handleCustomPortToggle}
                className="rounded border-gray-300"
              />
              <label htmlFor="custom-port" className="text-sm font-medium">
                Use custom container port
              </label>
            </div>

            {useCustomPort && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Container Port:</label>
                <Input
                  type="number"
                  value={customPort}
                  onChange={(e) => setCustomPort(e.target.value)}
                  placeholder="Enter container port (1-65535)"
                  min="1"
                  max="65535"
                  required
                />
              </div>
            )}
          </div>

          {/* Local Port */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Local Port:</label>
            <Input
              type="number"
              value={localPort}
              onChange={(e) => setLocalPort(e.target.value)}
              placeholder="Enter local port (1-65535)"
              min="1"
              max="65535"
              required
            />
            <p className="text-xs text-gray-500">
              Port on localhost where the traffic will be forwarded
            </p>
          </div>

          {/* Command Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Command Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-3 rounded-md font-mono text-sm">
                kubectl port-forward -n {pod.namespace} pod/{pod.name} {localPort}:{useCustomPort ? customPort : selectedPort?.containerPort || 'PORT'}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!localPort || (!selectedPort && !useCustomPort) || (useCustomPort && !customPort)}
            >
              <Network className="h-4 w-4 mr-2" />
              Start Port Forward
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PortForwardDialog; 