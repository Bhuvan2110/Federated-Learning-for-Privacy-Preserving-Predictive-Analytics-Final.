#!/bin/bash
# Run this once: sudo bash /home/bhuvans/Documents/final/setup_docker_perms.sh
# After running, ALL docker commands will work WITHOUT sudo in the current session.

echo "=== Setting up Docker permissions ==="

# 1. Add bhuvans to docker group permanently
usermod -aG docker bhuvans

# 2. Open the docker socket so current session works immediately
chmod 666 /var/run/docker.sock

echo "=== Done! Docker now accessible without sudo ==="
echo "Running: docker compose up --build -d ..."

cd /home/bhuvans/Documents/final

# 3. Ensure all __init__.py files exist
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/db/__init__.py
touch backend/app/core/__init__.py
touch backend/app/ml/__init__.py

echo "Python package structure verified."

# 4. Stop old containers
docker compose down --remove-orphans 2>/dev/null || true

# 5. Full rebuild + launch
echo "Building and launching all services..."
docker compose up -d --build

# 6. Wait for backend
echo "Waiting for backend..."
for i in $(seq 1 30); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        echo ""
        echo "=== BACKEND IS UP ==="
        echo "  Frontend:    http://localhost:3000"
        echo "  API Docs:    http://localhost:8000/docs"
        echo "  MLflow:      http://localhost:5000"
        echo "  Grafana:     http://localhost:3001"
        echo "  Login:       sbhuvan847@gmail.com / SuperAdmin123!"
        exit 0
    fi
    echo "  [$i/30] Waiting... HTTP $STATUS"
    sleep 4
done

echo ""
echo "=== Backend logs ==="
docker compose logs --tail=40 backend
