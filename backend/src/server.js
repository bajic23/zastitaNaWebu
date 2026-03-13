const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const passport = require("./config/passport");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const contentRoutes = require("./routes/content");
const logAccess = require("./middlewares/logAccess");


const app = express();
app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api", logAccess);

app.get("/", (req, res) => {
  res.json({ message: "Backend radi" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/content", contentRoutes);

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