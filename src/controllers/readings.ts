import { Response, NextFunction } from "express";
import { readingService } from "../services/readings.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import type {
  CreateReadingInput,
  UpdateReadingInput,
  ReadingQuery,
} from "../validators/schemas.js";

export const createReading = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reading = await readingService.createReading(
      req.user!.id,
      req.body as CreateReadingInput
    );
    res.status(201).json({ reading });
  } catch (error) {
    next(error);
  }
};

export const getReadings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await readingService.getReadings(
      req.user!.id,
      req.query as unknown as ReadingQuery
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getReadingById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reading = await readingService.getReadingById(
      req.user!.id,
      req.params.id as string
    );
    res.json({ reading });
  } catch (error) {
    next(error);
  }
};

export const updateReading = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reading = await readingService.updateReading(
      req.user!.id,
      req.params.id as string,
      req.body as UpdateReadingInput
    );
    res.json({ reading });
  } catch (error) {
    next(error);
  }
};

export const deleteReading = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await readingService.deleteReading(
      req.user!.id,
      req.params.id as string
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const readingController = {
  createReading,
  getReadings,
  getReadingById,
  updateReading,
  deleteReading,
};
