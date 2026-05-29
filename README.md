# Federated Learning Privacy-Preserving Predictive Analytics Platform

This is a comprehensive, from-scratch implementation of a Federated Learning platform designed for privacy-preserving predictive analytics. Built without relying on third-party ML libraries (no scikit-learn, PyTorch, or TensorFlow), this platform implements mathematical models directly in pure Python.

---

## 🌍 Live Demo (Global Access)

The platform is deployed globally via Cloudflare Tunnel and accessible from anywhere:

| Service | URL |
|---|---|
| 🖥️ **Frontend UI** | https://hoping-railway-completion-bloggers.trycloudflare.com |
| 📡 **Backend REST API** | https://hoping-railway-completion-bloggers.trycloudflare.com/api/ |
| 📖 **Swagger / API Docs** | https://hoping-railway-completion-bloggers.trycloudflare.com/api/docs |
| 🔬 **MLflow Experiment Tracker** | http://localhost:5000 *(local only)* |
| 📊 **Grafana Dashboard** | http://localhost:3001 *(local only)* |

### 🔑 Default Login Credentials
| Field | Value |
|---|---|
| **Email** | `sbhuvan847@gmail.com` |
| **Password** | `SuperAdmin123!` |

> **Note:** The public URL changes each time the tunnel restarts (free Cloudflare tier). Run `bash keep_tunnel.sh` to start an auto-restarting tunnel and get the latest URL printed to the terminal.

---

## System Architecture

The platform follows a robust microservices-oriented architecture running entirely within Docker:

### 1. Frontend (React + Vite)
- Serves the user interface on port **3000**.
- Built with premium modern web design aesthetics (Glassmorphism, gradients).
- Communicates with the backend REST API.

### 2. Backend (FastAPI + Python)
- Serves the core ML engine and API on port **8000**.
- **ML Engine**: Implements Logistic Regression, FedAvg, FedProx, SCAFFOLD, DP-SGD, Platt Scaling, and AUC calculations from mathematical first principles.
- **Security Engine**: Generates dynamic RSA-2048 keypairs, manages AES-256-GCM symmetric encryption for payload/weight data, and handles JWT/Bcrypt authentication.

### 3. Database (PostgreSQL)
- Persistent relational storage for Users, Clients, Datasets, Experiments, encrypted Model Weights, and Audit Logs.

### 4. Cache & Task Queue (Redis)
- High-speed in-memory data store to handle session state, caching, and queuing for background federated learning tasks.

### 5. DevOps & Observability
- **Nginx**: Reverse proxy unifying frontend and backend traffic on port **80**.
- **Prometheus & Grafana**: Scraping and visualizing backend metrics.
- **MLflow**: Tracking experiment hyperparameters, privacy budgets, and models on port **5000**.

---

## How to Run

### Prerequisites
- Docker and Docker Compose installed on your system.

### Startup Instructions

1. **Clone/Navigate** to the project directory:
   ```bash
   cd /home/bhuvans/Documents/final
   ```

2. **Start the full stack** (Frontend, Backend, Postgres, Redis, Nginx, Prometheus, Grafana, MLflow):
   ```bash
   docker compose up --build -d
   ```

3. **Start the global tunnel** (generates a public URL):
   ```bash
   bash keep_tunnel.sh
   ```
   The terminal will print the live public URL:
   ```
   ============================================
     🌍 PUBLIC URL: https://xxxx.trycloudflare.com
   ============================================
   ```

4. **Access the Platform locally**:
   | Service | Local URL |
   |---|---|
   | Main Web Interface | http://localhost |
   | Backend API Docs | http://localhost:8000/docs |
   | MLflow Tracking UI | http://localhost:5000 |
   | Grafana Dashboard | http://localhost:3001 |

### Default Credentials
Upon initial startup, the backend automatically seeds a Super Admin user into the database:
- **Email**: `sbhuvan847@gmail.com`
- **Password**: `SuperAdmin123!`

---

## Testing & CI/CD
The project includes a robust Pytest suite testing authentication, ML math, and cryptography.
To run the tests locally inside the backend container:
```bash
docker compose exec backend pytest tests/
```
The repository also includes a GitHub Actions workflow (`.github/workflows/main.yml`) that automatically runs linting and tests on every push.
