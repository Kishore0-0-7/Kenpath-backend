import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, ERROR_CODES } from "../utils/errors.js";

/**
 * Checks if an error represents a database connection or network failure.
 */
function isDatabaseConnectivityError(err: unknown): boolean {
  if (!err) return false;

  // 1. Prisma Client Initialization Error (e.g. host unreachable, connection refused, offline)
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  // 2. Prisma Known Request Error connection codes
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const connectionCodes = ["P1000", "P1001", "P1002", "P1003", "P1008", "P1011", "P1017", "P2024"];
    if (connectionCodes.includes(err.code)) {
      return true;
    }
  }

  // 3. Prisma Rust Panic / Unknown Request connection drop
  if (
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return true;
  }

  // 4. Message or code inspection for standard Node / OS network drops
  if (typeof err === "object" && err !== null) {
    const errorObj = err as Record<string, unknown>;
    const code = String(errorObj.code || "");
    const msg = String(errorObj.message || "");

    const networkCodes = ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH", "ECONNRESET", "EPIPE"];
    if (networkCodes.includes(code)) {
      return true;
    }

    if (
      msg.includes("Can't reach database server") ||
      msg.includes("connect ETIMEDOUT") ||
      msg.includes("Connection terminated unexpectedly") ||
      msg.includes("timed out fetching a new connection")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Strips internal stack traces, file paths, and database credentials
 * to prevent leaking server-side code or infrastructure to clients.
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return "An unexpected server error occurred. Please try again.";

  // If message contains code references, file paths, or internal hostnames, do not leak it
  if (
    msg.includes("at ") ||
    msg.includes("/mnt/") ||
    msg.includes("/home/") ||
    msg.includes("node_modules") ||
    msg.includes("prisma") ||
    msg.includes("Prisma") ||
    msg.includes(".tech") ||
    msg.includes("Invalid `prisma.") ||
    msg.includes("SELECT ") ||
    msg.includes("INSERT ") ||
    msg.includes("UPDATE ") ||
    msg.includes("DELETE ")
  ) {
    return "An unexpected server error occurred. Please try again.";
  }

  // Cap message length to prevent oversized payloads
  if (msg.length > 200) {
    return "An unexpected server error occurred. Please try again.";
  }

  return msg;
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Handled Application Errors (trusted status codes & safe messages)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: sanitizeErrorMessage(err.message),
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 2. Request Validation Errors (Zod)
  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    err.errors.forEach((e) => {
      const field = e.path.join(".") || "value";
      details[field] = e.message;
    });

    const primaryMessage = err.errors[0]?.message || "Validation failed";

    res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: primaryMessage,
        details,
      },
    });
    return;
  }

  // 3. Database Connectivity & Network Failures (Aggressive catch for offline / DB down)
  if (isDatabaseConnectivityError(err)) {
    console.warn("⚠️ [Database Connectivity Failure]: Cloud database is currently unreachable (offline or network timeout).");
    res.status(503).json({
      error: {
        code: ERROR_CODES.DATABASE_UNAVAILABLE,
        message: "Database service is temporarily unreachable. Please check your internet connection.",
      },
    });
    return;
  }

  // 4. Known Prisma Query Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[]) || [];
      if (target.includes("email")) {
        res.status(409).json({
          error: {
            code: ERROR_CODES.USER_EXISTS,
            message: "An account with this email already exists",
          },
        });
        return;
      }
      res.status(409).json({
        error: {
          code: ERROR_CODES.CONFLICT,
          message: "A record with these unique details already exists",
        },
      });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Record not found",
        },
      });
      return;
    }
  }

  // 5. Unhandled Server Errors (Safely logged on server, sanitized for client)
  console.error("❌ [Unhandled Server Error]:", err.name || "Error", err.message?.slice(0, 150));

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "An unexpected server error occurred. Please try again.",
    },
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested route does not exist",
    },
  });
};
