require('dotenv').config();
const mysql = require("mysql2");


const db = mysql.createConnection({
  host: "mysql-2d26085b-dhairya-a940.d.aivencloud.com",
  port: 18941, // Add the port number here (no quotes needed if it's a number)
  user: "avnadmin",
  password: process.env.DB_PASSWORD,
  database: "defaultdb", // Aiven usually names the default free database 'defaultdb'
  ssl: {
    rejectUnauthorized: false // Required for securely connecting to cloud databases
  }
});


db.connect((err) => {
  if (err) {
    console.log("Connection Failed");
    console.log(err);
  } else {
    console.log("Cloud Database Connected Successfully!");
  }
});

module.exports = db;
