import { Router } from "express";
import { readingController } from "../controllers/readings.js";
import { authenticate } from "../middleware/auth.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  CreateReadingSchema,
  UpdateReadingSchema,
  ReadingParamsSchema,
  ReadingQuerySchema,
} from "../validators/schemas.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  validateBody(CreateReadingSchema),
  readingController.createReading
);

router.get(
  "/",
  validateQuery(ReadingQuerySchema),
  readingController.getReadings
);

router.get(
  "/:id",
  validateParams(ReadingParamsSchema),
  readingController.getReadingById
);

router.put(
  "/:id",
  validateParams(ReadingParamsSchema),
  validateBody(UpdateReadingSchema),
  readingController.updateReading
);

router.delete(
  "/:id",
  validateParams(ReadingParamsSchema),
  readingController.deleteReading
);

export default router;
