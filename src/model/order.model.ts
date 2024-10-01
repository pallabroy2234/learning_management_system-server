import {Schema, ObjectId, model, Model ,Document} from "mongoose";


// * interface for order

export interface IOrder extends Document{
    courseId:ObjectId,
	userId:ObjectId,
	payment_info:Object,
}



const orderSchema = new Schema<IOrder>({
	courseId:{
		type:Schema.Types.ObjectId,
		ref:"Course",
		required:[true,"Course id is required"]
	},
	userId:{
		type:Schema.Types.ObjectId,
		ref:"User",
		required:[true,"User id is required"]
	},
	payment_info:{
          type:Object,

	},
},{timestamps:true})


export const  Order:Model<IOrder> = model("Order", orderSchema)