const express = require("express");
const mongoose = require("mongoose");

const Travel = require("../models/Travel");
const Destination = require("../models/Destination");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const upload = require("../middlewares/upload");

const router = express.Router();

const handleValidation = require("../middlewares/handleValidation");
const { travelValidator } = require("../validators");

// CREATE travel
router.post(
  "/",
  requireAuth,
  requireRole("OPERATOR"),
  upload.single("image"),
  travelValidator,
  handleValidation,
  async (req, res) => {
    try {
      const { title, description, price, destination, imageUrl } =
        req.body ?? {};

      if (!title || price === undefined || !destination) {
        return res.status(400).json({
          message: "Naziv, cena i destinacija su obavezni.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(destination)) {
        return res.status(400).json({ message: "Nevalidan ID destinacije." });
      }

      const destinationExists = await Destination.findById(destination);
      if (!destinationExists) {
        return res.status(404).json({ message: "Destinacija nije pronađena." });
      }

      const travel = await Travel.create({
        title: String(title).trim(),
        description: String(description || "").trim(),
        price: Number(price),
        destination,
        imageUrl: req.file
          ? `/uploads/${req.file.filename}`
          : String(imageUrl || "").trim(),
        createdBy: req.user.id,
      });

      const populatedTravel = await Travel.findById(travel._id)
        .populate("destination", "name country description")
        .populate("createdBy", "name email role");

      return res.status(201).json({
        message: "Putovanje je uspešno kreirano.",
        travel: populatedTravel,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Greška na serveru." });
    }
  },
);

// READ all
router.get("/", async (req, res) => {
  try {
    const {
      destination,
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 10,
      search = "",
    } = req.query;

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.max(Number(limit) || 10, 1);

    const query = {};

    if (destination) {
      if (!mongoose.Types.ObjectId.isValid(destination)) {
        return res.status(400).json({ message: "Nevalidan ID destinacije." });
      }
      query.destination = destination;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};

      if (minPrice !== undefined && minPrice !== "") {
        query.price.$gte = Number(minPrice);
      }

      if (maxPrice !== undefined && maxPrice !== "") {
        query.price.$lte = Number(maxPrice);
      }
    }

    if (search) {
      query.title = { $regex: String(search).trim(), $options: "i" };
    }

    let sortOption = { createdAt: -1 };

    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "priceAsc") {
      sortOption = { price: 1 };
    } else if (sort === "priceDesc") {
      sortOption = { price: -1 };
    } else if (sort === "titleAsc") {
      sortOption = { title: 1 };
    } else if (sort === "titleDesc") {
      sortOption = { title: -1 };
    }

    const total = await Travel.countDocuments(query);

    const travels = await Travel.find(query)
      .populate("destination", "name country description")
      .populate("createdBy", "name email role")
      .sort(sortOption)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return res.json({
      travels,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// READ by slug
router.get("/:slug", async (req, res) => {
  try {
    const travel = await Travel.findOne({ slug: req.params.slug })
      .populate("destination", "name country description")
      .populate("createdBy", "name email role");

    if (!travel) {
      return res.status(404).json({ message: "Putovanje nije pronađeno." });
    }

    return res.json({ travel });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// UPDATE travel
router.put(
  "/:id",
  requireAuth,
  requireRole("OPERATOR"),
  upload.single("image"),
  travelValidator,
  handleValidation,
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Nevalidan ID putovanja." });
      }

      const { title, description, price, destination, imageUrl } =
        req.body ?? {};

      if (!title || price === undefined || !destination) {
        return res.status(400).json({
          message: "Naziv, cena i destinacija su obavezni.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(destination)) {
        return res.status(400).json({ message: "Nevalidan ID destinacije." });
      }

      const destinationExists = await Destination.findById(destination);
      if (!destinationExists) {
        return res.status(404).json({ message: "Destinacija nije pronađena." });
      }

      const travel = await Travel.findById(req.params.id);

      if (!travel) {
        return res.status(404).json({ message: "Putovanje nije pronađeno." });
      }

      travel.title = String(title).trim();
      travel.description = String(description || "").trim();
      travel.price = Number(price);
      travel.destination = destination;
      if (req.file) {
        travel.imageUrl = `/uploads/${req.file.filename}`;
      } else {
        travel.imageUrl = String(imageUrl || "").trim();
      }

      await travel.save();

      const populatedTravel = await Travel.findById(travel._id)
        .populate("destination", "name country description")
        .populate("createdBy", "name email role");

      return res.json({
        message: "Putovanje je uspešno ažurirano.",
        travel: populatedTravel,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Greška na serveru." });
    }
  },
);

// DELETE travel
router.delete(
  "/:id",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Nevalidan ID putovanja." });
      }

      const travel = await Travel.findByIdAndDelete(req.params.id);

      if (!travel) {
        return res.status(404).json({ message: "Putovanje nije pronađeno." });
      }

      return res.json({ message: "Putovanje je uspešno obrisano." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Greška na serveru." });
    }
  },
);

module.exports = router;
