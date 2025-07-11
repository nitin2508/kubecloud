import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Trash2, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';

const Sidebar = ({ 
  kubeconfigs, 
  activeKubeconfig, 
  onUpload, 
  onActivate, 
  onDelete, 
  isCollapsed, 
  onToggleCollapse 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError('');

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('kubeconfig', file);

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/kubeconfig/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        onUpload(result);
        setUploadError('');
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Upload failed: ' + error.message);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml,.config';
    input.onchange = handleFileInputChange;
    input.click();
  };

  const handleActivate = async (kubeconfigId) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/kubeconfig/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kubeconfigId }),
      });

      const result = await response.json();
      
      if (response.ok) {
        onActivate(result);
      } else {
        console.error('Activation failed:', result.error);
      }
    } catch (error) {
      console.error('Activation error:', error);
    }
  };

  const handleDelete = async (kubeconfigId) => {
    if (!window.confirm('Are you sure you want to delete this kubeconfig?')) {
      return;
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/kubeconfig/${kubeconfigId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (response.ok) {
        onDelete(result);
      } else {
        console.error('Delete failed:', result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-gray-900">KubeCloud</h1>
            <p className="text-sm text-gray-500">Kubernetes Management</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-2"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Collapsed state - show only icons */}
      {isCollapsed && (
        <div className="flex-1 p-2 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUploadClick}
            className="w-full p-2 h-auto"
            title="Upload Kubeconfig"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          {kubeconfigs.map((config) => (
            <Button
              key={config.id}
              variant={config.id === activeKubeconfig?.id ? "default" : "ghost"}
              size="sm"
              onClick={() => handleActivate(config.id)}
              className="w-full p-2 h-auto"
              title={config.name}
            >
              <FileText className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}

      {/* Expanded state - show full content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {/* Upload Section */}
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-3">Kubeconfig Files</h2>
              
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag & drop kubeconfig files here
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  or click to browse
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadClick}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>

              {uploadError && (
                <Alert className="mt-3 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">
                    {uploadError}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Kubeconfig List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                Available Configs ({kubeconfigs.length})
              </h3>
              
              {kubeconfigs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No kubeconfig files uploaded</p>
                  <p className="text-xs mt-1">Upload a file to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {kubeconfigs.map((config) => (
                    <Card 
                      key={config.id} 
                      className={`cursor-pointer transition-all ${
                        config.id === activeKubeconfig?.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium truncate">
                                {config.name}
                              </span>
                              {config.id === activeKubeconfig?.id && (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {config.contextName || 'No context'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(config.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {config.id !== activeKubeconfig?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivate(config.id);
                                }}
                                className="h-6 w-6 p-0"
                                title="Activate"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(config.id);
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 