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


export const app = express();


// =====================
// Security Middleware
// =====================

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

// =====================

app.set("trust proxy", node_env === "production" ? 1 : 0);


// =====================
// CORS Configuration
// =====================

// const getOrigins = (): string[] => {
// 	const origins = process.env.ORIGINS?.split(",") || [];
//
// 	// Production validation
// 	if (process.env.NODE_ENV === "production") {
// 		return origins.filter(origin => {
// 			const isValid = /^https?:\/\/(?:[\w-]+\.)+[\w-]+(?::\d+)?$/.test(origin);
// 			if (!isValid) console.error(`Invalid CORS origin: ${origin}`);
// 			return isValid;
// 		}).map(o => o.trim().toLowerCase());
// 	}
//
// 	// Development: allow localhost + trim whitespace
// 	return origins.map(o => o.trim().toLowerCase());
// };
//
// const allowedOrigins = getOrigins();


// export const corsOptions: cors.CorsOptions = {
// 	origin: (origin, callback) => {
// 		// Allow server-to-server/no-origin requests
// 		if (!origin) return callback(null, true);
//
// 		// Normalize comparison
// 		const normalizedOrigin = origin.trim().toLowerCase();
//
// 		if (allowedOrigins.includes(normalizedOrigin)) {
// 			return callback(null, origin); // Reflect original casing
// 		}
//
// 		// Security logging
// 		if (process.env.NODE_ENV !== "production") {
// 			logger.info(`🚫 Blocked CORS: ${origin}`);
// 			logger.info(`✅ Allowed: ${allowedOrigins.join(", ")}`);
// 		}
//
// 		return callback(new Error(`Origin ${origin} not allowed`));
// 	},
// 	credentials: true,
// 	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
// 	allowedHeaders: [
// 		"Content-Type",
// 		"Authorization",
// 		"X-Requested-With",
// 		"X-CSRF-Token"
// 	],
// 	exposedHeaders: [
// 		"Content-Range",
// 		"X-Content-Range",
// 		"Content-Length",
// 		"X-Total-Count"
// 	],
// 	maxAge: 86400
// };

// const corsOptions: cors.CorsOptions = {
// 	origin: (origin, callback) => {
// 		// Allow requests with no origin (server-to-server, mobile apps)
// 		if (!origin) return callback(null, true);
//
// 		// Check allowed origins
// 		if (origins && origins.includes(origin)) {
// 			return callback(null, origin);
// 		}
// 		// Log unexpected origins in development
// 		if (process.env.NODE_ENV !== "production") {
// 			logger.info(`🚫 Blocked CORS request from: ${origin}`);
// 		}
// 		return callback(new Error("Not allowed by CORS"));
// 	},
// 	credentials: true,
// 	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
// 	allowedHeaders: [
// 		"Content-Type",
// 		"Authorization",
// 		"X-Requested-With",
// 		"X-CSRF-Token"
// 	],
// 	exposedHeaders: [
// 		"Content-Range",
// 		"X-Content-Range",
// 		"Content-Length",
// 		"X-Total-Count"
// 	],
// 	maxAge: 86400 // 24h browser cache
// };

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
			console.log("🌐 Received origin:", origin);
			console.log("✅ Allowed origins:", allowedOrigins);
		}

		return callback(new Error("Not allowed by CORS"));
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	exposedHeaders: ["X-Total-Count", "Content-Range"],
	maxAge: 86400  // 24h browser cache
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));  // Handle preflight for all routes


// =====================
// Other Middleware
// =====================
app.use(compression());


// body parser
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true}));

// cookie parser
app.use(cookieParser());

// morgan
// app.use(morgan("dev"));
app.use(morgan(node_env === "production" ? "combined" : "dev"));


// cors -> cross origin resource sharing
// app.use(cors({
// 	origin: origins,
// 	credentials: true
// }));


//  ============= Rate limiting for API routes
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: node_env === "production" ? 1000 : 5000, // limit each IP to 100 requests per windowMs
	standardHeaders: true,
	legacyHeaders: false
});


// passport
app.use(passport.initialize());
// app.use(passport.session());


// ------------------------- routes -------------------------
app.use("/api/v1/user", apiLimiter, userRouter);
app.use("/api/v1/course", apiLimiter, courseRoute);
app.use("/api/v1/order", apiLimiter, orderRoute);
app.use("/api/v1/notification", apiLimiter, notificationRouter);
app.use("/api/v1/analytics", apiLimiter, analyticsRoute);
app.use("/api/v1/layout", apiLimiter, layoutRoute);
app.use("/api/v1/user/auth", passportRoute);

// google auth routes
// app.get("/auth/google", handleGoogleLogin);
// app.get("/auth/google/callback", handleGoogleCallback);


// * cloudinary config

cloudinary.config({
	cloud_name: cloud_name as string,
	api_key: cloud_api_key as string,
	api_secret: cloud_api_secret as string
});


// unknown route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
	const err = new Error(`Route not found - ${req.originalUrl}`) as any;
	err.statusCode = 404;
	next(err);
});

// ! error middleware
app.use(errorMiddleware);