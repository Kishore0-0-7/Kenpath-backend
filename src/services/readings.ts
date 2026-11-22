import { prisma } from "../config/prisma.js";
import { AppError, ERROR_CODES } from "../utils/errors.js";
import {
  TIME_SLOT_DISPLAY_NAMES,
  type CreateReadingInput,
  type UpdateReadingInput,
  type TimeSlot,
} from "../validators/schemas.js";

export const getKolkataTodayString = (): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // Formats as YYYY-MM-DD
};

export const isFutureDate = (dateStr: string): boolean => {
  const today = getKolkataTodayString();
  return dateStr > today;
};

export const parseDateForDb = (dateStr: string): Date => {
  return new Date(`${dateStr}T00:00:00.000Z`);
};

export const formatDateFromDb = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const formatReadingResponse = (reading: any) => ({
  id: reading.id,
  userId: reading.userId,
  readingDate: formatDateFromDb(reading.readingDate),
  timeSlot: reading.timeSlot as TimeSlot,
  glucoseValue: reading.glucoseValue,
  createdAt: reading.createdAt.toISOString(),
  updatedAt: reading.updatedAt.toISOString(),
});

export const createReading = async (
  userId: string,
  input: CreateReadingInput
) => {
  if (isFutureDate(input.readingDate)) {
    throw AppError.badRequest(
      ERROR_CODES.FUTURE_DATE,
      "Date cannot be in the future."
    );
  }

  const dbDate = parseDateForDb(input.readingDate);

  // Check duplicate slot first
  const existingSlot = await prisma.reading.findFirst({
    where: {
      userId,
      readingDate: dbDate,
      timeSlot: input.timeSlot,
    },
  });

  if (existingSlot) {
    const slotName = TIME_SLOT_DISPLAY_NAMES[input.timeSlot];
    throw AppError.conflict(
      ERROR_CODES.DUPLICATE_SLOT,
      `You already have an ${slotName} reading for this date.`
    );
  }

  // Check 4-reading limit per day
  const dailyCount = await prisma.reading.count({
    where: {
      userId,
      readingDate: dbDate,
    },
  });

  if (dailyCount >= 4) {
    throw AppError.badRequest(
      ERROR_CODES.MAX_DAILY_READINGS,
      "You can add only 4 readings per day."
    );
  }

  try {
    const reading = await prisma.reading.create({
      data: {
        userId,
        readingDate: dbDate,
        timeSlot: input.timeSlot,
        glucoseValue: input.glucoseValue,
      },
    });

    return formatReadingResponse(reading);
  } catch (error: any) {
    if (error?.code === "P2002") {
      const slotName = TIME_SLOT_DISPLAY_NAMES[input.timeSlot];
      throw AppError.conflict(
        ERROR_CODES.DUPLICATE_SLOT,
        `You already have an ${slotName} reading for this date.`
      );
    }
    throw error;
  }
};

export const getReadings = async (
  userId: string,
  options: {
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
) => {
  const { date, startDate, endDate, page = 1, limit = 20 } = options;
  const where: any = { userId };

  if (date) {
    where.readingDate = parseDateForDb(date);
  } else if (startDate || endDate) {
    where.readingDate = {};
    if (startDate) {
      where.readingDate.gte = parseDateForDb(startDate);
    }
    if (endDate) {
      where.readingDate.lte = parseDateForDb(endDate);
    }
  }

  const [readings, total] = await Promise.all([
    prisma.reading.findMany({
      where,
      orderBy: [{ readingDate: "desc" }, { timeSlot: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.reading.count({ where }),
  ]);

  return {
    readings: readings.map(formatReadingResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getReadingById = async (userId: string, readingId: string) => {
  const reading = await prisma.reading.findFirst({
    where: { id: readingId, userId },
  });

  if (!reading) {
    throw AppError.notFound(
      ERROR_CODES.READING_NOT_FOUND,
      "Reading not found"
    );
  }

  return formatReadingResponse(reading);
};

export const updateReading = async (
  userId: string,
  readingId: string,
  input: UpdateReadingInput
) => {
  const existing = await prisma.reading.findFirst({
    where: { id: readingId, userId },
  });

  if (!existing) {
    throw AppError.notFound(
      ERROR_CODES.READING_NOT_FOUND,
      "Reading not found"
    );
  }

  const newDateStr = input.readingDate || formatDateFromDb(existing.readingDate);
  const newSlot = input.timeSlot || existing.timeSlot;

  if (input.readingDate && isFutureDate(input.readingDate)) {
    throw AppError.badRequest(
      ERROR_CODES.FUTURE_DATE,
      "Date cannot be in the future."
    );
  }

  if (input.readingDate || input.timeSlot) {
    const duplicate = await prisma.reading.findFirst({
      where: {
        userId,
        readingDate: parseDateForDb(newDateStr),
        timeSlot: newSlot,
        NOT: { id: readingId },
      },
    });

    if (duplicate) {
      const slotName = TIME_SLOT_DISPLAY_NAMES[newSlot];
      throw AppError.conflict(
        ERROR_CODES.DUPLICATE_SLOT,
        `You already have an ${slotName} reading for this date.`
      );
    }
  }

  const updateData: any = {};
  if (input.glucoseValue !== undefined) {
    updateData.glucoseValue = input.glucoseValue;
  }
  if (input.readingDate !== undefined) {
    updateData.readingDate = parseDateForDb(input.readingDate);
  }
  if (input.timeSlot !== undefined) {
    updateData.timeSlot = input.timeSlot;
  }

  const updated = await prisma.reading.update({
    where: { id: readingId },
    data: updateData,
  });

  return formatReadingResponse(updated);
};

export const deleteReading = async (userId: string, readingId: string) => {
  const existing = await prisma.reading.findFirst({
    where: { id: readingId, userId },
  });

  if (!existing) {
    throw AppError.notFound(
      ERROR_CODES.READING_NOT_FOUND,
      "Reading not found"
    );
  }

  await prisma.reading.delete({
    where: { id: readingId },
  });

  return { success: true };
};

export const readingService = {
  createReading,
  getReadings,
  getReadingById,
  updateReading,
  deleteReading,
};
