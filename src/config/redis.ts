import Redis from "ioredis"
import logger from "./logger";
import {redis_url} from "../secret/secret";

export const redisCache = new Redis(redis_url as string, {
    tls: {}, // Ensure TLS is used for security
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000); // Exponential backoff strategy
        logger.warn(`Retrying Redis connection: Attempt ${times}. Delaying for ${delay}ms.`);
        return delay; // Return delay time in milliseconds
    },
    maxRetriesPerRequest: 5, // Set max retries for individual requests
    connectTimeout: 10000, // Set a timeout for connection attempts
});


redisCache.on("connect", () => {
    logger.info("Connected to Redis successfully!")
});

redisCache.on("error", (err) => {
    logger.error("Redis connection error:", err)
});


// Function to set a value in Redis
export const setValue = async (key: string, value: string) => {
    try {
        await redisCache.set(key, value);
        logger.info(`Set key: ${key} with value: ${value}`);
    } catch (err) {
        logger.error(`Error setting key ${key}:`, err);
    }
};

// Function to get a value from Redis
export const getValue = async (key: string): Promise<string | null> => {
    try {
        const value = await redisCache.get(key);
        logger.info(`Retrieved key: ${key} with value: ${value}`);
        return value; // Return the retrieved value
    } catch (err) {
        logger.error(`Error getting key ${key}:`, err);
        return null; // Return null if there's an error
    }
};


// Function to delete a key from Redis
export const deleteKey = async (key: string) => {
    try {
        await redisCache.del(key);
        logger.info(`Deleted key: ${key}`);
    } catch (err) {
        logger.error(`Error deleting key ${key}:`, err);
    }
};

export const keyExists = async (key: string): Promise<boolean> => {
    try {
        const exists = await redisCache.exists(key);
        logger.info(`Checked existence of key: ${key}. Exists: ${exists}`);
        return exists === 1; // Returns true if exists, false otherwise
    } catch (err) {
        logger.error(`Error checking key ${key}:`, err);
        return false; // Return false in case of an error
    }
};



// Graceful shutdown
// process.on("SIGINT", async () => {
//     logger.info("Shutting down Redis client...");
//     await redisCache.quit();
//     logger.info("Redis client closed.");
//     process.exit(0);
// });