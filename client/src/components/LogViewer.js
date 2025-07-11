import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Eye, 
  Download, 
  Play, 
  Square, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowDown
} from 'lucide-react';

const LogViewer = ({ pod, open, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [isFollowing, setIsFollowing] = useState(true);
  const [tailLines, setTailLines] = useState(100);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const eventSourceRef = useRef(null);
  const logsEndRef = useRef(null);
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (open && pod) {
      // Set default container if not selected
      if (!selectedContainer && pod.containers.length > 0) {
        setSelectedContainer(pod.containers[0].name);
      }
      startLogStream();
    }
    return () => {
      stopLogStream();
    };
  }, [open, pod, selectedContainer, isFollowing, tailLines]);

  useEffect(() => {
    // Only auto-scroll if user is at the bottom and following is enabled
    if (isFollowing && isAtBottom && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isFollowing, isAtBottom]);

  // Monitor scroll position to determine if user is at bottom
  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const threshold = 50; // pixels from bottom
      const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
      setIsAtBottom(atBottom);
    }
  };

  const scrollToBottom = () => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsAtBottom(true);
    }
  };

  const startLogStream = () => {
    if (!pod || !selectedContainer) return;
    
    stopLogStream();
    
    setLogs([]);
    setError('');
    setIsConnected(false);

    const params = new URLSearchParams({
      container: selectedContainer,
      follow: isFollowing.toString(),
      tailLines: tailLines.toString()
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
    const url = `${backendUrl}/api/pods/${pod.namespace}/${pod.name}/logs?${params}`;
    
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
      setError(`Connection to log stream failed. Pod: ${pod.name}, Container: ${selectedContainer}`);
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

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    if (!isFollowing) {
      // If enabling follow, scroll to bottom
      scrollToBottom();
    }
  };

  const handleContainerChange = (containerName) => {
    setSelectedContainer(containerName);
  };

  const handleTailLinesChange = (value) => {
    setTailLines(parseInt(value));
  };

  const downloadLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pod.name}-${selectedContainer}-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
      default:
        return 'text-gray-300';
    }
  };

  const handleClose = () => {
    stopLogStream();
    onClose();
  };

  if (!pod) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Logs: {pod.name}
          </DialogTitle>
          <DialogDescription>
            Real-time logs from pod in {pod.namespace} namespace
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Connection Status and Controls */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {!isAtBottom && isFollowing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scrollToBottom}
                  className="ml-4"
                >
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Go to bottom
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Container Selection */}
              <Select value={selectedContainer} onValueChange={handleContainerChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select container" />
                </SelectTrigger>
                <SelectContent>
                  {pod.containers.map((container) => (
                    <SelectItem key={container.name} value={container.name}>
                      {container.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tail Lines */}
              <Select value={tailLines.toString()} onValueChange={handleTailLinesChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 lines</SelectItem>
                  <SelectItem value="100">100 lines</SelectItem>
                  <SelectItem value="200">200 lines</SelectItem>
                  <SelectItem value="500">500 lines</SelectItem>
                  <SelectItem value="1000">1000 lines</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFollow}
                className={isFollowing ? 'bg-green-50' : ''}
              >
                {isFollowing ? <Square className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                {isFollowing ? 'Stop Follow' : 'Follow'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={downloadLogs}
                disabled={logs.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={startLogStream}
                disabled={!selectedContainer}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reconnect
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-600 mt-1">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Log Display */}
          <Card className="flex-1 min-h-0">
            <CardHeader>
              <CardTitle className="text-base">
                Log Output ({logs.length} entries)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                ref={logContainerRef}
                className="h-96 overflow-y-auto bg-gray-900 text-white font-mono text-sm"
                onScroll={handleScroll}
              >
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    {isConnected ? 'Waiting for log entries...' : 'Not connected'}
                  </div>
                ) : (
                  <div className="p-4 space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`${getLogLevelColor(log.level)} break-all`}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Pod: {pod.name} | 
              Container: {selectedContainer} | 
              Lines: {logs.length} | 
              {isFollowing ? 'Following' : 'Paused'} | 
              {isAtBottom ? 'At bottom' : 'Scrolled up'}
            </span>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogViewer; 