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

interface ILayout extends Document {
	type: string;
	faq: IFaqItem[];
	categories: ICategories[];
	bannerImages: {
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
	title: {type: String}
});


const bannerImageSchema = new Schema<IBannerImage>({
	public_id: {type: String, required: [true, "Banner public id is required"]},
	url: {type: String, required: [true, "Banner url is required"]}
});


const layoutSchema = new Schema<ILayout>({
	type: {type: String, required: [true, "Layout type is required"]},
	faq: [faqSchema],
	categories: [categoriesSchema],
	bannerImages: {
		image: bannerImageSchema,
		title: {type: String, required: [true, "Banner title is required"]},
		subtitle: {type: String, required: [true, "Banner subtitle is required"]}
	}
}, {timestamps: true});


export const Layout = model<ILayout>("Layout", layoutSchema);