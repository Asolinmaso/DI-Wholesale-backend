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
    images: { type: [String], default: [] },
    productSize: { type: String, default: "" },
    productShape: { type: String, default: "" },
    minimumQuantity: { type: Number, default: 0 },
    material: { type: String, default: "" },
    description: { type: String, default: "" },
    composition: { type: String, default: "" },
    packing: { type: String, default: "" }
  },
  { timestamps: true }
)

module.exports = mongoose.model("SubProduct", SubProductSchema)


