const express = require("express");
const mongoose = require("mongoose");

const Destination = require("../models/Destination");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

const handleValidation = require("../middlewares/handleValidation");
const { destinationValidator } = require("../validators");

// CREATE destination
router.post(
  "/",
  requireAuth,
  requireRole("OPERATOR"),
  destinationValidator,
  handleValidation,
  async (req, res) => {
  try {
    const { name, country, description } = req.body ?? {};

    if (!name || !country) {
      return res.status(400).json({
        message: "Naziv i država destinacije su obavezni."
      });
    }

    const destination = await Destination.create({
      name: String(name).trim(),
      country: String(country).trim(),
      description: String(description || "").trim()
    });

    return res.status(201).json({
      message: "Destinacija je uspešno kreirana.",
      destination
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// READ all
router.get("/", async (req, res) => {
  try {
    const destinations = await Destination.find({}).sort({
      createdAt: -1
    });

    return res.json({ destinations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// READ by id 
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Nevalidan ID destinacije." });
    }

    const destination = await Destination.findById(req.params.id);

    if (!destination) {
      return res.status(404).json({ message: "Destinacija nije pronađena." });
    }

    return res.json({ destination });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// UPDATE destination 
router.put(
  "/:id",
  requireAuth,
  requireRole("OPERATOR"),
  destinationValidator,
  handleValidation,
  async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Nevalidan ID destinacije." });
    }

    const { name, country, description } = req.body ?? {};

    if (!name || !country) {
      return res.status(400).json({
        message: "Naziv i država destinacije su obavezni."
      });
    }

    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      {
        name: String(name).trim(),
        country: String(country).trim(),
        description: String(description || "").trim()
      },
      { new: true, runValidators: true }
    );

    if (!destination) {
      return res.status(404).json({ message: "Destinacija nije pronađena." });
    }

    return res.json({
      message: "Destinacija je uspešno ažurirana.",
      destination
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// DELETE destination
router.delete(
  "/:id",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Nevalidan ID destinacije." });
      }

      const destination = await Destination.findByIdAndDelete(req.params.id);

      if (!destination) {
        return res.status(404).json({ message: "Destinacija nije pronađena." });
      }

      return res.json({ message: "Destinacija je uspešno obrisana." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Greška na serveru." });
    }
  }
);

module.exports = router;