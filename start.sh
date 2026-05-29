#!/bin/bash
set -e

echo "================================================"
echo "  FL Platform - Full Fix & Launch Script"
echo "================================================"

cd /home/bhuvans/Documents/final

# Step 1: Add user to docker group permanently
echo "[1/7] Configuring docker group for user..."
usermod -aG docker bhuvans 2>/dev/null || true
chmod 666 /var/run/docker.sock

# Step 2: Ensure docker service is running
echo "[2/7] Ensuring Docker service is active..."
systemctl start docker

# Step 3: Verify all __init__.py files exist
echo "[3/7] Verifying Python package structure..."
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/db/__init__.py
touch backend/app/core/__init__.py
touch backend/app/ml/__init__.py

# Step 4: Bring down any existing containers
echo "[4/7] Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true

# Step 5: Full rebuild
echo "[5/7] Building all images (this may take a few minutes)..."
docker compose build --no-cache backend

# Step 6: Start all services
echo "[6/7] Starting all services..."
docker compose up -d

# Step 7: Wait for backend to be healthy
echo "[7/7] Waiting for backend health check..."
READY=false
for i in $(seq 1 25); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        READY=true
        echo "  Backend is UP! (HTTP $STATUS)"
        break
    fi
    echo "  Attempt $i/25 - Backend status: HTTP $STATUS (waiting...)"
    sleep 4
done

echo ""
echo "--- Backend logs (last 25 lines) ---"
docker compose logs --tail=25 backend

echo ""
echo "================================================"
if [ "$READY" = "true" ]; then
    echo "  SUCCESS! All services are running."
    echo ""
    echo "  Web App (Frontend):   http://localhost:3000"
    echo "  Backend API Docs:     http://localhost:8000/docs"
    echo "  MLflow Tracking:      http://localhost:5000"
    echo "  Grafana Dashboards:   http://localhost:3001"
    echo ""
    echo "  Login credentials:"
    echo "    Email:    sbhuvan847@gmail.com"
    echo "    Password: SuperAdmin123!"
else
    echo "  WARNING: Backend may still be starting."
    echo "  Check logs above for any remaining errors."
    echo "  Try: docker compose logs backend"
fi
echo "================================================"
