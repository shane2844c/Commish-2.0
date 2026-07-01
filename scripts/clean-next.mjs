import { rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const nextDir = ".next";

function killPort(port) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr ":${port} "`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pids = new Set(
        output
          .split(/\r?\n/)
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid) && pid !== "0")
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          console.log(`Stopped process ${pid} on port ${port}`);
        } catch {
          // Process may already be gone.
        }
      }
      return;
    }

    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore" });
  } catch {
    // Nothing listening on this port.
  }
}

for (const port of [3000, 3001]) {
  killPort(port);
}

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  console.log("Removed .next");
} else {
  console.log(".next not present");
}
