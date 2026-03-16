import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { startServer } from "./src/config/db.js";
import designRoute from "./src/design/routes/designRoute.js";
import authRoute from "./src/auth/routes/authRoute.js";
import userRoute from "./src/users/routes/userRoute.js";
import orderRoute from "./src/order/routes/orderRoute.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import productRoute from "./src/product/routes/productRoute.js";
import passport from "./src/config/passport.js";
import attachmentRoute from "./src/shared/routes/attachmentRoute.js";
import feedbackRoute from "./src/feedback/routes/feedbackRoute.js";
import customerBriefRoute from "./src/customerBrief/routes/customerBriefRoute.js";
import cors from "cors";
import { Server } from "socket.io";
import { UserRole } from "./src/users/model/userModel.js";
import http from "http";
import Api from "twilio/lib/rest/Api.js";
import notificationRoutes from "./src/notification/routes/notificationRoutes.js";
import discountRoute from './src/discount/routes/discountRoutes.js';
import invoiceRoute from "./src/invoice/routes/invoiceRoute.js";
import paymentRoute from "./src/payments/routes/paymentRoute.js";
import receiptRoute from "./src/shared/routes/receiptRoute.js";
import shippingRoute from "./src/shipping/routes/shippingRoute.js";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// setupAssociations();
startServer().catch((err) => console.log(err));

const app = express();
const server = http.createServer(app);


const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Your frontend URLs
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));


const PORT = process.env.PORT || 8000;
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(passport.initialize());
app.use("/uploads", express.static("uploads"));

// Swagger setup BEFORE other routes
try {
  const swaggerPath = path.join(__dirname, "swagger", "swagger.yaml");
  console.log("Looking for swagger file at:", swaggerPath);

  const swaggerDocument = YAML.load(swaggerPath);

  const swaggerOptions = {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "AMPLE PRINT HUB API Documentation",
  };

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, swaggerOptions),
  );

  console.log("✓ Swagger documentation loaded successfully");
} catch (error) {
  console.error("✗ Error setting up Swagger:", error);
}

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to AMPLE PRINT HUB API",
    documentation: `http://localhost:${PORT}/api-docs`,
  });
});

app.get("/home", (req, res) => {
  res.send("Welcome to the server");
});

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1", productRoute);
app.use("/api/v1/attachments", attachmentRoute);
app.use("/api/v1/design", designRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/feedback", feedbackRoute);
app.use("/api/v1/customer-briefs", customerBriefRoute);
app.use("/api/v1/notifications", notificationRoutes);
app.use('/api/v1/discounts', discountRoute);
app.use("/api/v1/invoices", invoiceRoute);
app.use("/api/v1/payments", paymentRoute);
app.use("/api/v1/receipts", receiptRoute);
app.use("/api/v1/shipping", shippingRoute);

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);
  console.log("   Query params:", socket.handshake.query);

  // Handle joining rooms
  socket.on("joinRoom", (room: string) => {
    socket.join(room);
    console.log(`📡 Socket ${socket.id} joined room: ${room}`);
    
    // Also handle role-based rooms if the room is a role
    if (room === UserRole.SuperAdmin) {
      socket.join("superadmin-room");
      console.log(`${socket.id} also joined superadmin-room`);
    } else if (room === UserRole.Admin) {
      socket.join("admin-room");
      console.log(`${socket.id} also joined admin-room`);
    } else if (room === UserRole.Customer) {
      socket.join("customer-room");
      console.log(`${socket.id} also joined customer-room`);
    }
  });

  // Allow joining user-specific room directly
  const token = socket.handshake.query.token;
  if (token) {
    try {
      // You might want to decode the token here to get the userId
      // For now, we'll assume the frontend will emit joinRoom for user-${userId}
      console.log("Token present in connection");
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  }

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

app.set("io", io);

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
