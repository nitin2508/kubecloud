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
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Network, AlertCircle } from 'lucide-react';

const PortForwardDialog = ({ pod, open, onClose, onSuccess }) => {
  const [selectedContainer, setSelectedContainer] = useState('');
  const [selectedPort, setSelectedPort] = useState('');
  const [localPort, setLocalPort] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && pod) {
      // Reset form
      setSelectedContainer('');
      setSelectedPort('');
      setLocalPort('');
      setError('');
      
      // Auto-select first container and port if available
      if (pod.containers && pod.containers.length > 0) {
        const firstContainer = pod.containers[0];
        setSelectedContainer(firstContainer.name);
        
        if (firstContainer.ports && firstContainer.ports.length > 0) {
          const firstPort = firstContainer.ports[0].containerPort;
          setSelectedPort(firstPort.toString());
          setLocalPort(firstPort.toString());
        }
      }
    }
  }, [open, pod]);

  const handleContainerChange = (containerName) => {
    setSelectedContainer(containerName);
    
    // Auto-select first port of the selected container
    const container = pod.containers.find(c => c.name === containerName);
    if (container && container.ports && container.ports.length > 0) {
      const firstPort = container.ports[0].containerPort;
      setSelectedPort(firstPort.toString());
      setLocalPort(firstPort.toString());
    } else {
      setSelectedPort('');
      setLocalPort('');
    }
  };

  const handlePortChange = (port) => {
    setSelectedPort(port);
    setLocalPort(port);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedContainer || !selectedPort || !localPort) {
      setError('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/port-forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace: pod.namespace,
          podName: pod.name,
          containerName: selectedContainer,
          containerPort: parseInt(selectedPort),
          localPort: parseInt(localPort),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess?.(data);
      } else {
        setError(data.error || 'Failed to create port forward');
      }
    } catch (error) {
      console.error('Error creating port forward:', error);
      setError('Failed to create port forward: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const getAvailablePorts = () => {
    if (!selectedContainer) return [];
    
    const container = pod?.containers?.find(c => c.name === selectedContainer);
    return container?.ports || [];
  };

  if (!pod) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Port Forward: {pod.name}
          </DialogTitle>
          <DialogDescription>
            Create a port forward to access the pod from your local machine
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="container">Container</Label>
            <Select value={selectedContainer} onValueChange={handleContainerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select container" />
              </SelectTrigger>
              <SelectContent>
                {pod.containers?.map((container) => (
                  <SelectItem key={container.name} value={container.name}>
                    {container.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Container Port</Label>
            <Select value={selectedPort} onValueChange={handlePortChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select port" />
              </SelectTrigger>
              <SelectContent>
                {getAvailablePorts().map((port) => (
                  <SelectItem key={port.containerPort} value={port.containerPort.toString()}>
                    {port.containerPort} ({port.protocol || 'TCP'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localPort">Local Port</Label>
            <Input
              id="localPort"
              type="number"
              value={localPort}
              onChange={(e) => setLocalPort(e.target.value)}
              placeholder="Enter local port (e.g., 8080)"
              min="1"
              max="65535"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating || !selectedContainer || !selectedPort || !localPort}
            >
              {isCreating ? 'Creating...' : 'Create Port Forward'}
            </Button>
          </div>
        </form>

        <div className="text-sm text-gray-500 mt-4">
          <p>
            <strong>Note:</strong> The port forward will be accessible at{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded">
              localhost:{localPort}
            </code>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortForwardDialog; 