const { expect } = require("chai");
const db = require("./dbConnectivity.js"); 

describe("Database Connectivity", () => {
  it("should connect to the database without error", (done) => {
    db.query("SELECT 1", (error, results) => {
      expect(error).to.be.null;
      done();
    });
  });
});
