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
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const emails = async (to: string, subject: string, header: string, name: string, bodyMessage: string, linkUrl = "https://www.yourbusinesswebsite.com") => {
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

// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';
// dotenv.config();

// async function sendEmail() {
//   const transporter = nodemailer.createTransport({
//     host: 'localhost',
//     port: 587, // Use STARTTLS
//     secure: false,
//     service: 'gmail', // Use STARTTLS
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//     tls: {
//       minVersion: 'TLSv1.2',
//       ciphers: 'HIGH:!SSLv3',
//     },
//     debug: true,
//     pool: true, // Enable connection pooling
//     maxConnections: 5, // Limit concurrent connections
//     maxMessages: 100,
//   });

//   try {
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: 'joy.graces13@gmail.com',
//       subject: 'Test Email',
//       text: 'This is a test email.',
//     });
//     console.log('Email sent successfully');
//   } catch (error) {
//     console.error('Error sending email:', error);
//   }
// }

// sendEmail();