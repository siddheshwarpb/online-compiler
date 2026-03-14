// ============================================================
// server.js — Express API + Socket.IO
// Routes: POST /api/run  GET /api/health  GET /api/languages
// ============================================================
import express        from "express";
import cors           from "cors";
import { createServer } from "http";
import { Server }     from "socket.io";
import rateLimit      from "express-rate-limit";
import "dotenv/config";

import runRouter      from "./routes/run.js";
import langRouter     from "./routes/languages.js";

const app    = express();
const server = createServer(app);

// ── Socket.IO (optional real-time output streaming) ────────
export const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client left:", socket.id));
});

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://your-app.vercel.app",   // add this
    /\.vercel\.app$/,                 // allow all vercel subdomains
  ]
}));
app.use(express.json({ limit: "100kb" }));

// ── Rate limiting: 30 runs / 60s per IP ───────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests — slow down!" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/run", limiter);

// ── Routes ─────────────────────────────────────────────────
app.use("/api/run",       runRouter);
app.use("/api/languages", langRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ── Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Backend API listening on http://localhost:${PORT}`);
});
