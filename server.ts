import express from "express";
import dotenv from "dotenv";
import {startServer} from "./src/config/db.js"
// import authRoute from "./src/routes/authRoute.js";
// import uploadRoute from "./src/routes/uploadRoute.js";
// import contentRoute from "./src/routes/contentRoute.js";
// import passport from "./src/config/passport.js";
import cors from "cors";
// import { setupAssociations } from "./src/models/associations.js"



dotenv.config();

// setupAssociations();
startServer().catch((err:any) => console.log(err));


const app = express();
app.use(cors())
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({extended : true}));
// app.use(passport.initialize());

// app.use(passport.initialize());
app.get("/home", (req, res) => {
    res.send("Welcome to the server");
})

// app.use("/auth", authRoute)
// app.use("/upload", uploadRoute)
// app.use("/content", contentRoute)


app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})