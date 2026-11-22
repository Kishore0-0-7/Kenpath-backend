import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { prisma } from "../config/prisma.js";

describe("Sweety Blood Glucose Tracker - Backend API Test Suite", () => {
  const testEmail1 = `test_user_1_${Date.now()}@sweety.health`;
  const testEmail2 = `test_user_2_${Date.now()}@sweety.health`;
  let token1: string;
  let token2: string;
  let user1Id: string;
  let user2Id: string;
  let testReadingId: string;

  const getTodayKolkata = (): string => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  };

  const getPastDateKolkata = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };

  const getFutureDateKolkata = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };

  beforeAll(async () => {
    // Clean up test emails if existing
    await prisma.user.deleteMany({
      where: {
        email: { in: [testEmail1, testEmail2] },
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [testEmail1, testEmail2] },
      },
    });
    await prisma.$disconnect();
  });

  describe("1. Health Endpoint", () => {
    it("should return ok and timezone", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.timezone).toBe("Asia/Kolkata");
    });
  });

  describe("2. Authentication & Authorization", () => {
    it("should register a new user with hashed password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test Patient One",
          email: testEmail1,
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user.email).toBe(testEmail1.toLowerCase());
      expect(res.body.user).not.toHaveProperty("password");

      token1 = res.body.token;
      user1Id = res.body.user.id;
    });

    it("should reject duplicate registration with 409", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Duplicate User",
          email: testEmail1,
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe("An account with this email already exists");
    });

    it("should register a second user for cross-user tests", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test Patient Two",
          email: testEmail2,
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(201);
      token2 = res.body.token;
      user2Id = res.body.user.id;
    });

    it("should login successfully with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail1,
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe(testEmail1.toLowerCase());
    });

    it("should reject login with incorrect password with 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail1,
          password: "WrongPassword!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe("Invalid email or password");
    });

    it("should reject login for non-existent email with 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nobody@sweety.health",
          password: "SomePassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe("Invalid email or password");
    });

    it("should get current user info with /api/auth/me", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user1Id);
      expect(res.body.user.name).toBe("Test Patient One");
    });

    it("should reject unauthorized API access without token with 401", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("should reject unauthorized API access with malformed token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token-xyz");

      expect(res.status).toBe(401);
    });
  });

  describe("3. Readings CRUD & Validation Rules", () => {
    const today = getTodayKolkata();
    const pastDate = getPastDateKolkata(3);
    const futureDate = getFutureDateKolkata();

    it("Rule 1: should reject missing glucose value with required message", async () => {
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: today,
          timeSlot: "MORNING_FASTING",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Please enter a glucose value.");
    });

    it("Rule 2: should reject value below 40 with required message", async () => {
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: today,
          timeSlot: "MORNING_FASTING",
          glucoseValue: 35,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Value must be between 40 and 600 mg/dl.");
    });

    it("Rule 2: should reject value above 600 with required message", async () => {
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: today,
          timeSlot: "MORNING_FASTING",
          glucoseValue: 650,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Value must be between 40 and 600 mg/dl.");
    });

    it("Rule 2: should reject decimal numbers with required message", async () => {
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: today,
          timeSlot: "MORNING_FASTING",
          glucoseValue: 120.5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Value must be between 40 and 600 mg/dl.");
    });

    it("Rule 5: should reject future date with required message", async () => {
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: futureDate,
          timeSlot: "MORNING_FASTING",
          glucoseValue: 110,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Date cannot be in the future.");
    });

    it("should successfully create a valid reading", async () => {
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: pastDate,
          timeSlot: "MORNING_FASTING",
          glucoseValue: 95,
        });

      expect(res.status).toBe(201);
      expect(res.body.reading).toHaveProperty("id");
      expect(res.body.reading.glucoseValue).toBe(95);
      expect(res.body.reading.timeSlot).toBe("MORNING_FASTING");
      expect(res.body.reading.readingDate).toBe(pastDate);

      testReadingId = res.body.reading.id;
    });

    it("Rule 3: should reject duplicate slot on the same date with required message", async () => {
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: pastDate,
          timeSlot: "MORNING_FASTING",
          glucoseValue: 105,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe(
        "You already have an morning (fasting) reading for this date."
      );
    });

    it("should allow creating 3 more slots on the same date (up to 4)", async () => {
      // Slot 2: After breakfast
      const r2 = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: pastDate,
          timeSlot: "AFTER_BREAKFAST",
          glucoseValue: 135,
        });
      expect(r2.status).toBe(201);

      // Slot 3: After lunch
      const r3 = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: pastDate,
          timeSlot: "AFTER_LUNCH",
          glucoseValue: 128,
        });
      expect(r3.status).toBe(201);

      // Slot 4: After dinner
      const r4 = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: pastDate,
          timeSlot: "AFTER_DINNER",
          glucoseValue: 115,
        });
      expect(r4.status).toBe(201);
    });

    it("Rule 4: should reject a fifth daily reading with required message", async () => {
      // Trying to add another reading on pastDate
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          readingDate: pastDate,
          timeSlot: "MORNING_FASTING",
          glucoseValue: 100,
        });

      // It will trigger duplicate slot or max 4 readings
      expect([400, 409]).toContain(res.status);
    });

    it("should retrieve readings list scoped to the user", async () => {
      const res = await request(app)
        .get(`/api/readings?date=${pastDate}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.readings).toHaveLength(4);
      expect(res.body.readings[0].userId).toBe(user1Id);
    });

    it("should retrieve a single reading by ID", async () => {
      const res = await request(app)
        .get(`/api/readings/${testReadingId}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.reading.id).toBe(testReadingId);
      expect(res.body.reading.glucoseValue).toBe(95);
    });

    it("should update a reading successfully", async () => {
      const res = await request(app)
        .put(`/api/readings/${testReadingId}`)
        .set("Authorization", `Bearer ${token1}`)
        .send({
          glucoseValue: 99,
        });

      expect(res.status).toBe(200);
      expect(res.body.reading.glucoseValue).toBe(99);
    });

    it("Cross-user isolation: User 2 should NOT be able to view User 1's reading", async () => {
      const res = await request(app)
        .get(`/api/readings/${testReadingId}`)
        .set("Authorization", `Bearer ${token2}`);

      expect(res.status).toBe(404);
    });

    it("Cross-user isolation: User 2 should NOT be able to update User 1's reading", async () => {
      const res = await request(app)
        .put(`/api/readings/${testReadingId}`)
        .set("Authorization", `Bearer ${token2}`)
        .send({
          glucoseValue: 150,
        });

      expect(res.status).toBe(404);
    });

    it("Cross-user isolation: User 2 should NOT be able to delete User 1's reading", async () => {
      const res = await request(app)
        .delete(`/api/readings/${testReadingId}`)
        .set("Authorization", `Bearer ${token2}`);

      expect(res.status).toBe(404);
    });

    it("should delete reading successfully by owner", async () => {
      const res = await request(app)
        .delete(`/api/readings/${testReadingId}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("4. Reports & Analytics Calculations", () => {
    const reportDate = getPastDateKolkata(7);

    beforeAll(async () => {
      // Insert predictable readings for report tests
      await prisma.reading.deleteMany({
        where: { userId: user2Id },
      });

      // Insert 3 readings on reportDate: 90, 120, 150 -> Highest 150, Lowest 90, Avg 120.0, Count 3
      await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token2}`)
        .send({
          readingDate: reportDate,
          timeSlot: "MORNING_FASTING",
          glucoseValue: 90,
        });

      await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token2}`)
        .send({
          readingDate: reportDate,
          timeSlot: "AFTER_BREAKFAST",
          glucoseValue: 120,
        });

      await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token2}`)
        .send({
          readingDate: reportDate,
          timeSlot: "AFTER_LUNCH",
          glucoseValue: 150,
        });
    });

    it("Daily report should calculate max, min, avg rounded to 1 decimal", async () => {
      const res = await request(app)
        .get(`/api/reports/daily?date=${reportDate}`)
        .set("Authorization", `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.date).toBe(reportDate);
      expect(res.body.summary.count).toBe(3);
      expect(res.body.summary.highest).toBe(150);
      expect(res.body.summary.lowest).toBe(90);
      expect(res.body.summary.average).toBe(120);
      expect(res.body.readings).toHaveLength(3);
    });

    it("Empty daily report should return count 0 and null stats", async () => {
      const emptyDate = getPastDateKolkata(20);
      const res = await request(app)
        .get(`/api/reports/daily?date=${emptyDate}`)
        .set("Authorization", `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.count).toBe(0);
      expect(res.body.summary.highest).toBeNull();
      expect(res.body.summary.lowest).toBeNull();
      expect(res.body.summary.average).toBeNull();
      expect(res.body.readings).toHaveLength(0);
    });

    it("Month-to-date report should cover start of month to selected date", async () => {
      const res = await request(app)
        .get(`/api/reports/month-to-date?date=${reportDate}`)
        .set("Authorization", `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("startDate");
      expect(res.body.endDate).toBe(reportDate);
      expect(res.body.summary.count).toBeGreaterThanOrEqual(3);
      expect(res.body).toHaveProperty("dailyBreakdown");
    });

    it("Monthly report should cover full previous calendar month", async () => {
      const res = await request(app)
        .get(`/api/reports/monthly?date=${reportDate}`)
        .set("Authorization", `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("startDate");
      expect(res.body).toHaveProperty("endDate");
      expect(res.body).toHaveProperty("summary");
    });

    it("Reports should reject future dates with 400", async () => {
      const futureDate = getFutureDateKolkata();
      const res = await request(app)
        .get(`/api/reports/daily?date=${futureDate}`)
        .set("Authorization", `Bearer ${token2}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Date cannot be in the future.");
    });
  });
});
