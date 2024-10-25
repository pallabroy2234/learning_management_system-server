import {Document, model, Schema} from "mongoose";


interface IFaqItem extends Document {
	question: string;
	answer: string;
}

interface ICategories extends Document {
	title: string;
}


interface IBannerImage extends Document {
	public_id: string;
	url: string;
}

export interface ILayout extends Document {
	type: "categories" | "banner" | "faq";
	faq: IFaqItem[];
	categories: ICategories[];
	bannerImage: {
		image: IBannerImage;
		title: string;
		subtitle: string;
	};
}


// * Faq schema to store faq data


const faqSchema = new Schema<IFaqItem>({
	question: {type: String},
	answer: {type: String}
});


const categoriesSchema = new Schema<ICategories>({
	title: {type: String, unique: true}
});


const bannerImageSchema = new Schema<IBannerImage>({
	public_id: {type: String, required: [true, "Banner public id is required"]},
	url: {type: String, required: [true, "Banner url is required"]}
});


const layoutSchema = new Schema<ILayout>({
	type: {
		type: String,
		enum: ["categories", "banner", "faq"],
		required: [true, "Type is required"]
	},
	faq: [faqSchema],
	categories: [categoriesSchema],
	bannerImage: {
		image: bannerImageSchema,
		title: String,
		subtitle: String
	}
}, {timestamps: true});


export const Layout = model<ILayout>("Layout", layoutSchema);