import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  APP_TIMEZONE: z.string().default("Asia/Kolkata"),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid configuration");
  }

  let dbUrl = result.data.DATABASE_URL;
  if (dbUrl.includes("-pooler") && !dbUrl.includes("pgbouncer=true")) {
    const separator = dbUrl.includes("?") ? "&" : "?";
    dbUrl = `${dbUrl}${separator}pgbouncer=true`;
  }
  if (!dbUrl.includes("connect_timeout")) {
    const separator = dbUrl.includes("?") ? "&" : "?";
    dbUrl = `${dbUrl}${separator}connect_timeout=15`;
  }
  if (!dbUrl.includes("pool_timeout")) {
    const separator = dbUrl.includes("?") ? "&" : "?";
    dbUrl = `${dbUrl}${separator}pool_timeout=0`;
  }

  return {
    ...result.data,
    DATABASE_URL: dbUrl,
  };
};

export const env = parseEnv();
