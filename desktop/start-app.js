#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function checkDependencies() {
  const requiredPaths = [
    path.join(__dirname, '..', 'node_modules'),
    path.join(__dirname, '..', 'server', 'node_modules'),
    path.join(__dirname, '..', 'client', 'node_modules')
  ];

  const missing = requiredPaths.filter(p => !fs.existsSync(p));
  
  if (missing.length > 0) {
    console.log('Missing dependencies detected. Running npm install...');
    return false;
  }
  
  return true;
}

async function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('Installing dependencies...');
    const install = spawn('npm', ['run', 'install-all'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    install.on('close', (code) => {
      if (code === 0) {
        console.log('Dependencies installed successfully!');
        resolve();
      } else {
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
  });
}

async function startElectron() {
  return new Promise((resolve, reject) => {
    console.log('Starting KubeCloud Desktop App...');
    const electron = spawn('npm', ['run', 'electron-dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    electron.on('close', (code) => {
      console.log(`KubeCloud Desktop App exited with code ${code}`);
      resolve(code);
    });

    electron.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    console.log('🚀 Starting KubeCloud Desktop App...\n');
    
    if (!checkDependencies()) {
      await installDependencies();
    }
    
    await startElectron();
  } catch (error) {
    console.error('❌ Error starting KubeCloud Desktop App:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main }; 