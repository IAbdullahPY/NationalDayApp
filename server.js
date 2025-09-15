const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');   // 👈 new
const db = require('./database');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Session setup
app.use(session({
  secret: 'supersecretkey',   // 👈 change to a strong secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }   // secure:true only if using HTTPS
}));

/* ---------------- AUTH ---------------- */

// Simple login API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // 👇 Change this to your real admin credentials
  if (username === "admin" && password === "123456") {
    req.session.user = username;
    return res.send({ success: true });
  }
  res.status(401).send({ success: false, message: "Invalid credentials" });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.send({ success: true });
});

// Middleware to protect admin routes
function authMiddleware(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.status(403).send({ success: false, message: "Unauthorized" });
}

/* ---------------- API ROUTES ---------------- */

// Submit message
app.post('/api/messages', (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) return res.status(400).send('Name and message required');
  db.run('INSERT INTO messages (name, message) VALUES (?, ?)', [name, message], function(err){
    if(err) return res.status(500).send(err.message);
    res.send({ id: this.lastID });
  });
});

// Get all messages (public for tweets)
app.get('/api/messages', (req, res) => {
  db.all('SELECT * FROM messages ORDER BY created_at ASC', [], (err, rows) => {
    if(err) return res.status(500).send(err.message);
    res.json(rows);
  });
});

/* ---------------- ADMIN ROUTES ---------------- */
app.get('/api/admin/messages', authMiddleware, (req, res) => {
  db.all('SELECT * FROM messages ORDER BY created_at ASC', [], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.json(rows);
  });
});

app.delete('/api/admin/messages', authMiddleware, (req, res) => {
  db.run('DELETE FROM messages', [], function(err) {
    if (err) return res.status(500).send(err.message);
    res.send({ success: true });
  });
});

app.delete('/api/admin/messages/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM messages WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).send(err.message);
    res.send({ success: true, deleted: this.changes });
  });
});

/* --------------------------------------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));