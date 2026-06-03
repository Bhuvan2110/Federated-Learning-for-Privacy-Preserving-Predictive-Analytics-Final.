# 🚀 Running the FL Platform Locally

This guide covers two ways to run the project on your machine:
- **Option A — Docker (Recommended)** — one command, everything runs in containers
- **Option B — Manual (No Docker)** — run backend and frontend directly with Python and Node

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Git | any | `git --version` |
| Docker + Docker Compose | 24+ | `docker --version` |
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

---

## 1. Clone the Repository

```bash
git clone https://github.com/Bhuvan2110/Federated-Learning-for-Privacy-Preserving-Predictive-Analytics-Final.git
cd Federated-Learning-for-Privacy-Preserving-Predictive-Analytics-Final
```

---

## 2. Configure Environment Variables

Copy the example env and fill in your Supabase password:

```bash
cp .env .env.local   # optional backup
```

Edit `.env`:

```env
# Get this from: Supabase Dashboard → Project Settings → Database → Password
SUPABASE_DB_PASSWORD=your_actual_password_here

DATABASE_URL=postgresql://postgres.zjeabvqcjextrubfuntf:${SUPABASE_DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

REDIS_URL=redis://redis:6379/0
UPLOAD_DIR=/app/data/uploads
```

> **Tip:** If you don't have a Supabase account, the backend falls back to a local SQLite database automatically — you can leave `DATABASE_URL` pointing to the Supabase URL and it will fall back gracefully.

---

## Option A — Docker (Recommended)

### Step 1: Start all services

```bash
docker compose up --build
```

This starts:
| Service | URL |
|---------|-----|
| Frontend (React) | http://localhost:3000 |
| Backend (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Nginx (proxy) | http://localhost:80 |
| MLflow UI | http://localhost:5000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin/admin) |

### Step 2: Open the app

```
http://localhost:80
```

### Step 3: Default login credentials

```
Email:    sbhuvan847@gmail.com
Password: SuperAdmin123!
```

### Stop everything

```bash
docker compose down
```

---

## Option B — Manual (No Docker)

### Backend

```bash
# 1. Create and activate a virtual environment
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set environment variables (from root .env)
export DATABASE_URL="postgresql://postgres.zjeabvqcjextrubfuntf:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
export REDIS_URL="redis://localhost:6379/0"
export UPLOAD_DIR="./data/uploads"
export PYTHONPATH=.

# 4. Start the backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

> **Note:** You need Redis running locally. Install it via:
> - Linux: `sudo apt install redis-server && sudo systemctl start redis`
> - macOS: `brew install redis && brew services start redis`

---

### Frontend

```bash
# Open a new terminal
cd frontend

# 1. Install Node dependencies
npm install

# 2. Set the backend API URL
echo "VITE_API_URL=http://localhost:8000" > .env

# 3. Start the dev server
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## Running Tests

```bash
# From the project root
cd backend
source .venv/bin/activate
PYTHONPATH=. pytest tests/ -v
```

---

## Troubleshooting

### Docker socket permission error
```bash
sudo chmod 666 /var/run/docker.sock
# or add your user to the docker group:
sudo usermod -aG docker $USER
newgrp docker
```

### Backend can't connect to database
- Check your `SUPABASE_DB_PASSWORD` in `.env`
- The backend will fall back to SQLite (`./fl_platform.db`) if PostgreSQL is unreachable

### Frontend shows blank page / CORS errors
- Make sure `VITE_API_URL` in `frontend/.env` matches the running backend port
- For Docker: leave `VITE_API_URL=` empty (Nginx handles proxying internally)

### Port already in use
```bash
# Find what's using a port (e.g. 8000)
lsof -i :8000
kill -9 <PID>
```

---

## Project Structure

```
.
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/          # Route handlers (auth, datasets, predict, training…)
│   │   ├── core/         # Security, config
│   │   ├── db/           # SQLAlchemy models & session
│   │   └── ml/           # Federated learning simulation
│   └── requirements.txt
├── frontend/             # React + Vite frontend
│   └── src/
│       ├── pages/        # Predict, Dashboard, Datasets, Training…
│       └── components/   # Sidebar, layout…
├── mlflow/               # MLflow tracking server
├── nginx/                # Nginx reverse-proxy config
├── docker-compose.yml    # Full stack orchestration
├── render.yaml           # Render.com deployment config
└── .env                  # Environment variables (never commit secrets!)
```
