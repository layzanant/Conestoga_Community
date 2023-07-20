const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../index");

/* Connecting to the database before each test. */
beforeEach(async () => {
  await mongoose.connect("mongodb://0.0.0.0:27017/ConestogaCommunity");
});

/* Closing database connection after each test. */
afterEach(async () => {
  await mongoose.connection.close();
});

afterAll(async () => {
  await app.close();
});

// test get all posts API
describe("GET /allPosts", () => {
  it("should return all posts", async () => {
    const res = await request(app).get("/allPosts");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
