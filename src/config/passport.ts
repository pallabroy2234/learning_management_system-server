import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import {Strategy as GitHubStrategy} from "passport-github2";
import {
	base_url,
	github_client_id,
	github_client_secret,
	google_client_id,
	google_client_secret
} from "../secret/secret";
import {User} from "../model/user.model";


/**
 * @summary       Register user
 * @description   Register a new user account
 * @method        POST
 * @path          /user/register
 * @security      Public
 * @param {RegistrationRequest} data - User registration data
 * @returns {RegistrationResponse} Registration response object
 * */
passport.serializeUser((user, done) => done(null, (user as {_id: string})._id));

/**
 * @summary       Deserialize user
 * @description   Retrieves user from database using ID stored in session. Restores user details for authenticated requests.
 * @param {string} _id - User ID from session
 * @param {Function} done - Callback function
 */
passport.deserializeUser(async (_id, done) => {
	try {
		const user = await User.findById({_id});
		done(null, user);
	} catch (error) {
		done(error, null);
	}
});


/**
 * @summary       Google OAuth 2.0 Strategy
 * @description   Handles user authentication via Google. Validates user identity through Google's OAuth flow.
 * @configuration
 * @clientID      {string} Google OAuth client ID
 * @clientSecret  {string} Google OAuth client secret
 * @callbackURL   {string} Callback URL to handle Google OAuth response
 * @param {Object} profile - User profile from Google
 * @process       Checks for existing user by email:
 *                - If exists with Google provider: returns user
 *                - If exists with different provider: returns error
 *                - If new user: creates user record with Google provider
 */

passport.use(new GoogleStrategy({
	clientID: google_client_id as string,
	clientSecret: google_client_secret as string,
	callbackURL: `${base_url}/api/v1/user/auth/google/callback`

}, async (req: any, accessToken: any, refreshToken: any, profile: any, done: any) => {
	try {

		const email = profile?.emails?.[0].value || profile?._json?.email;
		if (!email) {
			return done(new Error("No email found in Google profile"), null);
		}
		let user = await User.findOne({email});

		if (user) {
			const isGithubProvider = user.provider === "google";
			if (isGithubProvider) {
				return done(null, user);
			} else {
				return done(new Error("You are already logged in with a different provider"), null);
			}
		}


		user = await User.create({
			name: profile.displayName || profile?._json?.name,
			email: profile.emails?.[0].value || profile?._json?.email,
			avatar: {
				url: profile.photos?.[0].value || profile?._json?.picture || "",
				public_id: ""
			},
			provider: "google",
			password: null
		});

		return done(null, user);
	} catch (error) {
		return done(error, false);
	}
}));


/**
 * @summary       GitHub OAuth 2.0 Strategy
 * @description   Handles user authentication via GitHub. Validates user identity through GitHub's OAuth flow.
 * @configuration
 * @clientID      {string} GitHub OAuth client ID
 * @clientSecret  {string} GitHub OAuth client secret
 * @callbackURL   {string} Callback URL to handle GitHub OAuth response
 * @process       Fetches primary email via GitHub API:
 *                - Checks for existing user by email
 *                - If exists with GitHub provider: returns user
 *                - If exists with different provider: returns error
 *                - If new user: creates user record with GitHub provider
 */

passport.use(new GitHubStrategy({
	clientID: github_client_id as string,
	clientSecret: github_client_secret as string,
	callbackURL: `${base_url}/api/v1/user/auth/github/callback`

}, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
	try {
		let email = null;

		if (accessToken) {
			const emailResponse = await fetch("https://api.github.com/user/emails", {
				headers: {
					Authorization: `token ${accessToken}`
					// "User-Agent": "your-app-name"
				}
			});
			const emails: any = await emailResponse.json();

			if (!emails) {
				return done(new Error("No email found in GitHub profile"), null);
			}
			const primaryEmail = emails.find((email: any) => email?.primary)?.email;
			if (!primaryEmail) {
				return done(new Error("No primary email found in GitHub profile"), null);
			}
			email = primaryEmail;
		} else {
			return done(new Error("No access token found in GitHub profile"), null);
		}

		// find user by email
		let user = await User.findOne({email: email});

		if (user) {
			const isGithubProvider = user.provider === "github";
			if (isGithubProvider) {
				return done(null, user);
			} else {
				return done(new Error("You are already logged in with a different provider"), null);
			}
		}

		user = await User.create({
			name: profile?.displayName || profile?.username,
			email: email,
			avatar: {
				url: profile?.photos?.[0].value || "",
				public_id: ""
			},
			provider: "github",
			password: null
		});
		return done(null, user);
	} catch (e: any) {
		const message = e.message || "An error occurred while authenticating with GitHub";
		return done(message, false);
	}
}));


/**
 * @summary       Exports configured Passport instance
 * @description   Passport configured with session serialization/deserialization and OAuth strategies
 */
export default passport;