require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");

const app = express();

/* =========================
   GLOBAL MIDDLEWARE
========================= */

// Security headers
app.use(helmet());

// Enable CORS (frontend će biti na portu 3000)
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

// Parse JSON
app.use(express.json());

/* =========================
   ROUTES
========================= */

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Backend radi 🚀" });
});

// Auth routes
app.use("/api/auth", authRoutes);

/* =========================
   START SERVER
========================= */

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}

start();