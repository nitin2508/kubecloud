import React, { useState } from 'react';

const PortForwardDialog = ({ pod, onClose, onPortForward }) => {
  const [selectedPort, setSelectedPort] = useState(null);
  const [localPort, setLocalPort] = useState('');
  const [customPort, setCustomPort] = useState('');
  const [useCustomPort, setUseCustomPort] = useState(false);

  // Get all unique ports from all containers
  const getAllPorts = () => {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Port Forward: {pod.name}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Namespace: {pod.namespace}</label>
          </div>

          {ports.length > 0 && (
            <div className="form-group">
              <label>Select Container Port:</label>
              <div className="port-options">
                {ports.map((port, index) => (
                  <div
                    key={index}
                    className={`port-option ${selectedPort === port ? 'selected' : ''}`}
                    onClick={() => handlePortSelect(port)}
                  >
                    <h4>{port.containerPort}</h4>
                    <p>{port.protocol}</p>
                    <p><strong>Container:</strong> {port.containerName}</p>
                    {port.name && <p><strong>Name:</strong> {port.name}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={useCustomPort}
                onChange={handleCustomPortToggle}
                style={{ marginRight: '0.5rem' }}
              />
              Use custom container port
            </label>
          </div>

          {useCustomPort && (
            <div className="form-group">
              <label>Custom Container Port:</label>
              <input
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

          <div className="form-group">
            <label>Local Port:</label>
            <input
              type="number"
              value={localPort}
              onChange={(e) => setLocalPort(e.target.value)}
              placeholder="Enter local port (1-65535)"
              min="1"
              max="65535"
              required
            />
            <small style={{ color: '#666' }}>
              Port on localhost where the traffic will be forwarded
            </small>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <strong>Port Forward Command:</strong>
            <code style={{ display: 'block', marginTop: '0.5rem' }}>
              kubectl port-forward -n {pod.namespace} pod/{pod.name} {localPort}:{useCustomPort ? customPort : selectedPort?.containerPort || 'PORT'}
            </code>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-success"
              disabled={!localPort || (!selectedPort && !useCustomPort) || (useCustomPort && !customPort)}
            >
              Start Port Forward
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PortForwardDialog; 