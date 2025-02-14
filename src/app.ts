import express, {Response, Request, NextFunction} from "express";
import cors from "cors";
import morgan from "morgan";
import {errorMiddleware} from "./middleware/error";
import cookieParser from "cookie-parser";
import {cloud_api_key, cloud_api_secret, cloud_name, node_env, origins} from "./secret/secret";
import {v2 as cloudinary} from "cloudinary";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

// import routes
import {userRouter} from "./route/user.route";
import {courseRoute} from "./route/course.route";
import {orderRoute} from "./route/order.route";
import {notificationRouter} from "./route/notificaiton.route";
import {analyticsRoute} from "./route/analytics.route";
import {layoutRoute} from "./route/layout.route";
import passportRoute from "./route/passport.route";
import passport from "./config/passport";
import logger from "./config/logger";


export const app = express();


// =====================
// Security Middleware
// =====================

/**
 * @summary       Security headers configuration
 * @description   Sets Content Security Policy and other security headers using Helmet
 * @see           https://helmetjs.github.io/
 */
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'", "'apis.google.com'", "'www.google.com'"],
			connectSrc: ["'self'", "https:", "wss:"],
			imgSrc: ["'self'", "data:", "blob:", `res.cloudinary.com`],
			styleSrc: ["'self'", "fonts.googleapis.com"],
			frameSrc: ["'self'", "accounts.google.com"]
		}
	},
	crossOriginResourcePolicy: {policy: "cross-origin"}
}));

// Trust proxy in production
app.set("trust proxy", node_env === "production" ? 1 : 0);


// =====================
// CORS Configuration
// =====================

/**
 * @summary       Cross-Origin Resource Sharing setup
 * @description   Configures allowed origins, methods, and headers
 * @security      Restricts access to specified origins
 */
const allowedOrigins = origins?.split(",") || [];

export const corsOptions: cors.CorsOptions = {
	origin: (origin, callback) => {
		// Allow requests with no origin (server-to-server)
		if (!origin) return callback(null, true);

		// Check against allowed origins
		if (allowedOrigins.includes(origin)) {
			return callback(null, origin);
		}

		// Development debugging
		if (process.env.NODE_ENV === "development") {
			logger.info("🌐 Received origin:", origin);
			logger.info("✅ Allowed origins:", allowedOrigins);
		}

		return callback(new Error("Not allowed by CORS"));
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "X-Requested-With", "X-CSRF-Token"],
	exposedHeaders: ["X-Total-Count", "Content-Range"],
	maxAge: 86400  // 24h browser cache
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));  // Handle preflight for all routes


/** Compression middleware for response bodies */
app.use(compression());


/** JSON body parser with 50MB limit */
app.use(express.json({limit: "50mb"}));

/** URL-encoded body parser */
app.use(express.urlencoded({extended: true}));

// cookie parser
app.use(cookieParser());

/**
 * @summary       Request logging
 * @description   Uses morgan with format based on environment
 *                'combined' format in production, 'dev' format otherwise
 */
app.use(morgan(node_env === "production" ? "combined" : "dev"));


/**
 * @summary       API rate limiting
 * @description   Protects against brute-force attacks
 *                - 15 minute window
 *                - Different limits for production/development
 */
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: node_env === "production" ? 1000 : 5000, // limit each IP to 100 requests per windowMs
	standardHeaders: true,
	legacyHeaders: false
});


/** Initialize Passport authentication middleware */
app.use(passport.initialize());
// app.use(passport.session());


/**
 * @summary       Versioned API endpoints
 * @description   All routes protected by rate limiting
 *                Base path: /api/v1/
 */
// ------------------------------- API Routes ------------------------------->
app.use("/api/v1/user", apiLimiter, userRouter);
app.use("/api/v1/course", apiLimiter, courseRoute);
app.use("/api/v1/order", apiLimiter, orderRoute);
app.use("/api/v1/notification", apiLimiter, notificationRouter);
app.use("/api/v1/analytics", apiLimiter, analyticsRoute);
app.use("/api/v1/layout", apiLimiter, layoutRoute);
app.use("/api/v1/user/auth", passportRoute);


// =====================
// Cloudinary Configuration
// =====================


/**
 * @summary       Cloudinary SDK setup
 * @description   Configures cloudinary with credentials from environment variables
 * @see           https://cloudinary.com/documentation
 */

cloudinary.config({
	cloud_name: cloud_name as string,
	api_key: cloud_api_key as string,
	api_secret: cloud_api_secret as string
});

// =====================
// Error Handling
// =====================

/** Handle 404 errors for undefined routes */
app.all("*", (req: Request, res: Response, next: NextFunction) => {
	const err = new Error(`Route not found - ${req.originalUrl}`) as any;
	err.statusCode = 404;
	next(err);
});

/** Global error handling middleware */
app.use(errorMiddleware);