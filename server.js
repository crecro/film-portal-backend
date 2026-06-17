const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db"); 

const app = express();

app.use(cors());
app.use(express.json());

// --- BASE ROUTE ---
app.get("/", (req, res) => {
  res.send("Film Recommendation API Running");
});

// --- AUTH ROUTES ---
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
    db.query(sql, [email, hashedPassword], (err, result) => {
      if (err) return res.status(400).send("Registration error");
      res.status(201).json({ message: "User registered" });
    });
  } catch (err) { res.status(500).send("Server error"); }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err || results.length === 0) return res.status(404).send("User not found");
    const isMatch = await bcrypt.compare(password, results[0].password);
    if (isMatch) res.json({ userId: results[0].id, email: results[0].email });
    else res.status(401).send("Invalid credentials");
  });
});

// --- FILM MANAGEMENT ---
app.get("/films", (req, res) => {
  db.query("SELECT * FROM films", (err, result) => {
    if (err) res.status(500).send("Database error");
    else res.json(result);
  });
});

app.post("/films", async (req, res) => {
  const { title, genre, director, year_released, description, rating, film_url } = req.body;
  const API_KEY = "e859f935";
  
  try {
    const omdbResponse = await fetch(`http://www.omdbapi.com/?apikey=${API_KEY}&t=${encodeURIComponent(title)}`);
    const omdbData = await omdbResponse.json();
    let image_url = (omdbData.Response === "True" && omdbData.Poster !== "N/A") ? omdbData.Poster : "default_image_url_here";

    const sql = `INSERT INTO films (title, genre, director, year_released, description, rating, image_url, film_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [title, genre, director, year_released, description, rating, image_url, film_url || "#"], (err) => {
      if (err) res.status(500).send("Database Insertion Error");
      else res.send("Film Added Successfully");
    });
  } catch (error) { res.status(500).send("Failed to fetch poster"); }
});

// --- RECOMMENDATION ALGORITHM ---
app.get("/films/recommend/:id", (req, res) => {
  const targetId = String(req.params.id);
  
  db.query("SELECT * FROM films", (err, results) => {
    if (err) return res.status(500).send("Database error");
    
    const targetFilm = results.find((f) => String(f.id) === targetId);
    if (!targetFilm) return res.status(404).send("Film not found");

    const byDirector = results.filter(f => 
      String(f.id) !== targetId && 
      f.director === targetFilm.director
    ).slice(0, 4);

    const byGenre = results.filter(f => 
      String(f.id) !== targetId && 
      f.genre === targetFilm.genre &&
      f.director !== targetFilm.director 
    ).slice(0, 4);

    res.json({
      director: targetFilm.director,
      genre: targetFilm.genre,
      byDirector: byDirector,
      byGenre: byGenre
    });
  });
});

// --- COLLECTIONS & REVIEWS ---
app.get("/collections/:userId", (req, res) => {
  db.query(`SELECT films.* FROM films JOIN collections ON films.id = collections.film_id WHERE collections.user_id = ?`, 
    [req.params.userId], (err, results) => { res.json(results); });
});

app.post("/collections", (req, res) => {
  db.query("INSERT IGNORE INTO collections (user_id, film_id) VALUES (?, ?)", 
    [req.body.user_id, req.body.film_id], () => res.send("Added"));
});

// UPDATED REVIEW ROUTE WITH ERROR HANDLING
app.post("/reviews", (req, res) => {
  const { user_id, film_id, rating, review_text } = req.body;
  const sql = "INSERT INTO reviews (user_id, film_id, rating, review_text) VALUES (?, ?, ?, ?)";
  
  db.query(sql, [user_id, film_id, rating, review_text], (err, result) => {
    if (err) {
      console.error("Database error in /reviews:", err);
      return res.status(500).json({ error: "Database operation failed", details: err.message });
    }
    res.status(201).send("Review added successfully");
  });
});

app.get("/reviews", (req, res) => {
  const sql = `SELECT reviews.*, users.email, films.title, films.image_url FROM reviews 
               JOIN users ON reviews.user_id = users.id 
               JOIN films ON reviews.film_id = films.id ORDER BY reviews.created_at DESC`;
  db.query(sql, (err, results) => { 
    if (err) return res.status(500).send("Database error");
    res.json(results); 
  });
});

app.listen(5000, () => {
  console.log("Server Running On Port 5000");
});
