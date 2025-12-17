const express = require("express")
const Category = require("../models/Category")
const { slugify } = require("../utils/slug")
const { upload, toPublicUploadPath } = require("../middleware/upload")

const router = express.Router()

router.get("/", async (_req, res) => {
  const categories = await Category.find({}).sort({ createdAt: -1 }).lean()
  res.json({ data: categories })
})

router.post("/", upload.single("image"), async (req, res) => {
  const name = String(req.body?.name || "").trim()
  if (!name) return res.status(400).json({ error: "name is required" })

  const slug = slugify(req.body?.slug || name)
  if (!slug) return res.status(400).json({ error: "slug is required" })

  const image = req.file ? toPublicUploadPath(req.file) : ""

  try {
    const category = await Category.create({ name, slug, image })
    res.status(201).json({ data: category })
  } catch (e) {
    if (String(e?.code) === "11000") {
      return res.status(409).json({ error: "slug already exists" })
    }
    throw e
  }
})

router.put("/:id", upload.single("image"), async (req, res) => {
  const id = req.params.id
  const patch = {}

  if (req.body?.name !== undefined) patch.name = String(req.body.name).trim()
  if (req.body?.slug !== undefined) patch.slug = slugify(req.body.slug)
  if (req.file) patch.image = toPublicUploadPath(req.file)

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


