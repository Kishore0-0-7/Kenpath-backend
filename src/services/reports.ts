import { prisma } from "../config/prisma.js";
import { AppError, ERROR_CODES } from "../utils/errors.js";
import {
  isFutureDate,
  parseDateForDb,
  formatDateFromDb,
  formatReadingResponse,
  getKolkataTodayString,
} from "./readings.js";

interface ReportSummary {
  highest: number | null;
  lowest: number | null;
  average: number | null;
  count: number;
}

export const getDailyReport = async (userId: string, date: string) => {
  if (isFutureDate(date)) {
    throw AppError.badRequest(
      ERROR_CODES.FUTURE_DATE,
      "Date cannot be in the future."
    );
  }

  const dbDate = parseDateForDb(date);

  // PostgreSQL aggregate for summary
  const [aggregate, readings] = await Promise.all([
    prisma.reading.aggregate({
      where: {
        userId,
        readingDate: dbDate,
      },
      _max: { glucoseValue: true },
      _min: { glucoseValue: true },
      _avg: { glucoseValue: true },
      _count: { glucoseValue: true },
    }),
    prisma.reading.findMany({
      where: {
        userId,
        readingDate: dbDate,
      },
      orderBy: { timeSlot: "asc" },
    }),
  ]);

  const count = aggregate._count.glucoseValue;
  const summary: ReportSummary = {
    highest: count > 0 ? aggregate._max.glucoseValue : null,
    lowest: count > 0 ? aggregate._min.glucoseValue : null,
    average:
      count > 0 && aggregate._avg.glucoseValue !== null
        ? Math.round(aggregate._avg.glucoseValue * 10) / 10
        : null,
    count,
  };

  return {
    date,
    readings: readings.map(formatReadingResponse),
    summary,
  };
};

export const getMonthToDateReport = async (userId: string, date: string) => {
  if (isFutureDate(date)) {
    throw AppError.badRequest(
      ERROR_CODES.FUTURE_DATE,
      "Date cannot be in the future."
    );
  }

  const [yearStr, monthStr] = date.split("-");
  const startDateStr = `${yearStr}-${monthStr}-01`;
  const endDateStr = date;

  const startDbDate = parseDateForDb(startDateStr);
  const endDbDate = parseDateForDb(endDateStr);

  const [aggregate, readings] = await Promise.all([
    prisma.reading.aggregate({
      where: {
        userId,
        readingDate: {
          gte: startDbDate,
          lte: endDbDate,
        },
      },
      _max: { glucoseValue: true },
      _min: { glucoseValue: true },
      _avg: { glucoseValue: true },
      _count: { glucoseValue: true },
    }),
    prisma.reading.findMany({
      where: {
        userId,
        readingDate: {
          gte: startDbDate,
          lte: endDbDate,
        },
      },
      orderBy: [{ readingDate: "asc" }, { timeSlot: "asc" }],
    }),
  ]);

  const count = aggregate._count.glucoseValue;
  const summary: ReportSummary = {
    highest: count > 0 ? aggregate._max.glucoseValue : null,
    lowest: count > 0 ? aggregate._min.glucoseValue : null,
    average:
      count > 0 && aggregate._avg.glucoseValue !== null
        ? Math.round(aggregate._avg.glucoseValue * 10) / 10
        : null,
    count,
  };

  // Group by date for daily breakdown
  const dailyMap = new Map<string, any[]>();
  readings.forEach((r) => {
    const dStr = formatDateFromDb(r.readingDate);
    if (!dailyMap.has(dStr)) {
      dailyMap.set(dStr, []);
    }
    dailyMap.get(dStr)!.push(formatReadingResponse(r));
  });

  const dailyBreakdown = Array.from(dailyMap.entries()).map(
    ([dayDate, dayReadings]) => {
      const values = dayReadings.map((r) => r.glucoseValue);
      const dayCount = values.length;
      const dayHighest = Math.max(...values);
      const dayLowest = Math.min(...values);
      const dayAvg =
        Math.round((values.reduce((a, b) => a + b, 0) / dayCount) * 10) / 10;

      return {
        date: dayDate,
        readings: dayReadings,
        summary: {
          highest: dayHighest,
          lowest: dayLowest,
          average: dayAvg,
          count: dayCount,
        },
      };
    }
  );

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    summary,
    dailyBreakdown,
  };
};

