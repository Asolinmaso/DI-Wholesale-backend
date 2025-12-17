const express = require("express")
const Product = require("../models/Product")
const SubProduct = require("../models/SubProduct")
const { upload, toPublicUploadPath } = require("../middleware/upload")

const router = express.Router()

// List products (optionally filter by categoryId)
router.get("/", async (req, res) => {
  const q = {}
  if (req.query.categoryId) q.categoryId = req.query.categoryId
  const products = await Product.find(q).sort({ createdAt: -1 }).lean()
  res.json({ data: products })
})

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean()
  if (!product) return res.status(404).json({ error: "not found" })
  res.json({ data: product })
})

router.post("/", upload.array("images", 10), async (req, res) => {
  const name = String(req.body?.name || "").trim()
  const categoryId = String(req.body?.categoryId || "").trim()
  if (!name) return res.status(400).json({ error: "name is required" })
  if (!categoryId) return res.status(400).json({ error: "categoryId is required" })

  const images = Array.isArray(req.files)
    ? req.files.map((f) => toPublicUploadPath(f))
    : []

  const product = await Product.create({
    name,
    description: String(req.body?.description || ""),
    categoryId,
    price: Number(req.body?.price || 0),
    stockCount: Number(req.body?.stockCount || 0),
    images,
  })

  res.status(201).json({ data: product })
})

router.put("/:id", upload.array("images", 10), async (req, res) => {
  const patch = {}
  if (req.body?.name !== undefined) patch.name = String(req.body.name).trim()
  if (req.body?.description !== undefined) patch.description = String(req.body.description)
  if (req.body?.categoryId !== undefined) patch.categoryId = String(req.body.categoryId).trim()
  if (req.body?.price !== undefined) patch.price = Number(req.body.price || 0)
  if (req.body?.stockCount !== undefined) patch.stockCount = Number(req.body.stockCount || 0)

  if (Array.isArray(req.files) && req.files.length > 0) {
    patch.images = req.files.map((f) => toPublicUploadPath(f))
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

// Sub-products
router.get("/:id/sub-products", async (req, res) => {
  const items = await SubProduct.find({ productId: req.params.id }).sort({ createdAt: -1 }).lean()
  res.json({ data: items })
})

router.post("/:id/sub-products", upload.array("images", 10), async (req, res) => {
  const name = String(req.body?.name || "").trim()
  if (!name) return res.status(400).json({ error: "name is required" })

  const images = Array.isArray(req.files)
    ? req.files.map((f) => toPublicUploadPath(f))
    : []

  const created = await SubProduct.create({
    productId: req.params.id,
    name,
    sku: String(req.body?.sku || ""),
    price: Number(req.body?.price || 0),
    stockCount: Number(req.body?.stockCount || 0),
    images,
  })

  res.status(201).json({ data: created })
})

router.delete("/:id/sub-products/:subId", async (req, res) => {
  const deleted = await SubProduct.findOneAndDelete({
    _id: req.params.subId,
    productId: req.params.id,
  })
  if (!deleted) return res.status(404).json({ error: "not found" })
  res.json({ ok: true })
})

module.exports = router


