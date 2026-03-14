# 🚀 CodeRun — Online Compiler

A full-stack, production-ready online code compiler supporting **C++, Python, Java, and JavaScript**.

---

## 📁 File Structure (20 files)

```
online-compiler/
│
├── docker-compose.yml              ← (1) Orchestrates all services
│
├── build-images.sh                 ← (2) Builds Docker sandbox images
│
├── frontend/
│   ├── Dockerfile                  ← (3) Frontend Docker image
│   ├── package.json                ← (4) React dependencies
│   ├── vite.config.js              ← (5) Vite build config
│   ├── index.html                  ← (6) HTML entry point
│   └── src/
│       ├── main.jsx                ← (7) React root
│       ├── index.css               ← (8) Global CSS variables
│       ├── App.jsx                 ← (9) Main app component
│       └── App.module.css          ← (10) Component styles
│
├── backend/
│   ├── Dockerfile                  ← (11) Backend Docker image
│   ├── package.json                ← (12) Node dependencies
│   ├── .env.example                ← (13) Env vars template
│   └── src/
│       ├── server.js               ← (14) Express server + Socket.IO
│       ├── routes/
│       │   ├── run.js              ← (15) POST /api/run route
│       │   └── languages.js        ← (16) GET /api/languages route
│       └── workers/
│           └── codeWorker.js       ← (17) BullMQ worker (runs Docker)
│
└── runners/
    ├── cpp/
    │   ├── Dockerfile              ← (18) GCC 13 sandbox
    │   └── entrypoint.sh           ← Compile + run C++
    ├── python/
    │   ├── Dockerfile              ← (19) Python 3.12 sandbox
    │   └── entrypoint.sh
    ├── java/
    │   ├── Dockerfile              ← (20) OpenJDK 21 sandbox
    │   └── entrypoint.sh
    └── javascript/
        ├── Dockerfile              ← Node.js 20 sandbox
        └── entrypoint.sh
```

---

## ✅ Step-by-Step Setup

### Prerequisites
- **Docker Desktop** (running)
- **Node.js 18+** (for local dev without Docker)
- **Git**

---

### Step 1 — Clone / create project
```bash
git clone <your-repo>
cd online-compiler
```

---

### Step 2 — Build all sandbox Docker images
```bash
chmod +x build-images.sh
./build-images.sh
```
This builds 4 images: `compiler-cpp`, `compiler-python`, `compiler-java`, `compiler-javascript`

---

### Step 3 — Start everything with Docker Compose
```bash
docker compose up --build
```

Services started:
| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173       |
| Backend  | http://localhost:4000       |
| Redis    | localhost:6379              |

---

### Step 4 — Open the compiler
Visit **http://localhost:5173** in your browser.

---

## 🔒 Security Features

| Feature           | How it's enforced                        |
|-------------------|------------------------------------------|
| Memory limit      | `--memory=256m` Docker flag              |
| CPU limit         | `--cpus=0.5` Docker flag                 |
| No network        | `--network=none` Docker flag             |
| Time limit        | `timeout 10s` in entrypoint.sh           |
| Non-root user     | `USER runner` in each Dockerfile         |
| Read-only fs      | `--read-only` Docker flag                |
| Rate limiting     | 30 requests / 60s per IP (Express)       |
| Code size limit   | 50,000 chars max (backend validation)    |

---

## 📡 API Endpoints

### `POST /api/run`
```json
// Request
{
  "language": "python",
  "code": "print('hello')",
  "stdin": ""
}

// Response
{
  "output": "hello\n",
  "error": false,
  "time": "0.18s",
  "memory": "12MB"
}
```

### `GET /api/languages`
Returns list of supported languages with metadata.

### `GET /api/health`
Returns `{ "status": "ok" }`.

---

## ⚙️ Architecture Flow

```
Browser (Monaco Editor)
        ↓  POST /api/run
Express Backend (port 4000)
        ↓  enqueue job
Redis Queue (BullMQ)
        ↓  pick up job
Worker (3 replicas)
        ↓  docker run compiler-{lang}
Sandbox Container (isolated)
        ↓  compile + execute
Result → Redis → API → Frontend
```

---

## 🚀 Production Improvements
- Replace polling with Socket.IO streaming output
- Add Kubernetes for auto-scaling workers
- Use Firecracker microVMs instead of Docker
- Add user auth + code history (PostgreSQL)
- Add Judge0-compatible API for contest mode
