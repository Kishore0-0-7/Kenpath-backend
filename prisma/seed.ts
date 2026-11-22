import { TimeSlot } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";

const getKolkataDateString = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
};

const parseDbDate = (dateStr: string): Date => {
  return new Date(`${dateStr}T00:00:00.000Z`);
};

async function main() {
  console.log("🌱 Starting Sweety database seed on cloud Neon PostgreSQL...");

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash("SweetyDemo2026!", saltRounds);

  // 1. Create Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@sweety.health" },
    update: {
      name: "Sarah Jenkins",
      password: passwordHash,
    },
    create: {
      name: "Sarah Jenkins",
      email: "demo@sweety.health",
      password: passwordHash,
    },
  });

  console.log(`✅ Demo user seeded: ${demoUser.email} (ID: ${demoUser.id})`);

  // 2. Create Second User for Cross-User Isolation Verification
  const testUser = await prisma.user.upsert({
    where: { email: "alex@sweety.health" },
    update: {
      name: "Alex Rivera",
      password: passwordHash,
    },
    create: {
      name: "Alex Rivera",
      email: "alex@sweety.health",
      password: passwordHash,
    },
  });

  console.log(`✅ Secondary user seeded: ${testUser.email} (ID: ${testUser.id})`);

  // Clear existing readings for demoUser to ensure clean repeatable seed
  await prisma.reading.deleteMany({
    where: { userId: demoUser.id },
  });

  const sampleData: Array<{
    daysAgo: number;
    slot: TimeSlot;
    glucose: number;
  }> = [
    // Today (2 readings logged, 2 remaining for the patient)
    { daysAgo: 0, slot: TimeSlot.MORNING_FASTING, glucose: 94 },
    { daysAgo: 0, slot: TimeSlot.AFTER_BREAKFAST, glucose: 132 },

    // Yesterday (Full 4 readings)
    { daysAgo: 1, slot: TimeSlot.MORNING_FASTING, glucose: 98 },
    { daysAgo: 1, slot: TimeSlot.AFTER_BREAKFAST, glucose: 128 },
    { daysAgo: 1, slot: TimeSlot.AFTER_LUNCH, glucose: 142 },
    { daysAgo: 1, slot: TimeSlot.AFTER_DINNER, glucose: 118 },

    // 2 days ago
    { daysAgo: 2, slot: TimeSlot.MORNING_FASTING, glucose: 91 },
    { daysAgo: 2, slot: TimeSlot.AFTER_BREAKFAST, glucose: 135 },
    { daysAgo: 2, slot: TimeSlot.AFTER_LUNCH, glucose: 138 },
    { daysAgo: 2, slot: TimeSlot.AFTER_DINNER, glucose: 122 },

    // 3 days ago
    { daysAgo: 3, slot: TimeSlot.MORNING_FASTING, glucose: 105 },
    { daysAgo: 3, slot: TimeSlot.AFTER_BREAKFAST, glucose: 146 },
    { daysAgo: 3, slot: TimeSlot.AFTER_LUNCH, glucose: 130 },
    { daysAgo: 3, slot: TimeSlot.AFTER_DINNER, glucose: 115 },

    // 4 days ago
    { daysAgo: 4, slot: TimeSlot.MORNING_FASTING, glucose: 89 },
    { daysAgo: 4, slot: TimeSlot.AFTER_BREAKFAST, glucose: 125 },
    { daysAgo: 4, slot: TimeSlot.AFTER_LUNCH, glucose: 134 },
    { daysAgo: 4, slot: TimeSlot.AFTER_DINNER, glucose: 112 },

    // 5 days ago
    { daysAgo: 5, slot: TimeSlot.MORNING_FASTING, glucose: 96 },
    { daysAgo: 5, slot: TimeSlot.AFTER_BREAKFAST, glucose: 139 },
    { daysAgo: 5, slot: TimeSlot.AFTER_LUNCH, glucose: 145 },
    { daysAgo: 5, slot: TimeSlot.AFTER_DINNER, glucose: 120 },

    // 7 days ago
    { daysAgo: 7, slot: TimeSlot.MORNING_FASTING, glucose: 92 },
    { daysAgo: 7, slot: TimeSlot.AFTER_BREAKFAST, glucose: 129 },
    { daysAgo: 7, slot: TimeSlot.AFTER_LUNCH, glucose: 136 },
    { daysAgo: 7, slot: TimeSlot.AFTER_DINNER, glucose: 119 },

    // 14 days ago
    { daysAgo: 14, slot: TimeSlot.MORNING_FASTING, glucose: 100 },
    { daysAgo: 14, slot: TimeSlot.AFTER_BREAKFAST, glucose: 142 },
    { daysAgo: 14, slot: TimeSlot.AFTER_LUNCH, glucose: 137 },
    { daysAgo: 14, slot: TimeSlot.AFTER_DINNER, glucose: 124 },

    // Previous month (35-45 days ago)
    { daysAgo: 35, slot: TimeSlot.MORNING_FASTING, glucose: 99 },
    { daysAgo: 35, slot: TimeSlot.AFTER_BREAKFAST, glucose: 141 },
    { daysAgo: 35, slot: TimeSlot.AFTER_LUNCH, glucose: 135 },
    { daysAgo: 35, slot: TimeSlot.AFTER_DINNER, glucose: 121 },

    { daysAgo: 40, slot: TimeSlot.MORNING_FASTING, glucose: 95 },
    { daysAgo: 40, slot: TimeSlot.AFTER_BREAKFAST, glucose: 130 },
    { daysAgo: 40, slot: TimeSlot.AFTER_LUNCH, glucose: 140 },
    { daysAgo: 40, slot: TimeSlot.AFTER_DINNER, glucose: 116 },
  ];

  const readingsData = sampleData.map((item) => ({
    userId: demoUser.id,
    readingDate: parseDbDate(getKolkataDateString(item.daysAgo)),
    timeSlot: item.slot,
    glucoseValue: item.glucose,
  }));

  const { count: insertedCount } = await prisma.reading.createMany({
    data: readingsData,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${insertedCount} historical blood glucose readings for Sarah Jenkins.`);
  console.log("--------------------------------------------------");
  console.log("Evaluation Demo Credentials:");
  console.log("  Email: demo@sweety.health");
  console.log("  Password: SweetyDemo2026! (or Password123!)");
  console.log("--------------------------------------------------");
  console.log("🏁 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Database seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
