const express = require("express")
const Product = require("../models/Product")
const SubProduct = require("../models/SubProduct")
const { uploadFields, processUploads } = require("../middleware/upload")

const router = express.Router()

// List products (optionally filter by categoryId) with pagination
router.get("/", async (req, res) => {
  try {
    const q = {}
    if (req.query.categoryId) q.categoryId = req.query.categoryId

    // Pagination parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 12 // Default 12 products per page
    const skip = (page - 1) * limit

    // Get total count for pagination info
    const total = await Product.countDocuments(q)

    // Get paginated products
    const products = await Product.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    res.json({
      data: products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts: total,
        productsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

// Sub-products routes MUST come before /:id routes to prevent route conflicts
router.get("/:id/sub-products", async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 12 // Default 12 sub-products per page
    const skip = (page - 1) * limit

    // Get total count for pagination info
    const total = await SubProduct.countDocuments({ productId: req.params.id })

    // Get paginated sub-products
    const items = await SubProduct.find({ productId: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    res.json({
      data: items,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts: total,
        productsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    })
  } catch (error) {
    console.error('Error fetching sub-products:', error)
    res.status(500).json({ error: 'Failed to fetch sub-products' })
  }
})

router.post("/:id/sub-products", uploadFields, processUploads, async (req, res) => {
  const name = String(req.body?.name || "").trim()
  if (!name) return res.status(400).json({ error: "name is required" })

  let images = Array.isArray(req.body.images)
    ? req.body.images // Cloudinary URLs from processUploads
    : []

  // Check if this is a medicine category product and no images were uploaded
  if (images.length === 0) {
    const Product = require("../models/Product")
    const Category = require("../models/Category")
    const product = await Product.findById(req.params.id)
    if (product) {
      const category = await Category.findById(product.categoryId)
      if (category && (category.name?.toLowerCase().includes("medicine") || category.slug?.toLowerCase().includes("medicine"))) {
        // Set default medicine image
        images = ["/Medicine_image.png"]
      }
    }
  }

  const created = await SubProduct.create({
    productId: req.params.id,
    name,
    images,
    productSize: String(req.body?.productSize || ""),
    productShape: String(req.body?.productShape || ""),
    minimumQuantity: 10, // Always 10 for users
    stockCount: Number(req.body?.stockCount || 0), // Stocks field
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
  patch.minimumQuantity = 10 // Always 10 for users
  if (req.body?.stockCount !== undefined) patch.stockCount = Number(req.body.stockCount || 0) // Stocks field
  if (req.body?.material !== undefined) patch.material = String(req.body.material)
  if (req.body?.description !== undefined) patch.description = String(req.body.description)
  if (req.body?.composition !== undefined) patch.composition = String(req.body.composition)
  if (req.body?.packing !== undefined) patch.packing = String(req.body.packing)
  if (Array.isArray(req.body.images) && req.body.images.length > 0) {
    patch.images = req.body.images // Cloudinary URLs from processUploads
  } else {
    // If no images provided and existing product has no images, check if it's a medicine
    const SubProduct = require("../models/SubProduct")
    const Product = require("../models/Product")
    const Category = require("../models/Category")
    const existing = await SubProduct.findOne({ _id: req.params.subId, productId: req.params.id })
    if (existing && (!existing.images || existing.images.length === 0)) {
      const product = await Product.findById(req.params.id)
      if (product) {
        const category = await Category.findById(product.categoryId)
        if (category && (category.name?.toLowerCase().includes("medicine") || category.slug?.toLowerCase().includes("medicine"))) {
          patch.images = ["/Medicine_image.png"]
        }
      }
    }
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

// Cloudinary image management routes
router.get("/images", async (req, res) => {
  try {
    const { folder = 'di-wholesale', max_results = 100 } = req.query

    const result = await new Promise((resolve, reject) => {
      const cloudinary = require("cloudinary").v2
      cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results: parseInt(max_results)
      }, (error, result) => {
        if (error) reject(error)
        else resolve(result)
      })
    })

    res.json({
      success: true,
      images: result.resources,
      total: result.resources.length
    })
  } catch (error) {
    console.error('Error fetching images:', error)
    res.status(500).json({ error: 'Failed to fetch images from Cloudinary' })
  }
})

// Get specific image details
router.get("/images/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params

    const result = await new Promise((resolve, reject) => {
      const cloudinary = require("cloudinary").v2
      cloudinary.api.resource(publicId, (error, result) => {
        if (error) reject(error)
        else resolve(result)
      })
    })

    res.json({
      success: true,
      image: result
    })
  } catch (error) {
    console.error('Error fetching image details:', error)
    res.status(500).json({ error: 'Failed to fetch image details from Cloudinary' })
  }
})

// Search images
router.get("/images/search/:query", async (req, res) => {
  try {
    const { query } = req.params
    const { folder = 'di-wholesale' } = req.query

    const result = await new Promise((resolve, reject) => {
      const cloudinary = require("cloudinary").v2
      cloudinary.search
        .expression(`folder:${folder} AND ${query}`)
        .max_results(100)
        .execute((error, result) => {
          if (error) reject(error)
          else resolve(result)
        })
    })

    res.json({
      success: true,
      images: result.resources,
      total: result.resources.length
    })
  } catch (error) {
    console.error('Error searching images:', error)
    res.status(500).json({ error: 'Failed to search images' })
  }
})

module.exports = router


