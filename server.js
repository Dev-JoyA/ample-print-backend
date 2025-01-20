import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/postgresDb.js"
import connectDB from "./config/mongoDB.js"; 
import router from "./routes/authRoute.js"
import passport from "./middleware/passport.js";


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

app.use(express.json());
app.use(express.urlencoded({extended : true}));

app.use(passport.initialize());

app.use("/auth", router)

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})