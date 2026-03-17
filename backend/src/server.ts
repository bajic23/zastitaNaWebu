// @ts-nocheck
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const passport = require("./config/passport");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const destinationRoutes = require("./routes/destinations");
const travelRoutes = require("./routes/travels");
const logAccess = require("./middlewares/logAccess");
const logger = require("./utils/logger");

const app = express();

app.use("/uploads", express.static("uploads"));
app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
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
app.use("/api/destinations", destinationRoutes);
app.use("/api/travels", travelRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message || err);

  if (err.name === "MulterError") {
    return res.status(400).json({
      message: `Greška pri upload-u: ${err.message}`,
    });
  }

  if (err.message === "Dozvoljene su samo slike.") {
    return res.status(400).json({ message: err.message });
  }

  return res.status(500).json({
    message: "Greška na serveru.",
  });
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "travel-api",
    });

    logger.info("MongoDB connected");

    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        try {
          await mongoose.connection.close();
          logger.info("MongoDB connection closed");
          process.exit(0);
        } catch (error) {
          logger.error(error.stack || error.message || error);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => {
      gracefulShutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      gracefulShutdown("SIGTERM");
    });
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}

start();
