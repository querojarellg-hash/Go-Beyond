const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // serve html files

const PORT = 5000;

// In-memory storage
let orders = [];

/* =========================
   Get Philippine Time
========================= */
function getPhilippineTime() {
  return new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

/* =========================
   Create Order
========================= */
app.post("/api/order", (req, res) => {
  const { name, table, items, total } = req.body;

  const newOrder = {
    id: uuidv4(),
    name,
    table,
    items,
    total,
    status: "Pending",
    date: getPhilippineTime()
  };

  orders.push(newOrder);
  res.json({ message: "Order received!", order: newOrder });
});

/* =========================
   Get All Orders
========================= */
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

/* =========================
   Mark as Done
========================= */
app.put("/api/order/:id/done", (req, res) => {
  const { id } = req.params;

  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.status = "Done";
  res.json({ message: "Order marked as done" });
});

/* =========================
   Reject Order
========================= */
app.put("/api/order/:id/reject", (req, res) => {
  const { id } = req.params;

  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.status = "Rejected";
  res.json({ message: "Order rejected" });
});

/* =========================
   Delete Order
========================= */
app.delete("/api/order/:id", (req, res) => {
  const { id } = req.params;
  orders = orders.filter(o => o.id !== id);
  res.json({ message: "Order deleted" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
