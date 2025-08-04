#!/bin/bash

# Create a self-signed certificate for code signing
echo "Creating self-signed certificate for KubeCloud..."

# Create certificate
security create-keypair \
  -a RSA \
  -s 2048 \
  -f CSSM_ALGID_SHA256_HMAC \
  -k "login.keychain" \
  -T /usr/bin/codesign \
  -T /usr/bin/security \
  "KubeCloud Developer"

# Add certificate to keychain  
security add-generic-password \
  -a "KubeCloud Developer" \
  -s "KubeCloud Code Signing" \
  -T "" \
  "login.keychain"

echo "✅ Self-signed certificate created!"
echo "You can now use 'KubeCloud Developer' as your signing identity"
