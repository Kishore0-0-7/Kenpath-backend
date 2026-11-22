import { Response, NextFunction } from "express";
import { reportService } from "../services/reports.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import type { ReportQuery } from "../validators/schemas.js";

export const getDailyReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date } = req.query as unknown as ReportQuery;
    const report = await reportService.getDailyReport(req.user!.id, date);
    res.json(report);
  } catch (error) {
    next(error);
  }
};

export const getMonthToDateReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date } = req.query as unknown as ReportQuery;
    const report = await reportService.getMonthToDateReport(
      req.user!.id,
      date
    );
    res.json(report);
  } catch (error) {
    next(error);
  }
};

export const getMonthlyReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date } = req.query as unknown as ReportQuery;
    const report = await reportService.getMonthlyReport(
      req.user!.id,
      date
    );
    res.json(report);
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await reportService.getDashboardStats(req.user!.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const reportController = {
  getDailyReport,
  getMonthToDateReport,
  getMonthlyReport,
  getDashboardStats,
};
