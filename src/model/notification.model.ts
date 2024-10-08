import {Schema, ObjectId, model, Model, Document, Types} from "mongoose";

export interface INotification extends Document {
	_id: Types.ObjectId,
	userId: Types.ObjectId,
	title: string,
	message: string,
	status: "read" | "unread",
	createdAt: Date,
	updatedAt: Date
}


/**
 * Notification schema to store notification data
 * This schema defines the structure of the notification documents in the database.
 * It includes fields for the title, message, status, and userId, along with timestamps.
 */


const notificationSchema = new Schema<INotification>({
	title: {
		type: String,
		required: [true, "Title is required"]
	},
	userId: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: [true, "User id is required"]
	},
	message: {
		type: String,
		required: [true, "Message is required"]
	},
	status: {
		type: String,
		enum: ["read", "unread"],
		default: "unread"
	}
}, {timestamps: true});


export const Notification: Model<INotification> = model("Notification", notificationSchema);


