#!/bin/bash
# Build WeasyPrint Lambda Layer using Docker
# Usage: ./build.sh
# Output: weasyprint-layer.zip in this directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_NAME="reachezy-weasyprint-layer-builder"

echo "Building Docker image..."
docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"

echo "Extracting layer zip..."
CONTAINER_ID=$(docker create "$IMAGE_NAME")
docker cp "$CONTAINER_ID:/tmp/weasyprint-layer.zip" "$SCRIPT_DIR/weasyprint-layer.zip"
docker rm "$CONTAINER_ID"

echo ""
echo "Done! Layer zip: $SCRIPT_DIR/weasyprint-layer.zip"
echo ""
echo "To deploy:"
echo "  aws lambda publish-layer-version \\"
echo "    --layer-name reachezy-weasyprint \\"
echo "    --zip-file fileb://weasyprint-layer.zip \\"
echo "    --compatible-runtimes python3.12 \\"
echo "    --description 'WeasyPrint + system libs for PDF generation'"
echo ""
echo "Then pass the ARN to CDK:"
echo "  cdk deploy -c weasyprint_layer_arn=arn:aws:lambda:us-east-1:ACCOUNT:layer:reachezy-weasyprint:1"
