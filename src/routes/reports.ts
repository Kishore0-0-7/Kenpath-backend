import { Router } from "express";
import { reportController } from "../controllers/reports.js";
import { authenticate } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { ReportQuerySchema } from "../validators/schemas.js";

const router = Router();

router.use(authenticate);

router.get("/daily", validateQuery(ReportQuerySchema), reportController.getDailyReport);
router.get("/month-to-date", validateQuery(ReportQuerySchema), reportController.getMonthToDateReport);
router.get("/monthly", validateQuery(ReportQuerySchema), reportController.getMonthlyReport);
router.get("/dashboard", reportController.getDashboardStats);

export default router;
