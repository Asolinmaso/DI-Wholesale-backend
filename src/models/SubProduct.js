const mongoose = require("mongoose")

const SubProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: "" },
    price: { type: Number, default: 0 },
    stockCount: { type: Number, default: 0 },
    images: { type: [String], default: [] }
  },
  { timestamps: true }
)

module.exports = mongoose.model("SubProduct", SubProductSchema)


