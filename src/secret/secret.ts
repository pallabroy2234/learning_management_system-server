import * as dotenv from "dotenv";

dotenv.config();


// * SERVER SECRET
export const port = process.env.PORT;
export const origin = process.env.ORIGIN;
export const node_env = process.env.NODE_ENV;

// * DATABASE SECRET
export const db_uri = process.env.DB_URI;
export const db_name = process.env.DB_NAME;


// * CLOUDINARY SECRET
export const cloud_name = process.env.CLOUD_NAME;
export const cloud_api_key = process.env.CLOUD_API_KEY;
export const cloud_api_secret = process.env.CLOUD_API_SECRET;


// * REDIS SECRET
export const redis_url = process.env.REDIS_URL;


// * JWT SECRET

export const jwt_activation_secret = process.env.JWT_ACTIVATION_SECRET;
export const jwt_access_token_secret = process.env.JWT_ACCESS_TOKEN_SECRET;
export const jwt_access_token_expire = process.env.JWT_ACCESS_TOKEN_EXPIRE;
export const jwt_refresh_token_secret = process.env.JWT_REFRESH_TOKEN_SECRET;
export const jwt_refresh_token_expire = process.env.JWT_REFRESH_TOKEN_EXPIRE;


// * SMTP EMAIL SECRET
export const smtp_host = process.env.SMTP_HOST;
export const smtp_port = process.env.SMTP_PORT;
export const smtp_service = process.env.SMTP_SERVICE;
export const smtp_mail = process.env.SMTP_MAIL;
export const smtp_password = process.env.SMTP_PASSWORD;

