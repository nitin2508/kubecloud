# KubeCloud - Kubernetes Management Web App

A modern web application for managing Kubernetes clusters with kubeconfig file upload, namespace and pod visualization, port forwarding, and real-time log viewing capabilities.

## Features

- 🗄️ **Kubeconfig Upload**: Upload and manage multiple Kubernetes configuration files
- 🌐 **Namespace Management**: View all namespaces in your cluster with dropdown selection
- 🐳 **Pod Visualization**: List and monitor pods across all namespaces
- 🔌 **Port Forwarding**: Easy port forwarding from pods to localhost with tracking
- 📋 **Real-time Logs**: Stream live logs from any pod with multiple container support
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🚀 **Real-time Updates**: Live status updates for pods and namespaces

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **kubectl** (Kubernetes command-line tool)
- A valid **kubeconfig** file with access to a Kubernetes cluster

## Installation

1. **Clone or download this project**:
   ```bash
   cd kubecloud
   ```

2. **Install dependencies**:
   ```bash
   npm run install-all
   ```

   This will install dependencies for both the server and client.

## Usage

### Starting the Application

1. **Development Mode** (recommended):
   ```bash
   npm run dev
   ```
   This starts both the backend server (port 5000) and frontend development server (port 3000).

2. **Production Mode**:
   ```bash
   npm run build
   npm run server
   ```

3. **Access the application**:
   Open your browser and navigate to `http://localhost:3000`

### Using the Application

#### 1. Upload Kubeconfig
- Click "Choose File" or drag and drop your kubeconfig file
- The file will be validated and uploaded to the server
- Once uploaded, you'll see namespaces and pods automatically

#### 2. View Namespaces
- Select from the dropdown to filter pods by namespace
- Choose "All Namespaces" to view pods across all namespaces
- View namespace details including status and creation date

#### 3. Manage Pods
- View detailed information about each pod including:
  - Pod name and namespace
  - Current status (Running, Pending, Failed, etc.)
  - Container information and exposed ports
  - Creation timestamp
  - Ready status

#### 4. Port Forwarding
- Click "Port Forward" on any running pod
- Select from available container ports or specify a custom port
- Choose a local port number
- Click "Start Port Forward" to establish the connection
- View active port forwards with quick access buttons
- Access your application at `http://localhost:YOUR_LOCAL_PORT`

#### 5. Real-time Log Viewing
- Click "View Logs" on any pod to open the log viewer
- **Container Selection**: Choose which container's logs to view
- **Live Streaming**: Toggle "Follow logs" for real-time updates
- **Log History**: Select how many lines to display (50-1000)
- **Auto-scroll**: Automatically scroll to new log entries
- **Download Logs**: Save current logs to a text file
- **Connection Status**: See live connection indicator
- **Log Levels**: Color-coded log messages (info, warning, error)

## API Endpoints

The backend provides the following REST API endpoints:

- `POST /api/upload-kubeconfig` - Upload kubeconfig file
- `GET /api/namespaces` - List all namespaces
- `GET /api/pods` - List all pods across namespaces
- `GET /api/namespaces/:namespace/pods` - List pods in specific namespace
- `POST /api/port-forward` - Start port forwarding
- `GET /api/pods/:namespace/:podName/logs` - Stream real-time pod logs (Server-Sent Events)
- `GET /api/health` - Health check and kubeconfig status

### Log Streaming Parameters

The log streaming endpoint supports the following query parameters:
- `container` - Specific container name (optional)
- `follow` - Follow log output (true/false)
- `tailLines` - Number of lines to show from the end of logs

## Project Structure

```
kubecloud/
├── server/                 # Backend Node.js application
│   ├── index.js           # Main server file with log streaming
│   ├── package.json       # Server dependencies
│   └── uploads/           # Uploaded kubeconfig files
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── LogViewer.js      # Real-time log viewer
│   │   │   ├── NamespaceDropdown.js  # Namespace selection
│   │   │   ├── ActivePortForwards.js # Port forward tracking
│   │   │   └── ...        # Other components
│   │   ├── App.js         # Main App component
│   │   └── index.js       # React entry point
│   ├── public/
│   └── package.json       # Client dependencies
├── package.json           # Root package.json
└── README.md             # This file
```

## Security Considerations

- Kubeconfig files are temporarily stored on the server
- Port forwarding processes run in the background
- Log streams are automatically cleaned up on disconnect
- Always use this application in trusted environments
- Consider implementing authentication for production use

## Troubleshooting

### Common Issues

1. **"kubectl not found"**
   - Ensure kubectl is installed and in your PATH
   - Try running `kubectl version` in your terminal

2. **"Invalid kubeconfig file"**
   - Verify your kubeconfig file is valid
   - Test with `kubectl --kubeconfig=your-file.yaml get pods`

3. **"Port forwarding failed"**
   - Check if the target port is available
   - Ensure the pod is running and ready
   - Try a different local port

4. **"Log stream connection failed"**
   - Verify the pod is running
   - Check if kubectl can access logs: `kubectl logs -n namespace pod-name`
   - Ensure the selected container exists

5. **"Connection refused"**
   - Verify your cluster is accessible
   - Check if the kubeconfig context is correct

### Debug Mode

To run in debug mode with additional logging:

```bash
cd server
DEBUG=* npm run dev
```

### Log Viewer Features

- **Container Selection**: Multi-container pods allow you to select which container's logs to view
- **Follow Mode**: Toggle real-time log following on/off
- **Line Limit**: Control how many historical log lines to display
- **Auto-scroll**: Automatically scroll to newest log entries
- **Download**: Save current log session to a file
- **Reconnect**: Manually reconnect if the stream disconnects
- **Color Coding**: Different colors for info, warning, and error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the logs in the browser console and server terminal
- Ensure your Kubernetes cluster is accessible

## Future Enhancements

- [ ] Multi-cluster support
- [ ] Pod exec/shell access
- [ ] Resource usage monitoring
- [ ] YAML editing capabilities
- [ ] Pod scaling functionality
- [ ] User authentication and authorization
- [ ] Log filtering and search
- [ ] Export logs in different formats 