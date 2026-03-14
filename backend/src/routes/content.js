const express = require("express");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

const contentData = [
  {
    id: "1",
    title: "User sadržaj",
    text: "Ovo je sadržaj koji može da vidi USER, MANAGER i ADMIN.",
    roles: ["USER", "MANAGER", "ADMIN"]
  },
  {
    id: "2",
    title: "Opšti zaštićeni sadržaj",
    text: "Ovo je drugi sadržaj dostupan svim ulogovanim korisnicima.",
    roles: ["USER", "MANAGER", "ADMIN"]
  },
  {
    id: "3",
    title: "Admin dokument",
    text: "Ovo može videti samo ADMIN.",
    roles: ["ADMIN"]
  },
  {
    id: "4",
    title: "Manager dokument",
    text: "Ovo mogu videti MANAGER i ADMIN.",
    roles: ["MANAGER", "ADMIN"]
  }
];

router.get("/:id", requireAuth, (req, res) => {
  const content = contentData.find((c) => c.id === req.params.id);

  if (!content) {
    return res.status(404).json({ message: "Content not found" });
  }

  const userRole = req.user?.role;

  if (!content.roles.includes(userRole)) {
    return res
      .status(403)
      .json({ message: "Nemate pravo pristupa ovom sadržaju." });
  }

  return res.json(content);
});

module.exports = router;