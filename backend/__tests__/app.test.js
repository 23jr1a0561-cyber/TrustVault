
const request = require("supertest");
const jwt = require("jsonwebtoken");
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

  test("Document download should reject requests without a token", async () => {
    const response = await request(app).get(
      "/api/documents/507f1f77bcf86cd799439011/download"
    );

    expect(response.status).toBe(401);
  });

  test("Audit logs should reject requests without a token", async () => {
    const response = await request(app).get("/api/audit");

    expect(response.status).toBe(401);
  });

  test("Document list should reject an invalid token", async () => {
    const response = await request(app)
      .get("/api/documents")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  test("Document download should reject an invalid token", async () => {
    const response = await request(app)
      .get("/api/documents/507f1f77bcf86cd799439011/download")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  test("Permission grant should reject requests without a token", async () => {
    const response = await request(app).post(
      "/api/documents/507f1f77bcf86cd799439011/permissions"
    );

    expect(response.status).toBe(401);
  });

  test("Permission revoke should reject requests without a token", async () => {
    const response = await request(app).delete(
      "/api/documents/507f1f77bcf86cd799439011/permissions/507f1f77bcf86cd799439012"
    );

    expect(response.status).toBe(401);
  });

  test("Fake PDF content should be rejected with a valid token", async () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        "JWT_SECRET must be configured in the test environment"
      );
    }

    const token = jwt.sign(
      { id: "507f1f77bcf86cd799439011", role: "owner" },
      secret,
      { expiresIn: "5m" }
    );

    const response = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("name", "Fake PDF Test")
      .attach("file", Buffer.from("This is not a real PDF"), {
        filename: "fake.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "File content does not match the declared file type."
    );
  });
});
