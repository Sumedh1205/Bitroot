const request = require("supertest");
const { expect } = require("chai");
const app = require("./app.js"); 

describe("Contacts API", () => {
  it("should get all contacts", (done) => {
    request(app)
      .get("/getcontacts")
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an("array");
        done();
      });
  });

  it("should create a new contact", (done) => {
    request(app)
      .post("/insertcontact")
      .field("name", "John Doe")
      .field("mobno", "1234567890")
      .attach("image", "path/to/image.jpg")
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body.status).to.be.true;
        done();
      });
  });

  // Add more tests as needed
});
