const express = require("express")
const Category = require("../models/Category")
const { slugify } = require("../utils/slug")
const { uploadFields, processUploads } = require("../middleware/upload")

const router = express.Router()

router.get("/", async (_req, res) => {
  const categories = await Category.find({}).sort({ createdAt: -1 }).lean()
  // Normalize old data: convert image (singular) to images (array) if needed
  const normalized = categories.map((cat) => {
    if (cat.image && (!cat.images || cat.images.length === 0)) {
      cat.images = [cat.image]
      delete cat.image
    }
    return cat
  })
  res.json({ data: normalized })
})

router.post("/", uploadFields, processUploads, async (req, res) => {
  const name = String(req.body?.name || "").trim()
  if (!name) return res.status(400).json({ error: "name is required" })

  const slug = slugify(req.body?.slug || name)
  if (!slug) return res.status(400).json({ error: "slug is required" })

  const images = Array.isArray(req.body.images)
    ? req.body.images // Cloudinary URLs from processUploads
    : []

  try {
    const category = await Category.create({ name, slug, images })
    res.status(201).json({ data: category })
  } catch (e) {
    if (String(e?.code) === "11000") {
      return res.status(409).json({ error: "slug already exists" })
    }
    throw e
  }
})

router.put("/:id", uploadFields, processUploads, async (req, res) => {
  const id = req.params.id
  const patch = {}

  if (req.body?.name !== undefined) patch.name = String(req.body.name).trim()
  if (req.body?.slug !== undefined) patch.slug = slugify(req.body.slug)
  if (Array.isArray(req.body.images) && req.body.images.length > 0) {
    patch.images = req.body.images // Cloudinary URLs from processUploads
  }

  const updated = await Category.findByIdAndUpdate(id, patch, { new: true })
  if (!updated) return res.status(404).json({ error: "not found" })
  res.json({ data: updated })
})

router.delete("/:id", async (req, res) => {
  const deleted = await Category.findByIdAndDelete(req.params.id)
  if (!deleted) return res.status(404).json({ error: "not found" })
  res.json({ ok: true })
})

module.exports = router


