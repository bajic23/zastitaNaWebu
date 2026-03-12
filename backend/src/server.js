import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import contentRoutes from "./routes/content.js";
import logAccess from "./middlewares/logAccess.js";

dotenv.config();
const app = express();
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);


app.use(express.json());
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