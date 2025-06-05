#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a file exists
file_exists() {
    [ -f "$1" ]
}

# Print header
echo -e "${GREEN}Email Deletifier${NC}"
echo "================="
echo

# Check for Node.js
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    echo "Please install npm (it usually comes with Node.js)"
    exit 1
fi

# Check for .env file
if ! file_exists .env; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env file from template..."
    if file_exists .env.example; then
        cp .env.example .env
        echo -e "${GREEN}Created .env file from template${NC}"
        echo "Please edit .env file with your credentials"
        exit 1
    else
        echo -e "${RED}Error: .env.example template not found${NC}"
        echo "Please create a .env file with the following variables:"
        echo "GMAIL_USER=your.email@gmail.com"
        echo "GMAIL_PASSWORD=your-app-password"
        echo "OPENAI_API_KEY=your-openai-api-key"
        echo "DELETE_FROM_ADVERTISING_DAYS=60"
        echo "DRY_RUN=true"
        exit 1
    fi
fi

# Check for dependencies
if ! file_exists node_modules; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to install dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}Dependencies installed successfully${NC}"
fi

# Check for TypeScript
if ! command_exists npx; then
    echo -e "${RED}Error: npx is not installed${NC}"
    echo "Please install npx (it usually comes with npm)"
    exit 1
fi

# Run the application
echo -e "${GREEN}Starting Email Deletifier...${NC}"
echo

# Check if DRY_RUN is set in .env
if grep -q "DRY_RUN=true" .env; then
    echo -e "${YELLOW}Running in DRY RUN mode - no emails will be deleted${NC}"
    echo
fi

# Run the application
npx ts-node src/main.ts

# Check the exit status
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Email Deletifier completed successfully${NC}"
else
    echo -e "\n${RED}Email Deletifier encountered an error${NC}"
    exit 1
fi 