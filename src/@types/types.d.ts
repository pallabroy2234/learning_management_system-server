import {IUser} from "../model/user.model";

declare global {
	namespace Express {
		interface Request {
			user?: IUser;
			_id?: string;
			role?: string;
		}
	}
}

export interface IRegistrationBody {
	name: string;
	email: string;
	password: string;
	avatar?: string;
}

export interface IActivationRequest {
	activation_token: string;
	activation_code: string;
}

export interface ILoginRequest {
	email: string;
	password: string;
}

export interface IUpdateUserInfo {
	name?: string;
	email?: string;
}

export interface IUpdatePassword {
	oldPassword: string;
	newPassword: string;
}

export interface ICreatePassword {
	newPassword: string;
	confirmPassword: string;
}

export interface IAddQuestionData {
	question: string;
	courseId: string;
	contentId: string;
}


export interface IQuestionReply{
	answer: string;
	courseId: string;
	contentId: string;
	questionId: string;
}

export interface IAddReview{
	review: string;
	rating: number;
}

export interface IReviewReply{
	courseId: string;
	reviewId: string;
	reply:string;
}