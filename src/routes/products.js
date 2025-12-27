const express = require("express")
const Product = require("../models/Product")
const SubProduct = require("../models/SubProduct")
const { uploadFields, processUploads } = require("../middleware/upload")

const router = express.Router()

// List products (optionally filter by categoryId)
router.get("/", async (req, res) => {
  const q = {}
  if (req.query.categoryId) q.categoryId = req.query.categoryId
  const products = await Product.find(q).sort({ createdAt: -1 }).lean()
  res.json({ data: products })
})

// Sub-products routes MUST come before /:id routes to prevent route conflicts
router.get("/:id/sub-products", async (req, res) => {
  const items = await SubProduct.find({ productId: req.params.id }).sort({ createdAt: -1 }).lean()
  res.json({ data: items })
})

router.post("/:id/sub-products", uploadFields, processUploads, async (req, res) => {
  const name = String(req.body?.name || "").trim()
  if (!name) return res.status(400).json({ error: "name is required" })

  const images = Array.isArray(req.body.images)
    ? req.body.images // Cloudinary URLs from processUploads
    : []

  const created = await SubProduct.create({
    productId: req.params.id,
    name,
    images,
    productSize: String(req.body?.productSize || ""),
    productShape: String(req.body?.productShape || ""),
    minimumQuantity: Number(req.body?.minimumQuantity || 0),
    material: String(req.body?.material || ""),
    description: String(req.body?.description || ""),
    composition: String(req.body?.composition || ""),
    packing: String(req.body?.packing || ""),
  })

  res.status(201).json({ data: created })
})

router.put("/:id/sub-products/:subId", uploadFields, processUploads, async (req, res) => {
  const patch = {}
  if (req.body?.name !== undefined) patch.name = String(req.body.name).trim()
  if (req.body?.productSize !== undefined) patch.productSize = String(req.body.productSize)
  if (req.body?.productShape !== undefined) patch.productShape = String(req.body.productShape)
  if (req.body?.minimumQuantity !== undefined) patch.minimumQuantity = Number(req.body.minimumQuantity || 0)
  if (req.body?.material !== undefined) patch.material = String(req.body.material)
  if (req.body?.description !== undefined) patch.description = String(req.body.description)
  if (req.body?.composition !== undefined) patch.composition = String(req.body.composition)
  if (req.body?.packing !== undefined) patch.packing = String(req.body.packing)
  if (Array.isArray(req.body.images) && req.body.images.length > 0) {
    patch.images = req.body.images // Cloudinary URLs from processUploads
  }

  const updated = await SubProduct.findOneAndUpdate(
    { _id: req.params.subId, productId: req.params.id },
    patch,
    { new: true }
  )
  if (!updated) return res.status(404).json({ error: "not found" })
  res.json({ data: updated })
})

router.delete("/:id/sub-products/:subId", async (req, res) => {
  const deleted = await SubProduct.findOneAndDelete({
    _id: req.params.subId,
    productId: req.params.id,
  })
  if (!deleted) return res.status(404).json({ error: "not found" })
  res.json({ ok: true })
})

// Product routes
router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean()
  if (!product) return res.status(404).json({ error: "not found" })
  res.json({ data: product })
})

router.post("/", uploadFields, processUploads, async (req, res) => {
  const name = String(req.body?.name || "").trim()
  const categoryId = String(req.body?.categoryId || "").trim()
  if (!name) return res.status(400).json({ error: "name is required" })
  if (!categoryId) return res.status(400).json({ error: "categoryId is required" })

  const images = Array.isArray(req.body.images)
    ? req.body.images // Cloudinary URLs from processUploads
    : []

  const product = await Product.create({
    name,
    description: String(req.body?.description || ""),
    productSize: String(req.body?.productSize || ""),
    productShape: String(req.body?.productShape || ""),
    minimumQuantity: Number(req.body?.minimumQuantity || 0),
    material: String(req.body?.material || ""),
    categoryId,
    price: Number(req.body?.price || 0),
    stockCount: Number(req.body?.stockCount || 0),
    images,
  })

  res.status(201).json({ data: product })
})

router.put("/:id", uploadFields, processUploads, async (req, res) => {
  const patch = {}
  if (req.body?.name !== undefined) patch.name = String(req.body.name).trim()
  if (req.body?.description !== undefined) patch.description = String(req.body.description)
  if (req.body?.productSize !== undefined) patch.productSize = String(req.body.productSize)
  if (req.body?.productShape !== undefined) patch.productShape = String(req.body.productShape)
  if (req.body?.minimumQuantity !== undefined) patch.minimumQuantity = Number(req.body.minimumQuantity || 0)
  if (req.body?.material !== undefined) patch.material = String(req.body.material)
  if (req.body?.categoryId !== undefined) patch.categoryId = String(req.body.categoryId).trim()
  if (req.body?.price !== undefined) patch.price = Number(req.body.price || 0)
  if (req.body?.stockCount !== undefined) patch.stockCount = Number(req.body.stockCount || 0)

  if (Array.isArray(req.body.images) && req.body.images.length > 0) {
    patch.images = req.body.images // Cloudinary URLs from processUploads
  }

  const updated = await Product.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!updated) return res.status(404).json({ error: "not found" })
  res.json({ data: updated })
})

router.delete("/:id", async (req, res) => {
  const deleted = await Product.findByIdAndDelete(req.params.id)
  if (!deleted) return res.status(404).json({ error: "not found" })
  await SubProduct.deleteMany({ productId: req.params.id })
  res.json({ ok: true })
})

module.exports = router


