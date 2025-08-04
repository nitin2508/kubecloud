#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log('🔍 KubeCloud Desktop App Debug Information');
console.log('=' .repeat(50));

// Check if we're in packaged mode
const isPackaged = process.env.ELECTRON_IS_PACKAGED === 'true';
console.log(`📦 App is packaged: ${isPackaged}`);
console.log(`📂 __dirname: ${__dirname}`);
console.log(`📂 process.resourcesPath: ${process.resourcesPath || 'undefined'}`);
console.log(`📂 process.cwd(): ${process.cwd()}`);

// Function to check paths like in main.js
function getAppPaths() {
  if (isPackaged) {
    const appPath = process.resourcesPath;
    return {
      serverPath: path.join(appPath, 'app.asar.unpacked', 'server', 'index.js'),
      serverDir: path.join(appPath, 'app.asar.unpacked', 'server'),
      buildPath: path.join(appPath, 'app.asar', 'client', 'build', 'index.html'),
      nodeModulesPath: path.join(appPath, 'app.asar.unpacked', 'server', 'node_modules')
    };
  } else {
    return {
      serverPath: path.join(__dirname, '..', 'server', 'index.js'),
      serverDir: path.join(__dirname, '..', 'server'),
      buildPath: path.join(__dirname, '..', 'client', 'build', 'index.html'),
      nodeModulesPath: path.join(__dirname, '..', 'server', 'node_modules')
    };
  }
}

const paths = getAppPaths();

console.log('\n📍 Expected Paths:');
console.log(`   Server file: ${paths.serverPath}`);
console.log(`   Server dir:  ${paths.serverDir}`);
console.log(`   Build file:  ${paths.buildPath}`);
console.log(`   Node modules: ${paths.nodeModulesPath}`);

console.log('\n✅ Path Existence Check:');
console.log(`   Server file exists: ${fs.existsSync(paths.serverPath)}`);
console.log(`   Server dir exists:  ${fs.existsSync(paths.serverDir)}`);
console.log(`   Build file exists:  ${fs.existsSync(paths.buildPath)}`);
console.log(`   Node modules exist: ${fs.existsSync(paths.nodeModulesPath)}`);

if (fs.existsSync(paths.serverDir)) {
  console.log('\n📋 Server Directory Contents:');
  try {
    const serverContents = fs.readdirSync(paths.serverDir);
    serverContents.forEach(item => {
      console.log(`   📄 ${item}`);
    });
  } catch (error) {
    console.log(`   ❌ Error reading server directory: ${error.message}`);
  }
}

if (fs.existsSync(paths.nodeModulesPath)) {
  console.log('\n📦 Node Modules Check:');
  try {
    const modules = fs.readdirSync(paths.nodeModulesPath);
    console.log(`   📊 Found ${modules.length} modules`);
    
    // Check for key dependencies
    const keyDeps = ['express', '@kubernetes/client-node', 'cors', 'multer'];
    keyDeps.forEach(dep => {
      const depExists = modules.includes(dep);
      console.log(`   ${depExists ? '✅' : '❌'} ${dep}: ${depExists ? 'present' : 'missing'}`);
    });
  } catch (error) {
    console.log(`   ❌ Error reading node_modules: ${error.message}`);
  }
}

console.log('\n🌐 Environment Variables:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`   PORT: ${process.env.PORT || 'undefined'}`);
console.log(`   PATH: ${process.env.PATH?.substring(0, 100)}...`);

console.log('\n' + '=' .repeat(50));
console.log('Debug information complete! 🎯'); 