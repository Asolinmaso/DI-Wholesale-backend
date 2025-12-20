const mongoose = require("mongoose")

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    images: { type: [String], default: [] } // relative paths, e.g. /uploads/...
  },
  { timestamps: true }
)

module.exports = mongoose.model("Category", CategorySchema)


