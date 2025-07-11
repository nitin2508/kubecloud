import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Upload, 
  FileText, 
  Trash2, 
  CheckCircle, 
  Plus,
  Settings,
  Cloud
} from 'lucide-react';

const Sidebar = ({ onKubeconfigChange, activeKubeconfig }) => {
  const [kubeconfigs, setKubeconfigs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchKubeconfigs();
  }, []);

  const fetchKubeconfigs = async () => {
    try {
      const response = await axios.get('/api/kubeconfigs');
      setKubeconfigs(response.data);
    } catch (error) {
      console.error('Failed to fetch kubeconfigs:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      handleUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      handleUpload(files[0]);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('kubeconfig', file);

      await axios.post('/api/upload-kubeconfig', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await fetchKubeconfigs();
      setSelectedFile(null);
      onKubeconfigChange?.();
    } catch (error) {
      console.error('Failed to upload kubeconfig:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (kubeconfigId) => {
    try {
      await axios.post(`/api/kubeconfigs/${kubeconfigId}/activate`);
      await fetchKubeconfigs();
      onKubeconfigChange?.();
    } catch (error) {
      console.error('Failed to activate kubeconfig:', error);
    }
  };

  const handleDelete = async (kubeconfigId) => {
    if (!window.confirm('Are you sure you want to delete this kubeconfig?')) {
      return;
    }

    try {
      await axios.delete(`/api/kubeconfigs/${kubeconfigId}`);
      await fetchKubeconfigs();
      onKubeconfigChange?.();
    } catch (error) {
      console.error('Failed to delete kubeconfig:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <Cloud className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">KubeCloud</h2>
        </div>
        <p className="text-sm text-gray-600">Kubernetes Management</p>
      </div>

      {/* Upload Section */}
      <div className="p-4 border-b border-gray-200">
        <div 
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-xs text-gray-600 mb-2">
            Drop kubeconfig here
          </p>
          <input
            type="file"
            id="kubeconfig-upload-sidebar"
            onChange={handleFileSelect}
            className="hidden"
            accept=".yaml,.yml,.config"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => document.getElementById('kubeconfig-upload-sidebar').click()}
            disabled={uploading}
          >
            <Plus className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Add Config'}
          </Button>
        </div>
      </div>

      {/* Kubeconfigs List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Configurations ({kubeconfigs.length})
          </h3>
          
          {kubeconfigs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p className="text-sm">No configurations</p>
              <p className="text-xs">Upload your first kubeconfig</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kubeconfigs.map((config) => (
                <Card
                  key={config.id}
                  className={`cursor-pointer transition-colors ${
                    config.isActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => !config.isActive && handleActivate(config.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {config.isActive && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                          <h4 className="font-medium text-sm truncate">
                            {config.name}
                          </h4>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p className="truncate">Cluster: {config.clusterName}</p>
                          <p className="truncate">Context: {config.currentContext}</p>
                          <p>Added: {formatDate(config.uploadedAt)}</p>
                        </div>
                        {config.isActive && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(config.id);
                        }}
                        className="text-red-600 hover:text-red-700 p-1 h-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Settings className="h-3 w-3" />
          <span>Kubernetes Dashboard</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 