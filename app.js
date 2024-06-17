const express = require("express");
const multer = require("multer");
const csv = require("fast-csv");
const fs = require("fs");
const db = require("./dbConnectivity.js");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// This is Setup multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Definning  routes

// Read
app.get("/getcontacts", (req, res) => {
  db.query("SELECT * FROM contactdetails", (error, results, fields) => {
    if (error) {
      console.error("Error executing query:", error);
      res.status(500).send("Error fetching data from database");
      return;
    }
    res.json(results);
  });
});

// Search by name or mobile number
app.get("/searchcontact", (req, res) => {
  const { name, mobno } = req.query;

  let query = "SELECT * FROM contactdetails WHERE 1=1";
  let queryParams = [];

  if (name) {
    query += " AND name LIKE ?";
    queryParams.push(`%${name}%`);
  }

  if (mobno) {
    query += " AND mobno LIKE ?";
    queryParams.push(`%${mobno}%`);
  }

  db.query(query, queryParams, (error, results, fields) => {
    if (error) {
      console.error("Error executing query:", error);
      res.status(500).send("Error searching data from database");
      return;
    }
    res.json(results);
  });
});

// Create
app.post("/insertcontact", upload.single('image'), (req, res) => {
  let body = req.body;
  const image = req.file ? req.file.path : null;
  console.log("body", body);

  // Validation for mobile number
  const mobnos = body.mobno.split(",");
  const duplicateCheckQuery = "SELECT * FROM contactdetails WHERE mobno IN (?)";
  db.query(duplicateCheckQuery, [mobnos], (error, results) => {
    if (error) {
      console.error("Error executing query:", error);
      res.status(500).send("Error checking duplicate mobile numbers");
      return;
    }
    if (results.length > 0) {
      res.json({ status: false, message: "Duplicate mobile number found" });
      return;
    }

    // Here If validations pass, proceeding with inserting data in database 
    db.query(
      "INSERT INTO contactdetails (`name`, `mobno`, `image`) VALUES (?, ?, ?)",
      [body.name, body.mobno, image],
      (error, result) => {
        if (error) {
          res.json({ status: false, message: error });
          return;
        }
        res.json({ status: true, message: "Contact added successfully" });
      }
    );
  });
});

// Update 
app.post("/updatecontact", upload.single('image'), (req, res) => {
  let body = req.body;
  const image = req.file ? req.file.path : null;
  console.log("body", body);

  // Validation for name
  if (!body.name || body.name.trim() === "") {
    res.json({ status: false, message: "Name is required" });
    return;
  }

  // Validation for mobile number
  if (!body.mobno) {
    res.json({ status: false, message: "Mobile number is required" });
    return;
  }

  const mobnos = body.mobno.split(",");

  // Herei have written the following to Check for duplicates excluding current contact
  const duplicateCheckQuery = "SELECT * FROM contactdetails WHERE mobno IN (?) AND srno != ?";
  db.query(duplicateCheckQuery, [mobnos, body.srno], (error, results) => {
    if (error) {
      console.error("Error executing query:", error);
      res.status(500).send("Error checking duplicate mobile numbers");
      return;
    }
    if (results.length > 0) {
      res.json({ status: false, message: "Duplicate mobile number found" });
      return;
    }

    // If validations pass, proceeding with updating data in database
    let updateQuery = "UPDATE contactdetails SET name = ?, mobno = ?";
    let queryParams = [body.name, body.mobno];

    if (image) {
      updateQuery += ", image = ?";
      queryParams.push(image);
    }

    updateQuery += " WHERE srno = ?";
    queryParams.push(body.srno);

    db.query(updateQuery, queryParams, (error, result) => {
      if (error) {
        res.json({ status: false, message: error });
        return;
      }
      res.json({ status: true, message: "Contact updated successfully" });
    });
  });
});

// Delete
app.post("/deletecontact", (req, res) => {
  let body = req.body;
  console.log("body", body);

  db.query("DELETE FROM contactdetails WHERE srno = ?", [body.srno], (error, result) => {
    if (error) {
      res.json({ status: false, message: error });
      return;
    }
    res.json({ status: true, message: "Contact deleted successfully" });
  });
});

// Export all contactdetails to CSV
app.get("/exportcontacts", (req, res) => {
  db.query("SELECT * FROM contactdetails", (error, results) => {
    if (error) {
      console.error("Error executing query:", error);
      res.status(500).send("Error fetching data from database");
      return;
    }

    const csvStream = csv.format({ headers: true });
    const writableStream = fs.createWriteStream("contactdetails.csv");

    writableStream.on("finish", () => {
      res.download("contactdetails.csv", "contactdetails.csv", (err) => {
        if (err) {
          console.error("Error downloading CSV file:", err);
          res.status(500).send("Error downloading CSV file");
        }
      });
    });

    csvStream.pipe(writableStream);
    results.forEach(contact => {
      csvStream.write(contact);
    });
    csvStream.end();
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Close database connection
process.on("SIGINT", () => {
  db.end();
  console.log("Connection to database closed");
  process.exit();
});

module.exports = app;

