import {createTransport, Transporter} from "nodemailer";
import {join} from "path";
import {renderFile} from "ejs";
import {smtp_host, smtp_mail, smtp_password, smtp_port, smtp_service} from "../secret/secret";

interface EmailOptions {
    email: string,
    subject: string,
    data: { [key: string]: any }
}

export const sendMail = async (option: EmailOptions) => {
    const transporter: Transporter = createTransport({
        host: smtp_host,
        port: Number(smtp_port || "587"),
        service: smtp_service,
        // secure: false,
        auth: {
            user: smtp_mail,
            pass: smtp_password
        }
    })

    const {data, subject, email} = option
    const templatePath = join(__dirname, "../mails/activationMail.ejs")

    const html = await renderFile(templatePath, {userName: data.name, activationCode: data.activationCode})

    const mailOptions = {
        from: smtp_mail,
        to: email,
        subject,
        html
    }
    await transporter.sendMail(mailOptions)
}

