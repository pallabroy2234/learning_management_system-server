import mongoose, {Document, Schema, ObjectId, model} from "mongoose";
import {IUser} from "./user.model";


interface IComment extends Document {
	// user: object;
	user: IUser;
	question: string;
	questionReplies?: {
		user: IUser;
		answer: string;
	}[];
}

// * review interface
export interface IReview extends Document {
	// user: Object;
	user: IUser;
	rating: number;
	review: string;
	reviewReplies: {
		user: IUser;
		reply: string;
	}[];
	// commentsReplies: IComment[]
}


// link interface
interface ILink extends Document {
	title: string;
	url: string;
}


// course Data
interface ICourseData extends Document {
	title: string;
	videoUrl: string;
	videoDescription: string;
	// videoLength: string;
	videoLength: number;
	videoSection: string;
	videoPlayer: string;
	links: ILink[];
	suggestion: string;
	questions: IComment[];
}


// course interface
export interface ICourse extends Document {
	name: string;
	description: string;
	price: number;
	estimatedPrice?: number;
	thumbnail: {public_id: string, url: string};
	tags: string;
	level: string;
	demoUrl: string;
	benefits: {title: string}[];
	prerequisites: {title: string}[];
	reviews: IReview[];
	courseData: ICourseData[];
	rating?: number;
	purchased?: number;
}


//  review Schema
const reviewSchema = new Schema<IReview>({
	// user: Object,
	user: {
		type: Schema.Types.ObjectId,
		ref: "User"
	},
	rating: {
		type: Number,
		default: 0
	},
	review: String,
	reviewReplies: [
		{
			user: {
				type: Schema.Types.ObjectId,
				ref: "User"
			},
			reply: {
				type: String
			}
		}
	]
});

// link Schema
const linkSchema = new Schema<ILink>({
	// title: String,
	// url: String,
	title: {
		type: String
	},
	url: {
		type: String
	}
});


//  comment Schema

const commentSchema = new Schema<IComment>({
	// user: Object,
	user: {
		type: Schema.Types.ObjectId,
		ref: "User"
	},
	// comment: String,
	question: {
		type: String
	},
	// commentsReplies: [Object]
	questionReplies: [
		{
			user: {
				type: Schema.Types.ObjectId,
				ref: "User"
			},
			answer: {
				type: String
			}
		}
	]
});


// course Data Schema
const courseDataSchema = new Schema<ICourseData>({
	// title: String,
	title: {
		type: String,
		required: [true, "Course Title is required"]
	},
	// description: String,
	videoDescription: {
		type: String,
		required: [true, "Video Description is required"]
	},
	// videoUrl: String,
	videoUrl: {
		type: String,
		required: [true, "Video url is required"]
	},
	// videoThumbnail: Object,
	videoSection: {
		type: String,
		required: [true, "Video section is required"]
	},

	videoLength: {
		type: Number,
		required: [true, "Video length is required"]
	},
	videoPlayer: String,
	links: [linkSchema],
	suggestion: String,
	questions: [commentSchema]
});


// course Schema

const courseSchema = new Schema<ICourse>({
	name: {
		type: String,
		required: [true, "Course name is required"]
	},
	description: {
		type: String,
		required: [true, "Course description is required"]
	},
	price: {
		type: Number,
		required: [true, "Course price is required"]
	},
	estimatedPrice: {
		type: Number,
		default: 0
	},
	thumbnail: {
		public_id: {
			type: String
			// required: [true, "Thumbnail public_id is required"]
		},
		url: {
			type: String
			// required: [true, "Thumbnail url is required"]
		}
	},
	tags: {
		type: String,
		required: [true, "Course tags is required"]
	},
	level: {
		type: String,
		required: [true, "Course level is required"]
	},
	demoUrl: {
		type: String,
		required: [true, "Course demo url is required"]
	},
	// benefits: [{title: String}],
	benefits: [
		{
			title: {
				type: String,
				required: [true, "Course benefit title is required"]
			}
		}
	],
	// prerequisites: [{title: String}],
	prerequisites: [
		{
			title: {
				type: String,
				required: [true, "Course prerequisite title is required"]
			}
		}
	],
	reviews: {
		type: [reviewSchema],
		default: []
	},
	courseData: [courseDataSchema],
	rating: {
		type: Number,
		default: 0
	},
	purchased: {
		type: Number,
		default: 0
	}
}, {timestamps: true});


// * populate user data

courseSchema.pre("find", function(this: mongoose.Query<any, IReview>, next) {
	this.populate({
		path: "reviews.user",
		select: "name email avatar role createdAt updatedAt"
	});
	this.populate({
		path: "reviews.reviewReplies.user",
		select: "name email avatar role createdAt updatedAt"
	});
	this.populate({
		path: "courseData.questions.user",
		select: "name email avatar role createdAt updatedAt"
	});

	this.populate({
		path: "courseData.questions.questionReplies.user",
		select: "name email avatar role createdAt updatedAt"
	});
	next();
});

courseSchema.pre("findOne", function(next) {
	this.populate({
		path: "reviews.user",
		select: "name email avatar role createdAt updatedAt"
	});
	this.populate({
		path: "reviews.reviewReplies.user",
		select: "name email avatar role createdAt updatedAt"
	});
	this.populate({
		path: "courseData.questions.user",
		select: "name email avatar role createdAt updatedAt"
	});
	this.populate({
		path: "courseData.questions.questionReplies.user",
		select: "name email avatar role createdAt updatedAt"
	});
	next();
});

courseSchema.pre("save", function(next) {
	this.populate({
		path: "reviews.user",
		select: "name email avatar createdAt updatedAt"
	});
	this.populate({
		path: "reviews.reviewReplies.user",
		select: "name email avatar role createdAt updatedAt"
	});
	this.populate({
		path: "courseData.questions.user",
		select: "name email avatar role createdAt updatedAt"
	});
	this.populate({
		path: "courseData.questions.questionReplies.user",
		select: "name email avatar role createdAt updatedAt"
	});
	next();
});


export const Course = model<ICourse>("Course", courseSchema);









