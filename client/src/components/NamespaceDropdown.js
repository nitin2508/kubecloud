import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Globe, Package } from 'lucide-react';

const NamespaceDropdown = ({ namespaces, selectedNamespace, onNamespaceChange }) => {
  const handleNamespaceChange = (value) => {
    onNamespaceChange(value);
  };

  const selectedNs = namespaces.find(ns => ns.name === selectedNamespace);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Namespace Selection
        </CardTitle>
        <CardDescription>
          Select a namespace to filter pods and resources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Namespace</label>
          <Select value={selectedNamespace} onValueChange={handleNamespaceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a namespace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>All Namespaces</span>
                </div>
              </SelectItem>
              {namespaces.map((namespace) => (
                <SelectItem key={namespace.name} value={namespace.name}>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>{namespace.name}</span>
                    <span className="text-xs text-gray-500">({namespace.status})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Namespace Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          {selectedNamespace === 'all' ? (
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Showing pods from all namespaces</p>
              <p>Total namespaces: {namespaces.length}</p>
            </div>
          ) : (
            selectedNs && (
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium">Selected: {selectedNs.name}</p>
                <p>Status: <span className="font-medium">{selectedNs.status}</span></p>
                <p>Created: {new Date(selectedNs.creationTimestamp).toLocaleDateString()}</p>
              </div>
            )
          )}
        </div>

        {/* Namespace Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Total Namespaces</p>
            <p className="text-2xl font-bold text-blue-600">{namespaces.length}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-900">Active Namespaces</p>
            <p className="text-2xl font-bold text-green-600">
              {namespaces.filter(ns => ns.status === 'Active').length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NamespaceDropdown; 