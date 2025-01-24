import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: "joy.gold13@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

const emails = async(to, subject, text, html) => {
   try{
    const info = await transporter.sendMail({
        from: '"AMPLE PRINTHUB" <joy.graces13@gmail.com>', // sender address
        to , 
        subject ,  
        text
         
      });
   }catch(error){
    console.log(error, "error sending email")
   }

   console.log("email successfully sent", to, " ", text)
}

export default emails