export const getMonthlyReport = async (userId: string, date: string) => {
  if (isFutureDate(date)) {
    throw AppError.badRequest(
      ERROR_CODES.FUTURE_DATE,
      "Date cannot be in the future."
    );
  }

  const [yearStr, monthStr] = date.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = year - 1;
  }

  const prevMonthStr = String(prevMonth).padStart(2, "0");
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const lastDayStr = String(lastDay).padStart(2, "0");

  const startDateStr = `${prevYear}-${prevMonthStr}-01`;
  const endDateStr = `${prevYear}-${prevMonthStr}-${lastDayStr}`;

  const startDbDate = parseDateForDb(startDateStr);
  const endDbDate = parseDateForDb(endDateStr);

  const [aggregate, readings] = await Promise.all([
    prisma.reading.aggregate({
      where: {
        userId,
        readingDate: {
          gte: startDbDate,
          lte: endDbDate,
        },
      },
      _max: { glucoseValue: true },
      _min: { glucoseValue: true },
      _avg: { glucoseValue: true },
      _count: { glucoseValue: true },
    }),
    prisma.reading.findMany({
      where: {
        userId,
        readingDate: {
          gte: startDbDate,
          lte: endDbDate,
        },
      },
      orderBy: [{ readingDate: "asc" }, { timeSlot: "asc" }],
    }),
  ]);

  const count = aggregate._count.glucoseValue;
  const summary: ReportSummary = {
    highest: count > 0 ? aggregate._max.glucoseValue : null,
    lowest: count > 0 ? aggregate._min.glucoseValue : null,
    average:
      count > 0 && aggregate._avg.glucoseValue !== null
        ? Math.round(aggregate._avg.glucoseValue * 10) / 10
        : null,
    count,
  };

  const dailyMap = new Map<string, any[]>();
  readings.forEach((r) => {
    const dStr = formatDateFromDb(r.readingDate);
    if (!dailyMap.has(dStr)) {
      dailyMap.set(dStr, []);
    }
    dailyMap.get(dStr)!.push(formatReadingResponse(r));
  });

  const dailyBreakdown = Array.from(dailyMap.entries()).map(
    ([dayDate, dayReadings]) => {
      const values = dayReadings.map((r) => r.glucoseValue);
      const dayCount = values.length;
      const dayHighest = Math.max(...values);
      const dayLowest = Math.min(...values);
      const dayAvg =
        Math.round((values.reduce((a, b) => a + b, 0) / dayCount) * 10) / 10;

      return {
        date: dayDate,
        readings: dayReadings,
        summary: {
          highest: dayHighest,
          lowest: dayLowest,
          average: dayAvg,
          count: dayCount,
        },
      };
    }
  );

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    summary,
    dailyBreakdown,
  };
};

export const getDashboardStats = async (userId: string) => {
  const todayStr = getKolkataTodayString();
  const dbToday = parseDateForDb(todayStr);

  const [aggregate, readings] = await Promise.all([
    prisma.reading.aggregate({
      where: {
        userId,
        readingDate: dbToday,
      },
      _max: { glucoseValue: true },
      _min: { glucoseValue: true },
      _avg: { glucoseValue: true },
      _count: { glucoseValue: true },
    }),
    prisma.reading.findMany({
      where: {
        userId,
        readingDate: dbToday,
      },
      orderBy: { timeSlot: "asc" },
    }),
  ]);

  const count = aggregate._count.glucoseValue;
  const summary: ReportSummary = {
    highest: count > 0 ? aggregate._max.glucoseValue : null,
    lowest: count > 0 ? aggregate._min.glucoseValue : null,
    average:
      count > 0 && aggregate._avg.glucoseValue !== null
        ? Math.round(aggregate._avg.glucoseValue * 10) / 10
        : null,
    count,
  };

  return {
    date: todayStr,
    summary,
    readings: readings.map(formatReadingResponse),
  };
};

export const reportService = {
  getDailyReport,
  getMonthToDateReport,
  getMonthlyReport,
  getDashboardStats,
};
