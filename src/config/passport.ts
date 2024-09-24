import passport from 'passport';
import {User} from "../model/user.model";
import {base_url, google_client_id, google_client_secret} from "../secret/secret";

import {Strategy as GoogleStrategy} from 'passport-google-oauth20';


passport.use(new GoogleStrategy({
        clientID: google_client_id as string,
        clientSecret: google_client_secret as string,
        callbackURL: `${base_url}/auth/google/callback`,
        scope: ["email", "profile"],
    },
    async function (accessToken, refreshToken, profile, cb) {
        try {
            const email = profile.emails?.[0].value;

            let user = await User.findOne({email});

            if (!user) {
                let newUser = new User({
                    name: profile.displayName,
                    email: profile.emails?.[0].value,
                    avatar: {
                        url: profile.photos?.[0].value,
                        public_id: ""
                    },
                });
                await newUser.save();
                return cb(null, newUser);
            } else {
                return cb(null, user);
            }
        } catch (err) {
            return cb(err);
        }
    }
));

export default passport;

