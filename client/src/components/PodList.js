import React from 'react';

const PodList = ({ pods, loading, onPortForward, onViewLogs }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'status running';
      case 'pending':
        return 'status pending';
      case 'failed':
        return 'status failed';
      case 'succeeded':
        return 'status succeeded';
      default:
        return 'status';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <p>Loading pods...</p>
      </div>
    );
  }

  if (pods.length === 0) {
    return (
      <div className="empty-state">
        <h3>No pods found</h3>
        <p>No pods are available in the selected namespace.</p>
      </div>
    );
  }

  return (
    <div>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Ready</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pods.map((pod) => (
            <tr key={`${pod.namespace}-${pod.name}`}>
              <td>
                <div>
                  <strong>{pod.name}</strong>
                  <div className="container-info">
                    <strong>Containers:</strong> {pod.containers.length}
                    {pod.containers.length > 0 && (
                      <div style={{ marginTop: '0.25rem' }}>
                        {pod.containers.map((container, index) => (
                          <div key={index} style={{ fontSize: '0.8rem' }}>
                            • {container.name}
                            {container.ports && container.ports.length > 0 && (
                              <span style={{ color: '#666' }}>
                                {' '}(ports: {container.ports.map(p => p.containerPort).join(', ')})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td>{pod.namespace}</td>
              <td>
                <span className={getStatusClass(pod.status)}>
                  {pod.status}
                </span>
              </td>
              <td>{pod.ready ? '✅' : '❌'}</td>
              <td>{formatDate(pod.creationTimestamp)}</td>
              <td>
                <div className="pod-actions">
                  <button
                    onClick={() => onPortForward(pod)}
                    className="btn btn-small"
                    disabled={pod.status !== 'Running' || !pod.ready}
                    title={pod.status !== 'Running' || !pod.ready ? 'Pod must be running and ready' : 'Port forward to localhost'}
                  >
                    Port Forward
                  </button>
                  <button
                    onClick={() => onViewLogs(pod)}
                    className="btn btn-small btn-info"
                    title="View real-time logs"
                  >
                    View Logs
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PodList; 