import express, {Request, Response} from "express";
import dotenv from "dotenv";
import {startServer} from "./src/config/db.js"
import designRoute from "./src/routes/designRoute.js";
import authRoute from "./src/routes/authRoute.js";
import userRoute from "./src/routes/userRoute.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import productRoute from "./src/routes/productRoute.js";
import passport from "./src/config/passport.js";
import attachmentRoute from "./src/routes/attachmentRoute.js"
import cors from "cors";
import { Server } from "socket.io";
import {User, UserRole} from "./src/models/userModel.js"
import http from "http";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// setupAssociations();
startServer().catch((err:any) => console.log(err));


const app = express();
const server = http.createServer(app);
app.use(cors())

const PORT = process.env.PORT || 8000;
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(passport.initialize());


// Swagger setup BEFORE other routes
try {
  const swaggerPath = path.join(__dirname, 'src', 'swagger', 'swagger.yaml');
  console.log('Looking for swagger file at:', swaggerPath);

  const swaggerDocument = YAML.load(swaggerPath);

  const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AMPLE PRINT HUB API Documentation',
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

  console.log('✓ Swagger documentation loaded successfully');
} catch (error) {
  console.error('✗ Error setting up Swagger:', error);
}

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to AMPLE PRINT HUB API',
    documentation: `http://localhost:${PORT}/api-docs`,
  });
});

app.get("/home", (req, res) => {
    res.send("Welcome to the server");
})

app.use("/api/v1/auth", authRoute)
app.use("/api/v1/users", userRoute)
app.use("/api/v1", productRoute)
app.use("/api/v1/attachments", attachmentRoute)
app.use("/api/v1/design", designRoute)


io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("joinRoom", (role: string) => {
    if (role === UserRole.SuperAdmin) {
      socket.join("superadmin-room");
      console.log(`${socket.id} joined superadmin-room`);
    }
    if (role === UserRole.Admin) {
      socket.join("admin-room");
      console.log(`${socket.id} joined admin-room`);
    }
    if (role === UserRole.Customer) {
      socket.join("customer-room");
      console.log(`${socket.id} joined customer-room`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});



app.set("io", io);

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})