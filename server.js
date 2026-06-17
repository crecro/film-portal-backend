const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db"); // Ensure your db.js is correctly configured

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

https://film-portal-api.onrender.com/films

// --- RECOMMENDATION ALGORITHM ---
app.get("/films/recommend/:id", (req, res) => {
  const targetId = String(req.params.id);
  
  db.query("SELECT * FROM films", (err, results) => {
    if (err) return res.status(500).send("Database error");
    
    const targetFilm = results.find((f) => String(f.id) === targetId);
    if (!targetFilm) return res.status(404).send("Film not found");

    // Group 1: Exact Same Director (excluding the selected film)
    const byDirector = results.filter(f => 
      String(f.id) !== targetId && 
      f.director === targetFilm.director
    ).slice(0, 4); // Show top 4

    // Group 2: Same Genre (excluding selected film AND avoiding duplicates from the director list)
    const byGenre = results.filter(f => 
      String(f.id) !== targetId && 
      f.genre === targetFilm.genre &&
      f.director !== targetFilm.director // Don't show the same film in both rows
    ).slice(0, 4); // Show top 4

    // Send the grouped data back to React
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

app.post("/reviews", (req, res) => {
  db.query("INSERT INTO reviews (user_id, film_id, rating, review_text) VALUES (?, ?, ?, ?)", 
    [req.body.user_id, req.body.film_id, req.body.rating, req.body.review_text], () => res.send("Review added"));
});

app.get("/reviews", (req, res) => {
  const sql = `SELECT reviews.*, users.email, films.title, films.image_url FROM reviews 
               JOIN users ON reviews.user_id = users.id 
               JOIN films ON reviews.film_id = films.id ORDER BY reviews.created_at DESC`;
  db.query(sql, (err, results) => { res.json(results); });
});

app.listen(5000, () => {
  console.log("Server Running On Port 5000");
});