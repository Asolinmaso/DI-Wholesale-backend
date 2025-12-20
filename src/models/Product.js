const mongoose = require("mongoose")

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    productSize: { type: String, default: "" },
    productShape: { type: String, default: "" },
    minimumQuantity: { type: Number, default: 0 },
    material: { type: String, default: "" },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    price: { type: Number, default: 0 },
    stockCount: { type: Number, default: 0 },
    images: { type: [String], default: [] } // relative paths
  },
  { timestamps: true }
)

module.exports = mongoose.model("Product", ProductSchema)


