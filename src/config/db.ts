import mongoose from "mongoose";
import logger from "./logger";
import {db_name, db_uri} from "../secret/secret";


const dbUri = db_uri as string || "";
const dbName = db_name as string || "";


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