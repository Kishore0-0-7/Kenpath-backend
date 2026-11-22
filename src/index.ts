import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi.js";
import { env } from "./config/index.js";
import { prisma } from "./config/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import readingRoutes from "./routes/readings.js";
import reportRoutes from "./routes/reports.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps or curl) or matching frontend
      if (!origin || origin === env.FRONTEND_URL || origin.includes("localhost")) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev/testing
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

if (env.NODE_ENV !== "test") {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests, please try again later",
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
  app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", async (_req, res) => {
  let dbStatus = "connected";
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 4000)),
    ]);
  } catch {
    dbStatus = "disconnected";
  }

  res.json({
    status: "ok",
    service: "sweety-backend",
    database: dbStatus,
    timezone: env.APP_TIMEZONE,
    timestamp: new Date().toISOString(),
  });
});

// OpenAPI / Swagger Documentation
app.get("/api/docs/openapi.json", (_req, res) => res.json(openApiSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use("/api/auth", authRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/reports", reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(env.PORT, () => {
    console.log(`🌿 Sweety Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    console.log(`🩺 Health check available at http://localhost:${env.PORT}/health`);
    console.log(`📑 Swagger Docs available at http://localhost:${env.PORT}/api/docs`);
  });
}

export { app };
export default app;
