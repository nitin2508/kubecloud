import React from 'react';

const ActivePortForwards = ({ portForwards, onRemove }) => {
  const handleOpenInBrowser = (localPort) => {
    const url = `http://localhost:${localPort}`;
    window.open(url, '_blank');
  };

  const handleCopyUrl = (localPort) => {
    const url = `http://localhost:${localPort}`;
    navigator.clipboard.writeText(url).then(() => {
      // You could add a toast notification here
      console.log('URL copied to clipboard');
    });
  };

  return (
    <div className="card">
      <h2>Active Port Forwards</h2>
      <p>Currently active port forwarding sessions:</p>
      
      <div className="port-forwards-grid">
        {portForwards.map((pf) => (
          <div key={pf.id} className="port-forward-item">
            <div className="port-forward-header">
              <h3>{pf.podName}</h3>
              <span className="port-forward-status active">Active</span>
            </div>
            
            <div className="port-forward-details">
              <p><strong>Namespace:</strong> {pf.namespace}</p>
              <p><strong>Container Port:</strong> {pf.containerPort}</p>
              <p><strong>Local Port:</strong> {pf.localPort}</p>
              <p><strong>Started:</strong> {pf.startTime}</p>
              
              <div className="port-forward-url">
                <strong>Access URL:</strong>
                <code>http://localhost:{pf.localPort}</code>
              </div>
            </div>
            
            <div className="port-forward-actions">
              <button
                onClick={() => handleOpenInBrowser(pf.localPort)}
                className="btn btn-small btn-success"
                title="Open in browser"
              >
                Open
              </button>
              <button
                onClick={() => handleCopyUrl(pf.localPort)}
                className="btn btn-small"
                title="Copy URL to clipboard"
              >
                Copy URL
              </button>
              <button
                onClick={() => onRemove(pf.id)}
                className="btn btn-small btn-danger"
                title="Remove from list (port forward may still be active)"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="port-forward-note">
        <p><strong>Note:</strong> Removing an item from this list doesn't stop the actual port forwarding process. 
        To stop port forwarding, you'll need to terminate the process manually or restart the application.</p>
      </div>
    </div>
  );
};

export default ActivePortForwards; 