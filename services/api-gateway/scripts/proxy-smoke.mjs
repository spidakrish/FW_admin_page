import { createServer } from "http";
import { spawn } from "child_process";
import { once } from "events";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(serviceDir, "..", "..");

function startStub(port, payload) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === "/health") {
        const body = JSON.stringify({ status: "ok", service: payload });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(body);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.once("error", reject);
    server.listen(port, () => {
      console.log(`[stub] ${payload} listening on :${port}`);
      resolve(server);
    });
  });
}

async function withGateway() {
  const gatewayEnv = {
    ...process.env,
    FW_ANALYSIS_SERVICE_URL: "http://localhost:5000",
    BACKPRO_SERVICE_URL: "http://localhost:8000",
    FW_ADMIN_API_KEYS: "dev"
  };

  const nodeBin = path.dirname(process.execPath);
  const npxCmd = process.platform === "win32" ? path.join(nodeBin, "npx.cmd") : path.join(nodeBin, "npx");
  const gatewayEntry = path.join(serviceDir, "src", "index.ts");
  const gatewayCmd = `"${npxCmd}" --yes --prefix "${repoRoot}" tsx "${gatewayEntry}"`;
  const gateway = spawn(gatewayCmd, { env: gatewayEnv, shell: true });

  gateway.stderr.on("data", (chunk) => process.stderr.write(`[gateway:err] ${chunk}`));
  gateway.stdout.on("data", (chunk) => process.stdout.write(`[gateway] ${chunk}`));

  const exitPromise = once(gateway, "exit");
  const readyPromise = new Promise((resolve, reject) => {
    gateway.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("API Gateway listening")) {
        resolve();
      }
    });
    gateway.once("exit", (code) => {
      reject(new Error(`Gateway exited early with code ${code}`));
    });
  });

  return {
    ready: readyPromise,
    stop: async () => {
      gateway.kill();
      await exitPromise;
    }
  };
}

async function hit(pathname) {
  const res = await fetch(`http://localhost:8787${pathname}`, {
    headers: {
      "x-fw-admin-key": "dev"
    }
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  const fwStub = await startStub(5000, "fw-analysis-stub");
  const backStub = await startStub(8000, "backpro-stub");
  const gateway = await withGateway();

  try {
    await gateway.ready;

    const fw = await hit("/api/v1/fw-analysis/health");
    console.log("[test] fw-analysis", fw);

    const back = await hit("/api/v1/backpro/health");
    console.log("[test] backpro", back);
  } finally {
    await gateway.stop();
    await Promise.all([
      new Promise((resolve) => fwStub.close(resolve)),
      new Promise((resolve) => backStub.close(resolve))
    ]);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
