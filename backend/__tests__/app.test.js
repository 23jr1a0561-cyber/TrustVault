
const request = require("supertest");
const app = require("../src/app");

describe("TrustVault API", () => {
  test("Health endpoint should return 200", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
  });

  test("Document list should reject requests without a token", async () => {
    const response = await request(app).get("/api/documents");

    expect(response.status).toBe(401);
  });

  test("Document upload should reject requests without a token", async () => {
    const response = await request(app).post("/api/documents/upload");

    expect(response.status).toBe(401);
  });

  test("Audit logs should reject requests without a token", async () => {
    const response = await request(app).get("/api/audit");

    expect(response.status).toBe(401);
  });
});
