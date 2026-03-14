// ============================================================
// codeWorker.js — Judge0 FREE public instance
// No API key, no RapidAPI, completely free
// Public endpoint: https://ce.judge0.com
// ============================================================
import { Worker } from "bullmq";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// ── Judge0 public free server ──────────────────────────────
const JUDGE0_URL = "https://ce.judge0.com";

// ── Language IDs ───────────────────────────────────────────
const LANGUAGE_IDS = {
  cpp:        54,   // C++ 17
  python:     71,   // Python 3
  java:       62,   // Java 13
  javascript: 63,   // Node.js 12
};

// ── Language names for display ─────────────────────────────
const LANGUAGE_NAMES = {
  cpp:        "C++ 17",
  python:     "Python 3",
  java:       "Java 13",
  javascript: "Node.js 12",
};

// ── Status meanings ────────────────────────────────────────
const STATUS = {
  1:  { label: "Queued",                  error: false },
  2:  { label: "Processing",              error: false },
  3:  { label: "Accepted",               error: false },
  4:  { label: "Wrong Answer",            error: true  },
  5:  { label: "Time Limit Exceeded",     error: true  },
  6:  { label: "Compilation Error",       error: true  },
  7:  { label: "Runtime Error (SIGSEGV)", error: true  },
  8:  { label: "Runtime Error (SIGFPE)",  error: true  },
  9:  { label: "Runtime Error (SIGABRT)", error: true  },
  10: { label: "Runtime Error (NZEC)",    error: true  },
  11: { label: "Runtime Error (Other)",   error: true  },
  12: { label: "Internal Error",          error: true  },
  13: { label: "Exec Format Error",       error: true  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Submit code ────────────────────────────────────────────
async function submitCode(language, code, stdin) {
  const url = `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`;

  const body = {
    source_code:       code,
    language_id:       LANGUAGE_IDS[language],
    stdin:             stdin || "",
    cpu_time_limit:    10,
    memory_limit:      262144,   // 256MB in KB
    wall_time_limit:   15,
  };

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Submit failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  if (!data.token) {
    throw new Error(`No token returned: ${JSON.stringify(data)}`);
  }

  return data.token;
}

// ── Poll for result ────────────────────────────────────────
async function pollResult(token) {
  const url = `${JUDGE0_URL}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,compile_output,status,time,memory,message`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Poll failed (${res.status})`);
  }

  return await res.json();
}

// ── Main Worker ────────────────────────────────────────────
const worker = new Worker(
  "code-execution",
  async (job) => {
    const { jobId, language, code, stdin } = job.data;
    console.log(`\n📥 Job: ${jobId} | ${LANGUAGE_NAMES[language] || language}`);

    // Validate language
    if (!LANGUAGE_IDS[language]) {
      await storeResult(jobId, {
        output: `Unsupported language: ${language}. Supported: cpp, python, java, javascript`,
        error:  true,
        time:   "0s",
        memory: "0MB",
      });
      return;
    }

    const startTime = Date.now();
    let output  = "";
    let isError = false;
    let timeStr = "0s";
    let memStr  = "0MB";

    try {
      // 1. Submit to Judge0
      console.log("Submitting code to Judge0...");
      const token = await submitCode(language, code, stdin);
      console.log(`Token: ${token}`);

      // 2. Poll until done (max 20 seconds)
      const POLL_INTERVAL = 1000;  // 1 second
      const MAX_POLLS     = 20;
      let   result        = null;

      for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(POLL_INTERVAL);
        result = await pollResult(token);

        const statusId = result.status?.id;
        console.log(`Poll ${i + 1}: ${result.status?.description}`);

        // 1 = Queued, 2 = Processing → keep polling
        if (statusId !== 1 && statusId !== 2) break;
      }

      if (!result) {
        throw new Error("Timed out waiting for result");
      }

      // 3. Parse result based on status
      const statusId = result.status?.id;
      const status   = STATUS[statusId];

      if (statusId === 3) {
        // ✅ Success
        output  = result.stdout?.trim() || "(program ran successfully with no output)";
        isError = false;

      } else if (statusId === 6) {
        // ❌ Compilation Error
        output  = result.compile_output?.trim() || "Compilation Error";
        isError = true;

      } else if (statusId === 5) {
        // ⏱ Time Limit
        output  = `Time Limit Exceeded (${result.time || "?"}s)`;
        isError = true;

      } else {
        // ❌ Runtime Error or other
        output = [
          result.stderr,
          result.compile_output,
          result.stdout,
          result.message,
          status?.label || "Unknown error",
        ].filter(Boolean).map(s => s.trim()).filter(Boolean).join("\n") || "Unknown error";
        isError = true;
      }

      // 4. Stats
      timeStr = result.time   ? `${result.time}s`                        : `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      memStr  = result.memory ? `${(result.memory / 1024).toFixed(1)}MB` : "—";

    } catch (err) {
      isError = true;
      output  = `Error connecting to Judge0: ${err.message}`;
      console.error("Worker error:", err.message);
    }

    // Store result for API
    await storeResult(jobId, { output, error: isError, time: timeStr, memory: memStr });
    console.log(`✅ Done: ${jobId} | ${timeStr} | ${memStr}`);
  },
  { connection: redis, concurrency: 5 }
);

async function storeResult(jobId, data) {
  await redis.set(`result:${jobId}`, JSON.stringify(data), "EX", 120);
}

worker.on("failed", (job, err) =>
  console.error(`❌ Job failed ${job?.id}:`, err.message)
);

console.log("🚀 Judge0 FREE worker started");
console.log(`📡 Using: ${JUDGE0_URL}`);
console.log("⚡ No API key required — 100% free");
console.log("Waiting for jobs...\n");