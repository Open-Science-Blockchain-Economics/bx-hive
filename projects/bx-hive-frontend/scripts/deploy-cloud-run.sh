#!/bin/bash

# PREREQUISITES:
# 1. Authenticate with Google Cloud:
#    gcloud auth login
#
# 2. Set your project:
#    gcloud config set project YOUR_PROJECT_ID
#
# 3. Enable required services (one-time setup):
#    gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Exit immediately if a command exits with a non-zero status
set -e

# Check if service name is provided
if [ -z "$1" ]; then
  echo "Usage: ./scripts/deploy-cloud-run.sh <service-name> [region]"
  echo "Example: ./scripts/deploy-cloud-run.sh bx-hive-frontend us-central1"
  exit 1
fi

SERVICE_NAME=$1
REGION=${2:-us-central1} # Default to us-central1 if not provided

echo "🚀 Deploying '$SERVICE_NAME' to Cloud Run (region: $REGION)..."
echo "This may take a few minutes as it builds the Docker image remotely..."

# Deploy from source
# This command zips the current directory, uploads it to Google Cloud Build,
# builds the container image using the Dockerfile, and deploys it to Cloud Run.
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated

echo "✅ Deployment complete!"
