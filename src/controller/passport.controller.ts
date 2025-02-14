import passport from "passport";
import {createToken} from "../utils/jsonwebtoken";
import {client_base_url} from "../secret/secret";


/**
 * @description            Google authentication
 * @method                 GET
 * @url                    /auth/google
 *
 * */

export const googleAuth = passport.authenticate("google", {
	scope: ["profile", "email"]
});

export const googleAuthCallback = (req: any, res: any, next: any) => {
	passport.authenticate("google", {session: false}, (err: any, user: any) => {
		if (err) {
			const message = encodeURIComponent(err.message) || "Authentication failed";
			return res.redirect(`${client_base_url}/auth/failure?error=${message}`);
		}
		if (!user) {
			const message = encodeURIComponent("Authentication failed");
			return res.redirect(`${client_base_url}/auth/failure?error=${message}`);
		}
		req.user = user;
		next();
	})(req, res, next);
};


export const handleGoogleCallback = async (req: any, res: any) => {
	try {
		const user = req.user;
		createToken(user, res);
		const message = encodeURIComponent(`${user.name} you have successfully logged in to your account`);
		return res.redirect(`${client_base_url}/auth/success?success=${message}`);
	} catch (error: any) {
		const message = error?.message || "Authentication failed";
		return res.redirect(`${client_base_url}/auth/failure?error=${message}`);
	}
};

//   -----------------------------------------------------  Github Authentication  -----------------------------------------------------

/**
 * @description            Github authentication
 * @method                 GET
 * @url                    /auth/github
 * */


export const githubAuth = passport.authenticate("github", {
	scope: ["user:email", "read:user"]
});

export const githubAuthCallback = (req: any, res: any, next: any) => {
	passport.authenticate("github", {session: false}, (err: any, user: any) => {
		if (err) {
			const message = encodeURIComponent(err.message) || "Authentication failed";
			return res.redirect(`${client_base_url}/auth/failure?error=${message}`);
		}
		if (!user) {
			const message = encodeURIComponent("Authentication failed");
			return res.redirect(`${client_base_url}/auth/failure?error=${message}`);
		}
		req.user = user;
		next();
	})(req, res, next);
};


export const handleGithubCallback = async (req: any, res: any) => {
	try {
		const user = req.user;
		createToken(user, res);

		const successMessage = encodeURIComponent(`${user.name} you have successfully logged in to your account`);

		return res.redirect(`${client_base_url}/auth/success?success=${successMessage}`);
	} catch (error: any) {
		const message = error?.message || "Authentication failed";
		res.redirect(`${client_base_url}/auth/failure?error=${message}`);
	}
};