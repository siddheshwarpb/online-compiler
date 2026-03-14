// ============================================================
// routes/run.js — POST /api/run
// Validates request → enqueues job → waits for result
// ============================================================
import { Router }  from "express";
import { Queue }   from "bullmq";
import { v4 as uuid } from "uuid";
import Redis       from "ioredis";

const router = Router();

// Supported languages whitelist
const SUPPORTED = ["cpp", "python", "java", "javascript"];

// Redis connection (shared with worker)
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// BullMQ queue for code execution jobs
const codeQueue = new Queue("code-execution", { connection: redis });

// ── POST /api/run ──────────────────────────────────────────
router.post("/", async (req, res) => {
  const { language, code, stdin = "" } = req.body;

  // Validate inputs
  if (!language || !SUPPORTED.includes(language)) {
    return res.status(400).json({
      error: `Unsupported language. Choose from: ${SUPPORTED.join(", ")}`,
    });
  }
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "code field is required" });
  }
  if (code.length > 50_000) {
    return res.status(400).json({ error: "Code too large (max 50,000 chars)" });
  }

  // Create a unique job ID so we can poll the result
  const jobId = uuid();

  try {
    // Add job to queue (worker will pick it up)
    await codeQueue.add(
      "run",
      { jobId, language, code, stdin },
      { jobId, attempts: 1, removeOnComplete: { age: 60 } }
    );

    // Poll Redis for result (worker stores it under key: result:<jobId>)
    const MAX_WAIT_MS = 15_000;
    const POLL_MS     = 200;
    const start       = Date.now();

    while (Date.now() - start < MAX_WAIT_MS) {
      const raw = await redis.get(`result:${jobId}`);
      if (raw) {
        await redis.del(`result:${jobId}`);         // clean up
        return res.json(JSON.parse(raw));
      }
      await sleep(POLL_MS);
    }

    return res.status(504).json({ error: "Execution timed out waiting for worker" });

  } catch (err) {
    console.error("Queue error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default router;
