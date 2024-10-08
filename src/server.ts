import {app} from "./app";
import logger from "./config/logger";
import {connectDB} from "./config/db";
import {port} from "./secret/secret";


// create server
app.listen(port, async () => {
	await connectDB();
	logger.info(`Server is running on port http://localhost:${port}`);
});
