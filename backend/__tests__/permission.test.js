
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const app = require("../src/app");

require("../src/models/User");
require("../src/models/Document");
require("../src/models/Permission");
require("../src/models/AuditLog");

const User = require("../src/models/User");
const Document = require("../src/models/Document");
const Permission = require("../src/models/Permission");
const AuditLog = mongoose.model("AuditLog");

let owner;
let viewer;
let outsider;
let documentRecord;
let ownerToken;
let viewerToken;
let outsiderToken;

function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

describe("TrustVault document permission security", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || "test-only-secret-for-jest";

    await mongoose.connect(
      "mongodb://127.0.0.1:27017/trustvault_test",
      {
        serverSelectionTimeoutMS: 5000,
        family: 4,
        runtimeAdapters: {
          os: require("os"),
        },
      }
    );

    await Promise.all([
      User.deleteMany({}),
      Document.deleteMany({}),
      Permission.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    owner = await User.create({
      name: "Test Owner",
      email: "owner@test.local",
      passwordHash: "test-password-hash",
      role: "owner",
    });

    viewer = await User.create({
      name: "Test Viewer",
      email: "viewer@test.local",
      passwordHash: "test-password-hash",
      role: "viewer",
    });

    outsider = await User.create({
      name: "Test Outsider",
      email: "outsider@test.local",
      passwordHash: "test-password-hash",
      role: "viewer",
    });

    ownerToken = createToken(owner);
    viewerToken = createToken(viewer);
    outsiderToken = createToken(outsider);

    documentRecord = await Document.create({
      name: "Permission Test Document",
      originalName: "permission-test.txt",
      storageKey: "permission-test.txt",
      mimeType: "text/plain",
      size: 20,
      category: "Testing",
      owner: owner._id,
      description: "Test document",
    });
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test("Owner should be able to grant read permission", async () => {
    const response = await request(app)
      .post(`/api/documents/${documentRecord._id}/permissions`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: viewer.email, accessLevel: "read" });

    expect(response.status).toBe(200);

    const permission = await Permission.findOne({
      document: documentRecord._id,
      grantedTo: viewer._id,
      revokedAt: null,
    });

    expect(permission).not.toBeNull();
    expect(permission.accessLevel).toBe("read");
  });

  test("Non-owner should not be able to grant permissions", async () => {
    const response = await request(app)
      .post(`/api/documents/${documentRecord._id}/permissions`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ email: outsider.email, accessLevel: "read" });

    expect(response.status).toBe(403);
  });

  test("User without permission should not download a document", async () => {
    const response = await request(app)
      .get(`/api/documents/${documentRecord._id}/download`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
  });

  test("Owner should be able to revoke granted permission", async () => {
    const response = await request(app)
      .delete(
        `/api/documents/${documentRecord._id}/permissions/${viewer._id}`
      )
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);

    const permission = await Permission.findOne({
      document: documentRecord._id,
      grantedTo: viewer._id,
      revokedAt: null,
    });

    expect(permission).toBeNull();
  });

  test("Revoked permission should no longer allow document download", async () => {
    const response = await request(app)
      .get(`/api/documents/${documentRecord._id}/download`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);
  });

  test("User cannot access another owner's document by changing the document ID", async () => {
    const response = await request(app)
      .get(`/api/documents/${documentRecord._id}/download`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
  });

  test("Non-owner cannot revoke another user's document permission", async () => {
    const response = await request(app)
      .delete(
        `/api/documents/${documentRecord._id}/permissions/${viewer._id}`
      )
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);
  });

  test("Database should prevent duplicate active permissions", async () => {
    await Permission.create({
      document: documentRecord._id,
      grantedBy: owner._id,
      grantedTo: viewer._id,
      accessLevel: "read",
      revokedAt: null,
    });

    await expect(
      Permission.create({
        document: documentRecord._id,
        grantedBy: owner._id,
        grantedTo: viewer._id,
        accessLevel: "edit",
        revokedAt: null,
      })
    ).rejects.toMatchObject({ code: 11000 });

    const count = await Permission.countDocuments({
      document: documentRecord._id,
      grantedTo: viewer._id,
      revokedAt: null,
    });

    expect(count).toBe(1);
  });
});
