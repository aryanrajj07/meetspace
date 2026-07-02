import { createClient, RedisClientType } from "redis";
import { logger } from "./logger";

let redisClient: RedisClientType | null = null;
let redisConnected = false;

function isValidRedisUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "redis:" || parsed.protocol === "rediss:";
  } catch {
    return false;
  }
}

export async function connectRedis(): Promise<void> {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl || !isValidRedisUrl(redisUrl)) {
    logger.warn({ redisUrl: redisUrl ?? "(not set)" }, "Invalid or missing REDIS_URL — caching disabled");
    return;
  }

  redisClient = createClient({ url: redisUrl }) as RedisClientType;

  redisClient.on("error", (err) => {
    logger.warn({ err }, "Redis error — caching disabled");
    redisConnected = false;
  });

  redisClient.on("connect", () => {
    logger.info("Redis connected");
    redisConnected = true;
  });

  try {
    await redisClient.connect();
    redisConnected = true;
  } catch (err) {
    logger.warn({ err }, "Redis connect failed — caching disabled");
    redisConnected = false;
    redisClient = null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!redisClient || !redisConnected) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  if (!redisClient || !redisConnected) return;
  try {
    await redisClient.setEx(key, ttlSeconds, value);
  } catch {
    // ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redisClient || !redisConnected) return;
  try {
    await redisClient.del(key);
  } catch {
    // ignore
  }
}
