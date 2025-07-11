import React, { useState } from 'react';

const FileUpload = ({ onUpload, loading }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="card">
      <h2>Upload Kubeconfig</h2>
      <p>Upload your Kubernetes configuration file to start managing your cluster.</p>
      
      <div 
        className={`file-upload ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <p>Drag and drop your kubeconfig file here or</p>
          <input
            type="file"
            id="kubeconfig-upload"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".yaml,.yml,.config"
          />
          <label htmlFor="kubeconfig-upload" className="btn">
            Choose File
          </label>
        </div>
      </div>

      {selectedFile && (
        <div className="mt-2">
          <p><strong>Selected file:</strong> {selectedFile.name}</p>
          <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
          <button 
            onClick={handleUpload} 
            className="btn btn-success"
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Upload Kubeconfig'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 