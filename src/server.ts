import {app} from "./app";
import dotenv from "dotenv";
import logger from "./config/logger";
import {connectDB} from "./config/db";

dotenv.config();


// create server
app.listen(process.env.PORT, async () => {
    await connectDB();
    logger.info(`Server is running on port http://localhost:${process.env.PORT}`);
})
