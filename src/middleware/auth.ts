import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/index.js";
import { AppError, ERROR_CODES } from "../utils/errors.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized(
        ERROR_CODES.TOKEN_INVALID,
        "Missing or invalid authorization header"
      );
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw AppError.unauthorized(
        ERROR_CODES.TOKEN_INVALID,
        "Missing authorization token"
      );
    }

    let decoded: { userId: string; email: string; name: string };
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string;
        email: string;
        name: string;
      };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized(ERROR_CODES.TOKEN_EXPIRED, "Token has expired");
      }
      throw AppError.unauthorized(ERROR_CODES.TOKEN_INVALID, "Invalid authentication token");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw AppError.unauthorized(
        ERROR_CODES.USER_NOT_FOUND,
        "User account no longer exists"
      );
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
