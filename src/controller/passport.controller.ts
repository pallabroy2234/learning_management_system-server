import passport from "passport";
import {createToken} from "../utils/jsonwebtoken";
import {client_base_url} from "../secret/secret";


export const googleAuth = passport.authenticate("google", {
	scope: ["profile", "email"]
});

export const googleAuthCallback = passport.authenticate("google", {
	session: false,
	failureRedirect: `${client_base_url}/google/auth/failure`
});


export const handleGoogleCallback = async (req: any, res: any) => {
	try {
		const user = req.user;

		const token = createToken(user, res);

		res.redirect(`${client_base_url}`);
	} catch (error) {
		res.redirect(`${client_base_url}/google/auth/failure`);
	}
};