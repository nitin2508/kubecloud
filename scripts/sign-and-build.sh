#!/bin/bash

# KubeCloud macOS Build and Signing Script
# This script provides different options for building and signing your macOS app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo -e "${BLUE}KubeCloud macOS Build Script${NC}"
    echo ""
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  development    - Build unsigned app for development (works only on your machine)"
    echo "  adhoc          - Build with ad-hoc signing (for internal distribution)"
    echo "  production     - Build with Apple Developer certificate and notarization"
    echo "  unsigned       - Build completely unsigned (requires manual signing)"
    echo ""
    echo "Examples:"
    echo "  $0 development"
    echo "  $0 production"
    echo ""
}

check_requirements() {
    echo -e "${BLUE}Checking requirements...${NC}"
    
    # Check if we're on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo -e "${RED}Error: This script must be run on macOS${NC}"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if npm dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm run install-all
    fi
    
    echo -e "${GREEN}✅ Requirements check passed${NC}"
}

build_development() {
    echo -e "${BLUE}Building for development (unsigned)...${NC}"
    npm run dist-unsigned
    echo -e "${GREEN}✅ Development build complete${NC}"
    echo -e "${YELLOW}Note: This build will only work on your machine${NC}"
}

build_adhoc() {
    echo -e "${BLUE}Building with ad-hoc signing...${NC}"
    
    # Check if we can sign
    if ! command -v codesign &> /dev/null; then
        echo -e "${RED}Error: codesign not found${NC}"
        exit 1
    fi
    
    npm run dist-adhoc
    
    echo -e "${GREEN}✅ Ad-hoc signed build complete${NC}"
    echo -e "${YELLOW}Note: Recipients may need to run: xattr -dr com.apple.quarantine /path/to/KubeCloud.app${NC}"
}

build_production() {
    echo -e "${BLUE}Building for production with Apple Developer certificate...${NC}"
    
    # Check for required environment variables
    if [[ -z "$APPLE_ID" || -z "$APPLE_ID_PASSWORD" || -z "$APPLE_TEAM_ID" ]]; then
        echo -e "${RED}Error: Apple Developer credentials not found${NC}"
        echo "Please set the following environment variables:"
        echo "  export APPLE_ID='your-apple-id@example.com'"
        echo "  export APPLE_ID_PASSWORD='your-app-specific-password'"
        echo "  export APPLE_TEAM_ID='your-team-id'"
        echo ""
        echo "You can get these from:"
        echo "  - Apple ID: Your Apple Developer account email"
        echo "  - App-specific password: Generate at appleid.apple.com"
        echo "  - Team ID: From Apple Developer portal"
        exit 1
    fi
    
    # Check for signing certificate
    if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
        echo -e "${RED}Error: No valid Apple Developer certificate found${NC}"
        echo "Please install your Developer ID Application certificate from Apple Developer portal"
        exit 1
    fi
    
    npm run dist-production
    
    echo -e "${GREEN}✅ Production build complete with notarization${NC}"
}

build_unsigned() {
    echo -e "${BLUE}Building unsigned app...${NC}"
    npm run dist-unsigned
    echo -e "${GREEN}✅ Unsigned build complete${NC}"
    echo -e "${YELLOW}Note: You'll need to manually sign this app before distribution${NC}"
}

main() {
    if [ $# -eq 0 ]; then
        print_usage
        exit 1
    fi
    
    check_requirements
    
    case $1 in
        development|dev)
            build_development
            ;;
        adhoc)
            build_adhoc
            ;;
        production|prod)
            build_production
            ;;
        unsigned)
            build_unsigned
            ;;
        help|--help|-h)
            print_usage
            ;;
        *)
            echo -e "${RED}Error: Unknown option '$1'${NC}"
            print_usage
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}Build completed! Check the 'dist' folder for your app.${NC}"
}

main "$@" 