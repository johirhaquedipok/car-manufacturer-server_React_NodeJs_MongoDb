const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.get("/", async (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Doctors App listening on port ${port}`);
});
