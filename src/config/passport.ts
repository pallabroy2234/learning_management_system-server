// import passport from "passport";
// import {User} from "../model/user.model";
// import {base_url, google_client_id, google_client_secret} from "../secret/secret";
// import {Strategy as GoogleStrategy} from "passport-google-oauth20";


// passport.use(new GoogleStrategy({
// 		clientID: google_client_id as string,
// 		clientSecret: google_client_secret as string,
// 		callbackURL: `${base_url}/auth/google/callback`,
// 		scope: ["email", "profile"]
// 	},
// 	async function(accessToken, refreshToken, profile, cb) {
// 		try {
// 			const email = profile.emails?.[0].value;
//
// 			let user = await User.findOne({email});
//
// 			if (!user) {
// 				let newUser = new User({
// 					name: profile.displayName,
// 					email: profile.emails?.[0].value,
// 					avatar: {
// 						url: profile.photos?.[0].value,
// 						public_id: ""
// 					},
// 					provider: "google"
// 				});
// 				await newUser.save();
// 				return cb(null, newUser);
// 			} else {
// 				return cb(null, user);
// 			}
// 		} catch (err) {
// 			return cb(err);
// 		}
// 	}
// ));
//
// export default passport;

import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import {base_url, google_client_id, google_client_secret} from "../secret/secret";
import {User} from "../model/user.model";
import logger from "./logger";


passport.serializeUser((user, done) => done(null, (user as {_id: string})._id));
passport.deserializeUser(async (_id, done) => {
	try {
		const user = await User.findById({_id});
		done(null, user);
	} catch (error) {
		done(error, null);
	}
});

passport.use(new GoogleStrategy({
	clientID: google_client_id as string,
	clientSecret: google_client_secret as string,
	callbackURL: `${base_url}/api/v1/user/auth/google/callback`
}, async (req: any, accessToken: any, refreshToken: any, profile: any, done: any) => {
	try {
		const email = profile?.emails?.[0].value;
		if (!email) {
			return done(new Error("No email found in Google profile"), null);
		}
		let user = await User.findOne({email});
		if (!user) {
			user = await User.create({
				name: profile.displayName,
				email: profile.emails?.[0].value,
				avatar: {
					url: profile.photos?.[0].value,
					public_id: ""
				},
				provider: "google"
			});
			logger.info(`New User via Google: ${user.email}`);
		}
		return done(null, user);
	} catch (error) {
		return done(error, false);
	}
}));


export default passport;