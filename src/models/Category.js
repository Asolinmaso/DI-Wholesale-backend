const mongoose = require("mongoose")

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: "" } // relative path, e.g. /uploads/...
  },
  { timestamps: true }
)

module.exports = mongoose.model("Category", CategorySchema)


