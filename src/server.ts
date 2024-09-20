import {app} from "./app";
import dotenv from "dotenv";
import logger from "./config/logger";

dotenv.config();


// create server
app.listen(process.env.PORT, () => {
    logger.info(`Server is running on port http://localhost:${process.env.PORT}`);
})
