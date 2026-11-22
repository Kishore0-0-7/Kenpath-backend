export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Sweety — Blood Glucose Tracker API",
    version: "1.0.0",
    description:
      "A calm, modern personal health journal REST API for logging daily blood glucose readings, tracking clinical targets, and generating glycemic reports.",
    contact: {
      name: "Sweety Clinical Support",
      email: "support@sweety.health",
    },
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token received from /api/auth/login or /api/auth/register",
      },
    },
    schemas: {
      TimeSlot: {
        type: "string",
        enum: ["MORNING_FASTING", "AFTER_BREAKFAST", "AFTER_LUNCH", "AFTER_DINNER"],
        description: "Clinical time slot for blood glucose measurement",
      },
      Reading: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          readingDate: { type: "string", format: "date", example: "2026-11-22" },
          timeSlot: { $ref: "#/components/schemas/TimeSlot" },
          glucoseValue: { type: "integer", minimum: 40, maximum: 600, example: 98 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Sarah Jenkins" },
          email: { type: "string", format: "email", example: "demo@sweety.health" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
        },
      },
      ReportSummary: {
        type: "object",
        properties: {
          highest: { type: "integer", nullable: true, example: 142 },
          lowest: { type: "integer", nullable: true, example: 94 },
          average: { type: "number", format: "float", nullable: true, example: 114.5 },
          count: { type: "integer", example: 4 },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Invalid input provided" },
              details: { type: "object", nullable: true },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Service Health & Database Connectivity Check",
        description: "Returns health status, database connection state, and configured timezone.",
        responses: {
          "200": {
            description: "Service is operational",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "sweety-backend" },
                    database: { type: "string", example: "connected" },
                    timezone: { type: "string", example: "Asia/Kolkata" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Register New Patient Account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Sarah Jenkins" },
                  email: { type: "string", format: "email", example: "sarah@sweety.health" },
                  password: { type: "string", format: "password", minLength: 8, example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Account created successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Email already registered" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Authenticate Patient Credentials",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "demo@sweety.health" },
                  password: { type: "string", format: "password", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Authentication successful",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          "401": { description: "Invalid email or password" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "Get Authenticated User Profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current patient profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/readings": {
      get: {
        summary: "List Glucose Readings",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" }, description: "Filter start date (YYYY-MM-DD)" },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" }, description: "Filter end date (YYYY-MM-DD)" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": {
            description: "List of readings with pagination metadata",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    readings: { type: "array", items: { $ref: "#/components/schemas/Reading" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Record Blood Glucose Reading",
        description: "Enforces 5 clinical rules: required value (40-600 mg/dL integer), valid slot, no duplicate slot on same date, max 4 daily readings, no future date.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["readingDate", "timeSlot", "glucoseValue"],
                properties: {
                  readingDate: { type: "string", format: "date", example: "2026-11-22" },
                  timeSlot: { $ref: "#/components/schemas/TimeSlot" },
                  glucoseValue: { type: "integer", minimum: 40, maximum: 600, example: 110 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Reading recorded successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Reading" } } },
          },
          "400": { description: "Validation error or clinical rule violation" },
        },
      },
    },
    "/api/readings/{id}": {
      get: {
        summary: "Get Single Reading by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/Reading" } } } },
          "404": { description: "Reading not found" },
        },
      },
      put: {
        summary: "Update Blood Glucose Reading",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  glucoseValue: { type: "integer", minimum: 40, maximum: 600, example: 125 },
                  timeSlot: { $ref: "#/components/schemas/TimeSlot" },
                  readingDate: { type: "string", format: "date" },
                },
              },
            },
          },
        },
        responses: {
          "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/Reading" } } } },
          "400": { description: "Validation error" },
          "404": { description: "Reading not found" },
        },
      },
      delete: {
        summary: "Delete Blood Glucose Reading",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Reading successfully deleted" },
          "404": { description: "Reading not found" },
        },
      },
    },
    "/api/reports/dashboard": {
      get: {
        summary: "Get Today's Summary and Readings for Dashboard",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    date: { type: "string", format: "date" },
                    summary: { $ref: "#/components/schemas/ReportSummary" },
                    readings: { type: "array", items: { $ref: "#/components/schemas/Reading" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/reports/daily": {
      get: {
        summary: "Daily Glycemic Breakdown Report",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "date", in: "query", required: true, schema: { type: "string", format: "date" } }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    date: { type: "string", format: "date" },
                    summary: { $ref: "#/components/schemas/ReportSummary" },
                    readings: { type: "array", items: { $ref: "#/components/schemas/Reading" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/reports/month-to-date": {
      get: {
        summary: "Month-to-Date Glycemic Analytics",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "date", in: "query", schema: { type: "string", format: "date" } }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
                    summary: { $ref: "#/components/schemas/ReportSummary" },
                    dailyBreakdown: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/reports/monthly": {
      get: {
        summary: "Full Previous Calendar Month Report",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "date", in: "query", schema: { type: "string", format: "date" } }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    month: { type: "string", example: "2026-10" },
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
                    summary: { $ref: "#/components/schemas/ReportSummary" },
                    dailyBreakdown: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
