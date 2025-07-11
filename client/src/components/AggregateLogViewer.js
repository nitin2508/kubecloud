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
  FileText, 
  Download, 
  Play, 
  Square, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const AggregateLogViewer = ({ containerName, open, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [isFollowing, setIsFollowing] = useState(true);
  const [tailLines, setTailLines] = useState(100);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [podCount, setPodCount] = useState(0);
  const eventSourceRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (open && containerName) {
      startLogStream();
    }
    return () => {
      stopLogStream();
    };
  }, [open, containerName, isFollowing, tailLines]);

  useEffect(() => {
    if (isFollowing && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isFollowing]);

  const startLogStream = () => {
    stopLogStream();
    
    setLogs([]);
    setError('');
    setIsConnected(false);
    setPodCount(0);

    const params = new URLSearchParams({
      containerName,
      follow: isFollowing.toString(),
      tailLines: tailLines.toString()
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
    const url = `${backendUrl}/api/logs/aggregate?${params}`;
    
    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onopen = () => {
      setIsConnected(true);
    };

    eventSourceRef.current.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      setIsConnected(true);
      console.log('Aggregate log stream connected:', data);
    });

    eventSourceRef.current.addEventListener('info', (event) => {
      const data = JSON.parse(event.data);
      console.log('Info:', data.message);
      // Extract pod count from message if available
      const match = data.message.match(/(\d+) pods/);
      if (match) {
        setPodCount(parseInt(match[1]));
      }
    });

    eventSourceRef.current.addEventListener('log', (event) => {
      const logData = JSON.parse(event.data);
      setLogs(prev => [...prev, logData]);
    });

    eventSourceRef.current.addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data);
        setError(data.message);
        console.error('Aggregate log stream error:', data);
      } catch (e) {
        console.error('Error parsing error event data:', e);
      }
      setIsConnected(false);
    });

    eventSourceRef.current.onerror = (event) => {
      console.error('EventSource connection error:', event);
      setError(`Connection to aggregate log stream failed for container: ${containerName}`);
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
  };

  const handleTailLinesChange = (value) => {
    setTailLines(parseInt(value));
  };

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] [${log.podName}/${log.namespace}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aggregate-logs-${containerName}-${new Date().toISOString().slice(0, 19)}.txt`;
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

  const getPodColor = (podName) => {
    // Generate a consistent color for each pod
    const colors = [
      'text-blue-400',
      'text-green-400',
      'text-purple-400',
      'text-pink-400',
      'text-indigo-400',
      'text-teal-400',
      'text-orange-400',
      'text-cyan-400'
    ];
    let hash = 0;
    for (let i = 0; i < podName.length; i++) {
      hash = podName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleClose = () => {
    stopLogStream();
    onClose();
  };

  if (!containerName) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aggregate Logs: {containerName}
          </DialogTitle>
          <DialogDescription>
            Real-time logs from all pods containing the "{containerName}" container
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Connection Status and Controls */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {podCount > 0 && (
                <div className="text-sm text-gray-600">
                  Streaming from {podCount} pod{podCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
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
                {isFollowing ? 'Stop' : 'Follow'}
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
                disabled={!containerName}
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
              <div className="h-96 overflow-y-auto bg-gray-900 text-white font-mono text-sm">
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
                        <span className={`${getPodColor(log.podName)} whitespace-nowrap font-medium`}>
                          [{log.podName}]
                        </span>
                        <span className="text-gray-400 whitespace-nowrap">
                          {log.namespace}
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
              Container: {containerName} | 
              Lines: {logs.length} | 
              {isFollowing ? 'Following' : 'Paused'}
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

export default AggregateLogViewer; 