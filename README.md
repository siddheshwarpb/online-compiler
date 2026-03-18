# 🚀 CodeRun — Online Compiler

A full-stack, production-ready online code compiler supporting **C++, Python, Java, and JavaScript**.

---

## ✨ Features

* 🌐 Run code directly in the browser
* ⚡ Fast execution using Judge0 API
* 🔁 Queue-based processing using Redis + BullMQ
* 🐳 Fully Dockerized setup
* 🧠 Multi-language support (C++, Python, Java, JS)
* 💻 Clean UI with Monaco Editor

---

## 🏗️ Tech Stack

### Frontend

* React (Vite)
* Monaco Editor

### Backend

* Node.js + Express
* BullMQ (Job Queue)
* Redis

### Execution Engine

* Judge0 API (for code execution)

### DevOps

* Docker + Docker Compose

---

## 📁 Project Structure

```
online-compiler/
├── docker-compose.yml        # Orchestrates all services
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles
│   ├── index.html
│   ├── vite.config.js
│   └── .dockerignore
│
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── server.js         # Express server
│   │   ├── routes/
│   │   │   └── run.js        # API route for execution
│   │   └── workers/
│   │       └── codeWorker.js # Worker processing jobs
│   ├── package.json
│   └── Dockerfile
│
└── README.md
```

---

## ⚙️ How It Works

```
Frontend → Backend → Redis Queue → Worker → Judge0 API → Output
```

1. User writes code in frontend
2. Backend pushes job to Redis queue
3. Worker picks job and sends to Judge0
4. Output is returned to frontend

---

## 🐳 Running Locally (Docker)

### 1. Clone the repo

```bash
git clone https://github.com/siddheshwarpb/online-compiler.git
cd online-compiler
```

---

### 2. Run the app

```bash
docker compose up --build
```

---

### 3. Open in browser

```
http://localhost:5173
```

---

## 🔧 Environment Variables

### Frontend (`frontend/.env`)

```
VITE_API_URL=http://localhost:4000
```

### Backend

```
REDIS_URL=redis://redis:6379
PORT=4000
```

---

## 🚀 Future Improvements

* 🔥 Custom Docker-based execution (own compiler)
* 📊 Execution metrics (time, memory)
* 🧪 Test case support (like LeetCode)
* 🔐 Authentication system
* 🌍 Deploy to cloud (Railway / AWS)

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

---

## 📜 License

This project is open-source and free to use.

---

## 👨‍💻 Author

**Siddheshwar Budge**

---
