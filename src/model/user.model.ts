import {model, Schema} from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import {Secret, sign} from "jsonwebtoken";


const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
dotenv.config();

export interface IUser extends Document {
    name: string,
    email: string,
    password: string,

    isModified(path: string): boolean;

    avatar: {
        public_id: string,
        url: string
    },
    role: string,
    isVerified: boolean,
    courses: Array<{ courseId: string }>
    comparePassword: (password: string) => Promise<boolean>
    SignAccessToken: () => string
    SignRefreshToken: () => string
}


const userSchema: Schema<IUser> = new Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name'],
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        validate: {
            validator: (value: string) => emailRegex.test(value),
            message: 'Please enter a valid email'
        },
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please enter your password'],
        minlength: [6, 'Your password must be at least 6 characters'],
        select: false,
        // set: (v: any) => bcrypt.hashSync(v, bcrypt.genSaltSync(10)),
    },
    avatar: {
        public_id: String,
        url: String
    },
    role: {
        type: String,
        default: 'user'
    },

    isVerified: {
        type: Boolean,
        default: false
    },
    courses: [
        {
            courseId: String
        }
    ]
}, {timestamps: true});


// Hash the password before saving the user
userSchema.pre<IUser>("save", async function (next) {
    // Check if the password field has been modified
    if (!this.isModified('password')) {
        return next();
    }
    // Hash the password if it's been modified
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Sign access token
userSchema.methods.SignAccessToken = function () {
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    return sign({id: this._id}, secret || "");
}

//  Sign refresh token
userSchema.methods.SignRefreshToken = function () {
    const secret = process.env.JWT_REFRESH_TOKEN_SECRET;
    return sign({id: this._id}, secret || "");
}

// compare user password

userSchema.methods.comparePassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
}

export const User = model<IUser>('User', userSchema);