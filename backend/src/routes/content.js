import express from "express";
import requireAuth from "../middlewares/requireAuth.js";

const router = express.Router();

const contentData = [
  {
    id: "1",
    title: "Prvi članak",
    text: "Ovo je prvi zaštićeni sadržaj.",
    roles: ["USER", "ADMIN"],
  },
  {
    id: "2",
    title: "Drugi članak",
    text: "Ovo je drugi sadržaj za korisnike.",
    roles: ["USER", "ADMIN"],
  },
  {
    id: "3",
    title: "Admin dokument",
    text: "Ovo može videti samo admin.",
    roles: ["ADMIN"],
  },
];

router.get("/:id", requireAuth, (req, res) => {
  const content = contentData.find((c) => c.id === req.params.id);

  if (!content) {
    return res.status(404).json({ message: "Content not found" });
  }

  const userRole = req.user?.role;

  if (!content.roles.includes(userRole)) {
    return res.status(403).json({ message: "Nemate pravo pristupa ovom sadržaju." });
  }

  res.json(content);
});

export default router;