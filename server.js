import express from "express";
import dotenv from "dotenv";
import sequelize from "./config.js/postgresDb.js"
import connectDB from "./config.js/mongoDB.js"; 

dotenv.config();

connectDB();

try {
    await sequelize.authenticate();
    console.log('Postgress connected successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }

const app = express();
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})