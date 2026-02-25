const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SECRET = "supersecretkey";

// ================= DATABASE =================
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

  // Default admin
  db.get("SELECT * FROM admin LIMIT 1", [], async (err,row)=>{
    if(!row){
      const hash = await bcrypt.hash("1234",10);
      db.run("INSERT INTO admin(username,password) VALUES(?,?)",["admin",hash]);
      console.log("Default admin created: admin / 1234");
    }
  });

  // Default menu
  db.get("SELECT COUNT(*) AS count FROM menu", [], (err,row)=>{
    if(row.count===0){
      db.run(`INSERT INTO menu(name,price,img) VALUES
        ('Espresso',100,'https://via.placeholder.com/60'),
        ('Latte',150,'https://via.placeholder.com/60'),
        ('Cappuccino',130,'https://via.placeholder.com/60')
      `);
      console.log("Default menu items added");
    }
  });
});

// ================= AUTH =================
function auth(req,res,next){
  const token=req.headers.authorization;
  if(!token) return res.status(401).json({msg:"No token"});
  try{ jwt.verify(token,SECRET); next(); }
  catch{ res.status(400).json({msg:"Invalid token"}); }
}

// ================= ROUTES =================

// Customer page
app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"public","customerpage.html"));
});

// Admin page
app.get("/admin",(req,res)=>{
  res.sendFile(path.join(__dirname,"public","adminpage.html"));
});

// ----- LOGIN -----
app.post("/login",(req,res)=>{
  db.get("SELECT * FROM admin WHERE username=?",[req.body.username], async (err,row)=>{
    if(!row) return res.json({msg:"User not found"});
    const valid = await bcrypt.compare(req.body.password,row.password);
    if(!valid) return res.json({msg:"Wrong password"});
    const token = jwt.sign({id:row.id},SECRET);
    res.json({token});
  });
});

// ----- CHANGE PASSWORD -----
app.post("/change-password",auth,(req,res)=>{
  const newPass=req.body.password;
  bcrypt.hash(newPass,10,(err,hash)=>{
    db.run("UPDATE admin SET password=? WHERE id=1",[hash],()=>res.json({msg:"Password changed"}));
  });
});

// ----- MENU -----
app.get("/menu",(req,res)=>{
  db.all("SELECT * FROM menu",[],(err,rows)=>res.json(rows));
});
app.post("/menu",auth,(req,res)=>{
  const {name,price,img}=req.body;
  db.run("INSERT INTO menu(name,price,img) VALUES(?,?,?)",[name,price,img],()=>res.json({msg:"Menu added"}));
});
app.delete("/menu/:id",auth,(req,res)=>{
  db.run("DELETE FROM menu WHERE id=?",[req.params.id],()=>res.json({msg:"Menu deleted"}));
});

// ----- ORDERS -----
app.post("/order",(req,res)=>{
  const {customer,type,items,total} = req.body;
  db.run("INSERT INTO orders(customer,type,items,total) VALUES(?,?,?,?)",
    [customer,type,JSON.stringify(items),total],
    ()=>res.json({msg:"Order saved"}));
});

app.get("/orders",auth,(req,res)=>{
  db.all("SELECT * FROM orders WHERE status='new'",[],(err,rows)=>{
    rows.forEach(r=>r.items=JSON.parse(r.items));
    res.json(rows);
  });
});

app.post("/order/done/:id",auth,(req,res)=>{
  db.run("UPDATE orders SET status='done' WHERE id=?",[req.params.id],()=>res.json({msg:"Order marked done"}));
});

app.get("/orders-done",auth,(req,res)=>{
  db.all("SELECT * FROM orders WHERE status='done' ORDER BY createdAt DESC",[],(err,rows)=>{
    rows.forEach(r=>r.items=JSON.parse(r.items));
    res.json(rows);
  });
});

// ================= START SERVER =================
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log("Server running on port "+PORT));
