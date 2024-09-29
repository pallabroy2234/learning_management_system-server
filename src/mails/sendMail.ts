import {createTransport, Transporter} from "nodemailer";
import {join} from "path";
import {renderFile} from "ejs";
import {smtp_host, smtp_mail, smtp_password, smtp_port, smtp_service} from "../secret/secret";



interface EmailOptions {
	email: string;
	subject: string;
	data: { [key: string]: any };
	template: string;
}


export const sendMail = async (option: EmailOptions) => {
	const transporter: Transporter = createTransport({
		host: smtp_host,
		port: Number(smtp_port || "587"),
		service: smtp_service,
		auth: {
			user: smtp_mail,
			pass: smtp_password
		}
	});

	// Destructure the email options
	const { data, subject, email, template } = option;

	// Dynamically set the path to the correct EJS template
	const templatePath = join(__dirname, `./${template}.ejs`);

	// Render the EJS template
	const html = await renderFile(templatePath, data);

	const mailOptions = {
		from: smtp_mail,
		to: email,
		subject,
		html
	};

	// Send the email
	await transporter.sendMail(mailOptions);
};


// "dev": "concurrently  \"tsc -w\" \"nodemon dist/server.js\"",
// 	"build": "tsc",
// 	"vercel-build": "echo Running build command from Vercel",
// 	"watch": "tsc -w"