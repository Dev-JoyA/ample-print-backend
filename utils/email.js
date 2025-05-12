import nodemailer from "nodemailer";
import dotenv from "dotenv";
import ejs from "ejs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const emails = async (to, subject, header, name, bodyMessage, linkUrl = "https://www.yourbusinesswebsite.com") => {
  try {
    const templatePath = path.resolve(projectRoot, "src/html/emailTemplate.ejs");
    const template = await fs.readFile(templatePath, "utf-8");

    // Render the EJS template with dynamic data
    const html = await ejs.render(template, {
      name,
      header,
      bodyMessage,
      linkUrl
    });

    // Send the email
    const info = await transporter.sendMail({
      from: `"AMPLE PRINTHUB" <${process.env.EMAIL_USER}>`,
      to,
      subject ,
      html,
      attachments: [{
        filename: 'ample_logo.png',
        path: 'public/images/ample_logo.png',
        cid: 'ample_logo' // Reference in HTML: <img src="cid:ample_logo">
      }]
    });

    console.log("Email successfully sent to", to);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export default emails;