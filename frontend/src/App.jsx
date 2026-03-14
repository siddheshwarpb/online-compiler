// ============================================================
// App.jsx — Online Compiler Main Component
// Features: Monaco editor, language selector, stdin, output
// ============================================================
import { useState, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import styles from "./App.module.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ── Starter Templates ──────────────────────────────────────
const TEMPLATES = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;

    // Read input
    int n;
    cin >> n;
    cout << "You entered: " << n << endl;

    return 0;
}`,
  python: `# Python 3
def main():
    print("Hello, World!")

    # Read input
    n = input("Enter a number: ")
    print(f"You entered: {n}")

if __name__ == "__main__":
    main()`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");

        // Read input
        java.util.Scanner sc = new java.util.Scanner(System.in);
        if (sc.hasNextLine()) {
            String line = sc.nextLine();
            System.out.println("You entered: " + line);
        }
    }
}`,
  javascript: `// Node.js
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Hello, World!");

rl.question("Enter a number: ", (answer) => {
  console.log("You entered:", answer);
  rl.close();
});`,
};

const LANGS = [
  { id: "cpp",        label: "C++",        monaco: "cpp",        icon: "⚡" },
  { id: "python",     label: "Python 3",   monaco: "python",     icon: "🐍" },
  { id: "java",       label: "Java",       monaco: "java",       icon: "☕" },
  { id: "javascript", label: "JavaScript", monaco: "javascript", icon: "🟨" },
];

// ── Status badge colors ────────────────────────────────────
const STATUS_COLOR = {
  idle:     "#64748b",
  running:  "#f7b731",
  success:  "#3ecf8e",
  error:    "#ff5c5c",
  timeout:  "#f7b731",
};

export default function App() {
  const [lang, setLang]         = useState("cpp");
  const [code, setCode]         = useState(TEMPLATES["cpp"]);
  const [stdin, setStdin]       = useState("");
  const [output, setOutput]     = useState("");
  const [status, setStatus]     = useState("idle");   // idle|running|success|error|timeout
  const [stats, setStats]       = useState(null);     // { time, memory }
  const [showStdin, setShowStdin] = useState(false);
  const editorRef = useRef(null);

  // ── Switch language ──────────────────────────────────────
  const handleLangChange = useCallback((id) => {
    setLang(id);
    setCode(TEMPLATES[id]);
    setOutput("");
    setStats(null);
    setStatus("idle");
  }, []);

  // ── Run code ─────────────────────────────────────────────
  const runCode = useCallback(async () => {
    const currentCode = editorRef.current?.getValue() ?? code;
    if (!currentCode.trim()) {
      toast.error("Write some code first!");
      return;
    }

    setStatus("running");
    setOutput("");
    setStats(null);

    try {
      const { data } = await axios.post(
        `${API}/api/run`,
        { language: lang, code: currentCode, stdin },
        { timeout: 30_000 }
      );

      setOutput(data.output || "(no output)");
      setStats({ time: data.time, memory: data.memory });
      setStatus(data.error ? "error" : "success");

      if (data.error) toast.error("Runtime error");
      else toast.success("Execution complete");

    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Server unreachable";
      setOutput(`Error: ${msg}`);
      setStatus("error");
      toast.error(msg);
    }
  }, [lang, code, stdin]);

  // ── Clear editor ─────────────────────────────────────────
  const clearCode = () => {
    setCode(TEMPLATES[lang]);
    editorRef.current?.setValue(TEMPLATES[lang]);
    setOutput("");
    setStats(null);
    setStatus("idle");
  };

  const currentLang = LANGS.find((l) => l.id === lang);

  return (
    <div className={styles.app}>
      <Toaster position="top-right" toastOptions={{ style: { background: "#13161f", color: "#e2e8f0", border: "1px solid #1e2233" } }} />

      {/* ── Header ─────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>{"</>"}</span>
          <span>CodeRun</span>
        </div>

        <nav className={styles.langBar}>
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLangChange(l.id)}
              className={`${styles.langBtn} ${lang === l.id ? styles.langBtnActive : ""}`}
            >
              <span>{l.icon}</span> {l.label}
            </button>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <button className={styles.btnGhost} onClick={clearCode} title="Reset to template">
            ↺ Reset
          </button>
          <button
            className={styles.btnRun}
            onClick={runCode}
            disabled={status === "running"}
          >
            {status === "running" ? (
              <><span className={styles.spinner} /> Running…</>
            ) : (
              <><span>▶</span> Run</>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Layout ────────────────────────────────── */}
      <main className={styles.main}>

        {/* Left: Editor pane */}
        <section className={styles.editorPane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneTitle}>{currentLang.icon} {currentLang.label}</span>
            <div className={styles.dots}>
              <span style={{ background: "#ff5c5c" }} />
              <span style={{ background: "#f7b731" }} />
              <span style={{ background: "#3ecf8e" }} />
            </div>
          </div>

          <div className={styles.editorWrap}>
            <Editor
              height="100%"
              language={currentLang.monaco}
              value={code}
              onChange={(v) => setCode(v || "")}
              onMount={(editor) => { editorRef.current = editor; }}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                lineNumbersMinChars: 3,
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                automaticLayout: true,
              }}
            />
          </div>
        </section>

        {/* Right: Output + stdin pane */}
        <section className={styles.outputPane}>

          {/* Stdin toggle */}
          <div className={styles.stdinSection}>
            <button
              className={styles.stdinToggle}
              onClick={() => setShowStdin((v) => !v)}
            >
              {showStdin ? "▾" : "▸"} stdin (standard input)
            </button>
            {showStdin && (
              <textarea
                className={styles.stdinArea}
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Paste input for your program here…"
                rows={4}
                spellCheck={false}
              />
            )}
          </div>

          {/* Output */}
          <div className={styles.outputBox}>
            <div className={styles.outputHeader}>
              <span className={styles.paneTitle}>Output</span>
              <span
                className={styles.statusBadge}
                style={{ background: STATUS_COLOR[status] + "22", color: STATUS_COLOR[status] }}
              >
                {status.toUpperCase()}
              </span>
              {stats && (
                <span className={styles.statsMeta}>
                  ⏱ {stats.time} · 💾 {stats.memory}
                </span>
              )}
            </div>

            <pre className={styles.outputContent}>
              {status === "running"
                ? "Compiling and executing…"
                : output || "Press ▶ Run to execute your code"}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
