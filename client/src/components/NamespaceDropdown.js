import React from 'react';

const NamespaceDropdown = ({ namespaces, selectedNamespace, onNamespaceChange }) => {
  const handleNamespaceChange = (e) => {
    const selectedValue = e.target.value;
    onNamespaceChange(selectedValue);
  };

  return (
    <div>
      <div className="form-group">
        <label htmlFor="namespace-select">Select Namespace:</label>
        <select
          id="namespace-select"
          value={selectedNamespace}
          onChange={handleNamespaceChange}
          className="namespace-dropdown"
        >
          <option value="all">All Namespaces</option>
          {namespaces.map((namespace) => (
            <option key={namespace.name} value={namespace.name}>
              {namespace.name}
            </option>
          ))}
        </select>
      </div>

      <div className="namespace-info">
        {selectedNamespace === 'all' ? (
          <p>Showing pods from all namespaces</p>
        ) : (
          <div>
            <p><strong>Selected:</strong> {selectedNamespace}</p>
            {namespaces.find(ns => ns.name === selectedNamespace) && (
              <div className="namespace-details">
                <p><strong>Status:</strong> {namespaces.find(ns => ns.name === selectedNamespace).status}</p>
                <p><strong>Created:</strong> {new Date(namespaces.find(ns => ns.name === selectedNamespace).creationTimestamp).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="namespace-stats">
        <p><strong>Total Namespaces:</strong> {namespaces.length}</p>
      </div>
    </div>
  );
};

export default NamespaceDropdown; 