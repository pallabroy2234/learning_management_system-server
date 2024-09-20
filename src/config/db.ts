import dotenv from "dotenv";

dotenv.config();
import mongoose from "mongoose";
import logger from "./logger";


const dbUri = process.env.DB_URI as string || "";
const dbName = process.env.DB_NAME as string || "";


export const connectDB = async () => {
    try {
        await mongoose.connect(`${dbUri}/${dbName}`).then((data: any) => {
            logger.info(`Database connected with ${data.connection.host}`)
        })
    } catch (err: any) {
        logger.error(err.message)
        process.exit(1)
    }
}