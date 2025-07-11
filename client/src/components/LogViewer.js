import React, { useState, useEffect, useRef } from 'react';

const LogViewer = ({ pod, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [tailLines, setTailLines] = useState(100);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [error, setError] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  
  const eventSourceRef = useRef(null);
  const logContainerRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    // Set default container if not selected
    if (!selectedContainer && pod.containers.length > 0) {
      setSelectedContainer(pod.containers[0].name);
    }
  }, [pod, selectedContainer]);

  useEffect(() => {
    if (selectedContainer) {
      startLogStream();
    }
    
    return () => {
      stopLogStream();
    };
  }, [selectedContainer, isFollowing, tailLines]);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (isAutoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  const startLogStream = () => {
    stopLogStream(); // Stop any existing stream
    
    setLogs([]);
    setError('');
    setIsConnected(false);

    const params = new URLSearchParams({
      follow: isFollowing.toString(),
      tailLines: tailLines.toString()
    });

    if (selectedContainer) {
      params.append('container', selectedContainer);
    }

    // Use environment variable or default to localhost:5000 for development
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    const url = `${backendUrl}/api/pods/${pod.namespace}/${pod.name}/logs?${params}`;
    console.log('Connecting to log stream:', url);
    
    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onopen = () => {
      setIsConnected(true);
    };

    eventSourceRef.current.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      setIsConnected(true);
      console.log('Log stream connected:', data);
    });

    eventSourceRef.current.addEventListener('log', (event) => {
      const logData = JSON.parse(event.data);
      setLogs(prev => [...prev, logData]);
    });

    eventSourceRef.current.addEventListener('close', (event) => {
      const data = JSON.parse(event.data);
      setIsConnected(false);
      console.log('Log stream closed:', data);
    });

    eventSourceRef.current.addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data);
        setError(data.message);
        console.error('Log stream error:', data);
      } catch (e) {
        console.error('Error parsing error event data:', e);
      }
      setIsConnected(false);
    });

    eventSourceRef.current.onerror = (event) => {
      console.error('EventSource connection error:', event);
      setError(`Connection to log stream failed. URL: ${url}`);
      setIsConnected(false);
    };
  };

  const stopLogStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleDownloadLogs = () => {
    const logText = logs.map(log => `${log.timestamp} ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pod.name}-${selectedContainer}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleContainerChange = (e) => {
    setSelectedContainer(e.target.value);
  };

  const handleFollowChange = (e) => {
    setIsFollowing(e.target.checked);
  };

  const handleTailLinesChange = (e) => {
    setTailLines(parseInt(e.target.value));
  };

  const handleAutoScrollChange = (e) => {
    setIsAutoScroll(e.target.checked);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogLevelClass = (level) => {
    switch (level) {
      case 'error':
        return 'log-error';
      case 'warn':
        return 'log-warn';
      case 'info':
      default:
        return 'log-info';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content log-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Pod Logs: {pod.name}</h3>
          <div className="connection-status">
            {isConnected ? (
              <span className="status-connected">🟢 Connected</span>
            ) : (
              <span className="status-disconnected">🔴 Disconnected</span>
            )}
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="log-controls">
          <div className="log-controls-row">
            <div className="form-group">
              <label htmlFor="container-select">Container:</label>
              <select
                id="container-select"
                value={selectedContainer}
                onChange={handleContainerChange}
                className="container-select"
              >
                {pod.containers.map(container => (
                  <option key={container.name} value={container.name}>
                    {container.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tail-lines">Lines:</label>
              <select
                id="tail-lines"
                value={tailLines}
                onChange={handleTailLinesChange}
                className="tail-select"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isFollowing}
                  onChange={handleFollowChange}
                />
                Follow logs
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isAutoScroll}
                  onChange={handleAutoScrollChange}
                />
                Auto-scroll
              </label>
            </div>
          </div>

          <div className="log-controls-row">
            <button onClick={handleClearLogs} className="btn btn-small">
              Clear Logs
            </button>
            <button onClick={handleDownloadLogs} className="btn btn-small">
              Download Logs
            </button>
            <button onClick={startLogStream} className="btn btn-small btn-success">
              Reconnect
            </button>
          </div>
        </div>

        {error && (
          <div className="error log-error-message">
            {error}
          </div>
        )}

        <div className="log-container" ref={logContainerRef}>
          <div className="log-content">
            {logs.length === 0 ? (
              <div className="log-empty">
                {isConnected ? 'Waiting for logs...' : 'No logs available'}
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`log-line ${getLogLevelClass(log.level)}`}>
                  <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        <div className="log-footer">
          <span>Namespace: {pod.namespace}</span>
          <span>Pod: {pod.name}</span>
          <span>Container: {selectedContainer}</span>
          <span>Lines: {logs.length}</span>
        </div>
      </div>
    </div>
  );
};

export default LogViewer; 