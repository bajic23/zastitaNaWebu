const { body } = require("express-validator");
const mongoose = require("mongoose");

const registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Ime i prezime su obavezni.")
    .isLength({ min: 2 })
    .withMessage("Ime i prezime moraju imati bar 2 karaktera."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email je obavezan.")
    .isEmail()
    .withMessage("Email nije u validnom formatu.")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Lozinka je obavezna.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/)
    .withMessage(
      "Lozinka mora imati minimum 10 karaktera i bar 1 veliko slovo, 1 malo slovo, 1 broj i 1 specijalni znak."
    )
];

const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email je obavezan.")
    .isEmail()
    .withMessage("Email nije u validnom formatu.")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Lozinka je obavezna.")
];

const updateMeValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Ime je obavezno.")
    .isLength({ min: 2 })
    .withMessage("Ime mora imati bar 2 karaktera."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email je obavezan.")
    .isEmail()
    .withMessage("Email nije u validnom formatu.")
    .normalizeEmail()
];

const destinationValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Naziv destinacije je obavezan."),

  body("country")
    .trim()
    .notEmpty()
    .withMessage("Država destinacije je obavezna."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Opis je predugačak.")
];

const travelValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Naziv putovanja je obavezan."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Opis je predugačak."),

  body("price")
    .notEmpty()
    .withMessage("Cena je obavezna.")
    .isFloat({ min: 0 })
    .withMessage("Cena mora biti broj veći ili jednak nuli."),

  body("destination")
    .notEmpty()
    .withMessage("Destinacija je obavezna.")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Nevalidan ID destinacije."),

  body("imageUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("imageUrl mora biti validan URL.")
];

module.exports = {
  registerValidator,
  loginValidator,
  updateMeValidator,
  destinationValidator,
  travelValidator
};