import Redis from "ioredis";
import dotenv from "dotenv";
import logger from "./logger";

dotenv.config(); // Load environment variables

const redisClient = () => {
    if (process.env.REDIS_URL) {
        const client = new Redis(process.env.REDIS_URL);

        client.on("connect", () => {
            logger.info("Connected to Redis successfully!");
        });

        client.on("error", (err) => {
            logger.error("Redis connection error:", err);
        });

        return client;
    } else {
        throw new Error("Redis connection failed!");
    }
};

// Initialize the Redis client
export const client = redisClient();