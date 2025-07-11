import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Settings, Package, RefreshCw } from 'lucide-react';

const DeploymentUpdateDialog = ({ pod, open, onClose, onSuccess }) => {
  const [deployments, setDeployments] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [newImage, setNewImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (open && pod) {
      fetchDeployments();
    }
  }, [open, pod]);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/deployments');
      const podDeployments = response.data.filter(deployment => 
        deployment.namespace === pod.namespace &&
        deployment.containers.some(container => 
          pod.containers.some(podContainer => podContainer.name === container.name)
        )
      );
      setDeployments(podDeployments);
      
      // Auto-select the first matching deployment
      if (podDeployments.length > 0) {
        setSelectedDeployment(podDeployments[0]);
        // Auto-select the first matching container
        const matchingContainer = podDeployments[0].containers.find(container =>
          pod.containers.some(podContainer => podContainer.name === container.name)
        );
        if (matchingContainer) {
          setSelectedContainer(matchingContainer.name);
          setNewImage(matchingContainer.image);
        }
      }
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploymentSelect = (deploymentName) => {
    const deployment = deployments.find(d => d.name === deploymentName);
    setSelectedDeployment(deployment);
    setSelectedContainer('');
    setNewImage('');
  };

  const handleContainerSelect = (containerName) => {
    setSelectedContainer(containerName);
    if (selectedDeployment) {
      const container = selectedDeployment.containers.find(c => c.name === containerName);
      if (container) {
        setNewImage(container.image);
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedDeployment || !selectedContainer || !newImage) {
      return;
    }

    setUpdating(true);
    try {
      await axios.patch(`/api/deployments/${selectedDeployment.namespace}/${selectedDeployment.name}/image`, {
        containerName: selectedContainer,
        newImage: newImage
      });

      onSuccess?.(`Deployment ${selectedDeployment.name} updated successfully`);
      onClose();
    } catch (error) {
      console.error('Failed to update deployment:', error);
      // Handle error - you might want to show an error message
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    setSelectedDeployment(null);
    setSelectedContainer('');
    setNewImage('');
    onClose();
  };

  if (!pod) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Update Deployment Image
          </DialogTitle>
          <DialogDescription>
            Update the container image for deployments related to pod: {pod.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading deployments...</span>
            </div>
          ) : deployments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No deployments found</h3>
                <p className="text-gray-500">
                  No deployments found that match this pod's containers.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Deployment Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Deployment</label>
                <Select value={selectedDeployment?.name || ''} onValueChange={handleDeploymentSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a deployment" />
                  </SelectTrigger>
                  <SelectContent>
                    {deployments.map((deployment) => (
                      <SelectItem key={deployment.name} value={deployment.name}>
                        <div className="flex items-center justify-between w-full">
                          <span>{deployment.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {deployment.readyReplicas}/{deployment.replicas} ready
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Container Selection */}
              {selectedDeployment && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Container</label>
                  <Select value={selectedContainer} onValueChange={handleContainerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a container" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDeployment.containers.map((container) => (
                        <SelectItem key={container.name} value={container.name}>
                          <div className="flex flex-col items-start">
                            <span>{container.name}</span>
                            <span className="text-xs text-gray-500">{container.image}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Image Input */}
              {selectedContainer && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Image</label>
                  <Input
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    placeholder="Enter new container image (e.g., nginx:1.21)"
                  />
                  <p className="text-xs text-gray-500">
                    Specify the full image name including tag (e.g., nginx:1.21, myregistry.com/myapp:v2.0)
                  </p>
                </div>
              )}

              {/* Current vs New Image Comparison */}
              {selectedContainer && selectedDeployment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Image Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Current Image:</p>
                        <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                          {selectedDeployment.containers.find(c => c.name === selectedContainer)?.image}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">New Image:</p>
                        <p className="text-sm font-mono bg-blue-50 p-2 rounded">
                          {newImage || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={!selectedDeployment || !selectedContainer || !newImage || updating}
                >
                  {updating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Update Deployment
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeploymentUpdateDialog; 