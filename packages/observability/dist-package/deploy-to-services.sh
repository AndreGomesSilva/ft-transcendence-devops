#!/bin/bash

# Helper script to deploy observability package to multiple microservices
# Usage: ./deploy-to-services.sh [service1] [service2] [service3]

set -e

PACKAGE_DIR=$(pwd)
PACKAGE_NAME=$(basename $PACKAGE_DIR)

echo "🚀 Deploying $PACKAGE_NAME to microservices..."

if [ $# -eq 0 ]; then
    echo "Usage: $0 <service-directory-1> [service-directory-2] [...]"
    echo "Example: $0 ../user-service ../order-service ../notification-service"
    exit 1
fi

for service_dir in "$@"; do
    if [ -d "$service_dir" ]; then
        echo "📦 Installing to $service_dir..."

        # Check if it's a Node.js project
        if [ -f "$service_dir/package.json" ]; then
            cd "$service_dir"

            # Install the package
            npm install "file:$PACKAGE_DIR"

            echo "✅ Successfully installed to $service_dir"
            cd "$PACKAGE_DIR"
        else
            echo "⚠️  Warning: $service_dir doesn't appear to be a Node.js project (no package.json found)"
        fi
    else
        echo "❌ Error: Directory $service_dir not found"
    fi
done

echo "🎉 Deployment completed!"
