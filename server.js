import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/postgresDb.js"
import authRoute from "./routes/authRoute.js";
import uploadRoute from "./routes/uploadRoute.js";
import contentRoute from "./routes/contentRoute.js";
import passport from "./middleware/passport.js";
import { setupAssociations } from "./models/associations.js"


dotenv.config();

setupAssociations();

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

app.use("/auth", authRoute)
app.use("/upload", uploadRoute)
app.use("/content", contentRoute)


app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})