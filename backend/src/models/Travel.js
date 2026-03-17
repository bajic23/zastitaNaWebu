const mongoose = require("mongoose");
const slugify = require("slugify");

const travelSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
    },

    imageUrl: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

travelSchema.pre("validate", async function () {
  if (!this.isModified("title") && this.slug) {
    return;
  }

  const baseSlug = slugify(this.title || "", {
    lower: true,
    strict: true,
    trim: true,
  });

  if (!baseSlug) {
    return;
  }

  let slug = baseSlug;
  let counter = 1;

  const Travel = mongoose.models.Travel;

  while (true) {
    const existing = await Travel.findOne({
      slug,
      _id: { $ne: this._id },
    });

    if (!existing) {
      break;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  this.slug = slug;
});

module.exports = mongoose.model("Travel", travelSchema);
