#!/usr/bin/env node

const http = require('http');

console.log('🧪 Testing KubeCloud Desktop App Server...\n');

const serverPort = 5001;
const testUrl = `http://localhost:${serverPort}/api/health`;

function testServer() {
  return new Promise((resolve, reject) => {
    const req = http.get(testUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTest() {
  console.log(`📡 Testing server at: ${testUrl}`);
  
  try {
    const result = await testServer();
    
    if (result.status === 200) {
      console.log('✅ Server is running and accessible!');
      console.log(`📊 Status: ${result.status}`);
      console.log(`📝 Response: ${result.data}`);
      console.log('\n🎉 Desktop app server test PASSED!');
    } else {
      console.log(`⚠️  Server responded with status: ${result.status}`);
      console.log(`📝 Response: ${result.data}`);
    }
  } catch (error) {
    console.log('❌ Server test FAILED!');
    console.log(`💥 Error: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Make sure the KubeCloud desktop app is running');
    console.log('   - Check if port 5001 is available');
    console.log('   - Try restarting the desktop app');
  }
}

// Wait a moment for server to start if app just launched
setTimeout(runTest, 3000); 