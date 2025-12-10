import dotenv from "dotenv";
import https from "https";
dotenv.config();

export const initializePayment = (amount, email) => {
  try {
    const params = JSON.stringify({
      email: email,
      amount: amount,
    });

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: "/transaction/initialize",
      method: "POST",
      headers: {
        Authorization: process.env.PAYSTACK_SECRETKEY,
        "Content-Type": "application/json",
      },
    };

    const req = https
      .request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log(JSON.parse(data));
        });
      })
      .on("error", (error) => {
        console.error(error);
      });

    req.write(params);
    req.end();
  } catch (error) {
    throw new error(`Cannot initialize transaction ${error}`);
  }
};

export const verifyPayment = (reference) => {
  try {
    const https = require("https");

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: `/transaction/verify/:${reference}`,
      method: "GET",
      headers: {
        Authorization: process.env.PAYSTACK_SECRETKEY,
      },
    };

    https
      .request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log(JSON.parse(data));
        });
      })
      .on("error", (error) => {
        console.error(error);
      });
  } catch (error) {
    throw new error(`Cannot verify transaction ${error}`);
  }
};
