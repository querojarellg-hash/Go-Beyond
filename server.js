const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from root directory
app.use(express.static(__dirname));

const SECRET = "supersecretkey";

/* ===== DATABASE ===== */
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS admin(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS menu(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER,
    img TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT,
    type TEXT,
    items TEXT,
    total INTEGER,
    status TEXT DEFAULT 'new',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // CREATE DEFAULT ADMIN
  db.get("SELECT * FROM admin", [], async (err, row) => {
    if (!row) {
      const hash = await bcrypt.hash("1234", 10);
      db.run(
        "INSERT INTO admin(username,password) VALUES(?,?)",
        ["admin", hash]
      );
      console.log("Default Admin Created: Username: admin, Password: 1234");
    }
  });
});

/* ===== AUTH ===== */
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ msg: "No token" });
  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(400).json({ msg: "Invalid token" });
  }
}

/* ===== HOMEPAGE ===== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "customerpage.html"));
});

/* ===== LOGIN ===== */
app.post("/login", (req, res) => {
  db.get(
    "SELECT * FROM admin WHERE username=?",
    [req.body.username],
    async (err, row) => {
      if (!row) return res.json({ msg: "User not found" });
      const valid = await bcrypt.compare(req.body.password, row.password);
      if (!valid) return res.json({ msg: "Wrong password" });
      const token = jwt.sign({ id: row.id }, SECRET);
      res.json({ token });
    }
  );
});

/* ===== MENU ===== */
app.get("/menu", (req, res) => {
  db.all("SELECT * FROM menu", [], (err, rows) => res.json(rows));
});

app.post("/menu", auth, (req, res) => {
  db.run(
    "INSERT INTO menu(name,price,img) VALUES(?,?,?)",
    [req.body.name, req.body.price, req.body.img],
    () => res.json({ msg: "Added" })
  );
});

app.delete("/menu/:id", auth, (req, res) => {
  db.run(
    "DELETE FROM menu WHERE id=?",
    [req.params.id],
    () => res.json({ msg: "Deleted" })
  );
});

/* ===== ORDERS ===== */
app.post("/order", (req, res) => {
  db.run(
    "INSERT INTO orders(customer,type,items,total) VALUES(?,?,?,?)",
    [
      req.body.customer,
      req.body.type,
      JSON.stringify(req.body.items),
      req.body.total,
    ],
    () => res.json({ msg: "Order saved" })
  );
});

app.get("/orders", auth, (req, res) => {
  db.all("SELECT * FROM orders WHERE status='new'", [], (err, rows) => {
    rows.forEach((r) => (r.items = JSON.parse(r.items)));
    res.json(rows);
  });
});

app.post("/order/done/:id", auth, (req, res) => {
  db.run(
    "UPDATE orders SET status='done' WHERE id=?",
    [req.params.id],
    () => res.json({ msg: "Done" })
  );
});

app.get("/orders-done", auth, (req, res) => {
  db.all(
    "SELECT * FROM orders WHERE status='done' ORDER BY createdAt DESC",
    [],
    (err, rows) => {
      rows.forEach((r) => (r.items = JSON.parse(r.items)));
      res.json(rows);
    }
  );
});

/* ===== START SERVER ===== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});