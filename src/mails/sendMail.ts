import {createTransport, Transporter} from "nodemailer";
import {join} from "path";
import {renderFile} from "ejs";
import * as dotenv from "dotenv";

dotenv.config();

interface EmailOptions {
    email: string,
    subject: string,
    template: string,
    data: { [key: string]: any }
}


export const sendMail = async (option: EmailOptions) => {
    const transporter: Transporter = createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || "587"),
        service: process.env.SMTP_SERVICE,
        // secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    })

    const {data, subject, template, email} = option
    const templatePath = join(__dirname, `../mails`, template)

    const html = await renderFile(templatePath, {userName: data.name, activationCode: data.activationCode})
    const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: email,
        subject,
        html
    }
    await transporter.sendMail(mailOptions)
}

