require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");

const app = express();
app.use(helmet());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.get("/", (req, res) => {
  res.json({ message: "Backend radi 🚀" });
});
app.use("/api/auth", authRoutes);
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