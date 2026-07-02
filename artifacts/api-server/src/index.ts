import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from package root, overriding stale container env vars
dotenvConfig({ path: resolve(__dirname, "../.env"), override: true });

import { createServer } from "http";
import { logger } from "./lib/logger";
import { connectMongoDB } from "./lib/mongodb";
import { connectRedis } from "./lib/redis";
import { initSocket } from "./lib/socket";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  const { default: app } = await import("./app");

  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  connectMongoDB().catch((err) => {
    logger.error({ err }, "MongoDB initial connection error");
  });

  connectRedis().catch((err) => {
    logger.warn({ err }, "Redis initial connection error — caching disabled");
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
