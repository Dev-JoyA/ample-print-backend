import express, { NextFunction, Request, Response } from "express";
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
import receiptRoute from "./src/shared/routes/receiptRoute.js";
import feedbackRoute from "./src/feedback/routes/feedbackRoute.js";
import customerBriefRoute from "./src/customerBrief/routes/customerBriefRoute.js";
import cors from "cors";
import { Server } from "socket.io";
import { UserRole } from "./src/users/model/userModel.js";
import http from "http";
import notificationRoutes from "./src/notification/routes/notificationRoutes.js";
import discountRoute from "./src/discount/routes/discountRoutes.js";
import invoiceRoute from "./src/invoice/routes/invoiceRoute.js";
import paymentRoute from "./src/payments/routes/paymentRoute.js";
import shippingRoute from "./src/shipping/routes/shippingRoute.js";
import { verifyToken } from "./src/utils/auth.js";
import bankAccountRoute from "./src/bankAccount/routes/bankAccountRoute.js";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import compression from "compression";
import cookieParser from "cookie-parser";
import { csrfProtection } from "./src/middleware/csrfMiddleware.js";
import { securityMiddleware } from "./src/middleware/securityMiddleware.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

startServer().catch((err) => console.log(err));

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4001;

// const allowedOrigins =
//   process.env.NODE_ENV === "production"
//     ? [process.env.FRONTEND_URL!]
//     : [
//         "http://localhost:3000",
//         "http://localhost:3001",
//         "http://localhost:4001",
//       ];

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ([
        "https://ample-print-frontend.vercel.app",
        process.env.FRONTEND_URL,
      ].filter(Boolean) as string[])
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:4001",
      ];

console.log("Allowed origins:", allowedOrigins);
console.log("FRONTEND_URL env:", process.env.FRONTEND_URL);
console.log("NODE_ENV:", process.env.NODE_ENV);

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(compression());
app.use(cookieParser(process.env.COOKIE_SECRET));

// ==================== RATE LIMITING (after CORS) ====================
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Too many requests from this IP, please try again later.",
//   standardHeaders: true,
//   legacyHeaders: false,
// });

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = req.rateLimit?.resetTime;
    const now = new Date();
    const diffMs = resetTime
      ? resetTime.getTime() - now.getTime()
      : 60 * 60 * 1000;
    const diffMins = Math.ceil(Math.max(diffMs, 0) / 1000 / 60);

    res.status(429).json({
      success: false,
      message: `Too many login attempts. Please wait ${diffMins} minute${diffMins === 1 ? "" : "s"} and try again.`,
    });
  },
});

// app.use("/api", limiter);
app.use("/api/v1/auth", authLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(mongoSanitize());
app.use(xss());
app.use(
  hpp({
    whitelist: [
      "status",
      "paymentStatus",
      "sort",
      "page",
      "limit",
      "price",
      "quantity",
    ],
  }),
);

app.use(securityMiddleware);

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") return next();
  csrfProtection(req, res, next);
});

app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=31536000");
    },
  }),
);

app.use(passport.initialize());

try {
  const swaggerPath = path.join(__dirname, "swagger", "swagger.yaml");
  const swaggerDocument = YAML.load(swaggerPath);

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_SWAGGER === "true"
  ) {
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, {
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "AMPLE PRINT HUB API Documentation",
        swaggerOptions: { persistAuthorization: true },
      }),
    );
    console.log("✓ Swagger documentation loaded successfully");
  }
} catch (error) {
  console.error("✗ Error setting up Swagger:", error);
}

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to AMPLE PRINT HUB API",
    documentation:
      process.env.NODE_ENV === "production"
        ? undefined
        : `http://localhost:${PORT}/api-docs`,
  });
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
app.use("/api/v1/discounts", discountRoute);
app.use("/api/v1/invoices", invoiceRoute);
app.use("/api/v1/payments", paymentRoute);
app.use("/api/v1/receipts", receiptRoute);
app.use("/api/v1/shipping", shippingRoute);
app.use("/api/v1/bank-accounts", bankAccountRoute);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = await verifyToken(token as string);
    if (!decoded) {
      return next(new Error("Invalid token"));
    }

    socket.data.user = decoded;
    next();
  } catch {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);
  const user = socket.data.user;

  if (user) {
    socket.join(`user-${user.userId}`);

    if (user.role === UserRole.SuperAdmin) {
      socket.join("superadmin-room");
    } else if (user.role === UserRole.Admin) {
      socket.join("admin-room");
    } else if (user.role === UserRole.Customer) {
      socket.join("customer-room");
    }
  }

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

app.set("io", io);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err: any, req: Request, res: Response) => {
  console.error("❌ Error:", err);

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(err.status || 500).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV ?? "development"}`);
  console.log(`🔒 Security features enabled`);
});
