import mongoose from "mongoose";
import { logger } from "./logger";

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env["MONGODB_URI"];
  if (!uri || uri === "1234") {
    logger.warn("Invalid or missing MONGODB_URI — database disabled");
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed — will retry in background");
    scheduleRetry();
  }
}

function scheduleRetry() {
  setTimeout(async () => {
    const uri = process.env["MONGODB_URI"];
    if (!uri || uri === "1234") return;
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      isConnected = true;
      logger.info("MongoDB reconnected successfully");
    } catch (err) {
      logger.warn({ err }, "MongoDB retry failed — will try again in 10s");
      scheduleRetry();
    }
  }, 10000);
}

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  logger.warn("MongoDB disconnected");
});

export function isMongoConnected() {
  return isConnected;
}
