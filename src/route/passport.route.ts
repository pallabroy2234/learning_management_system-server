import express from "express";


const passportRoute = express.Router();
import {
	githubAuth,
	githubAuthCallback,
	googleAuth,
	googleAuthCallback, handleGithubCallback,
	handleGoogleCallback
} from "../controller/passport.controller";
import {isOAuthLoggedIn} from "../middleware/auth";


/**
 * @summary       OAuth authentication routes
 * @description   Handles Google and GitHub OAuth 2.0 authentication flows
 * @route         /google
 * @route         /google/callback
 * @route         /github
 * @route         /github/callback
 * @middleware    isOAuthLoggedIn - Checks if user is already authenticated
 */

/**
 * @summary       Google OAuth routes
 * @description   Handles Google authentication flow:
 *                1. Initiates OAuth request to Google
 *                2. Handles callback from Google OAuth
 * @method        GET /api/v1/user/auth/google
 * @method        GET /api/v1/user/auth/google/callback
 */


passportRoute.get("/google", isOAuthLoggedIn, googleAuth);
passportRoute.get("/google/callback", isOAuthLoggedIn, googleAuthCallback, handleGoogleCallback);

/**
 * @summary       GitHub OAuth routes
 * @description   Handles GitHub authentication flow:
 *                1. Initiates OAuth request to GitHub
 *                2. Handles callback from GitHub OAuth
 * @method        GET /api/v1/user/auth/github
 * @method        GET /api/v1/user/auth/github/callback
 */

passportRoute.get("/github", isOAuthLoggedIn, githubAuth);
passportRoute.get("/github/callback", isOAuthLoggedIn, githubAuthCallback, handleGithubCallback);

export default passportRoute;