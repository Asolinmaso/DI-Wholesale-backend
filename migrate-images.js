// Migration script to move existing local images to Cloudinary
// Run with: node migrate-images.js

const fs = require('fs')
const path = require('path')
const cloudinary = require('cloudinary').v2
const mongoose = require('mongoose')
const { env } = require('./src/env')

// Models
const Category = require('./src/models/Category')
const Product = require('./src/models/Product')
const SubProduct = require('./src/models/SubProduct')

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'ddriavoau',
  api_key: '821316138248716',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
})

const uploadDir = path.join(process.cwd(), 'backend', 'uploads')

async function migrateImages() {
  try {
    // Connect to database
    await mongoose.connect(env.MONGODB_URI)
    console.log('Connected to database')

    // Migrate categories
    console.log('Migrating category images...')
    const categories = await Category.find({ images: { $exists: true, $ne: [] } })
    for (const category of categories) {
      const newImages = []
      for (const imagePath of category.images) {
        if (imagePath.startsWith('/uploads/')) {
          // Local image, migrate to Cloudinary
          const localPath = path.join(uploadDir, path.basename(imagePath))
          if (fs.existsSync(localPath)) {
            try {
              const result = await cloudinary.uploader.upload(localPath, {
                folder: 'di-wholesale/categories'
              })
              newImages.push(result.secure_url)
              console.log(`Migrated category image: ${imagePath} -> ${result.secure_url}`)
            } catch (error) {
              console.error(`Failed to migrate ${imagePath}:`, error.message)
              newImages.push(imagePath) // Keep original if migration fails
            }
          } else {
            newImages.push(imagePath) // Keep original if file doesn't exist
          }
        } else {
          newImages.push(imagePath) // Already a full URL
        }
      }
      await Category.findByIdAndUpdate(category._id, { images: newImages })
    }

    // Migrate products (subcategories)
    console.log('Migrating product images...')
    const products = await Product.find({ images: { $exists: true, $ne: [] } })
    for (const product of products) {
      const newImages = []
      for (const imagePath of product.images) {
        if (imagePath.startsWith('/uploads/')) {
          const localPath = path.join(uploadDir, path.basename(imagePath))
          if (fs.existsSync(localPath)) {
            try {
              const result = await cloudinary.uploader.upload(localPath, {
                folder: 'di-wholesale/products'
              })
              newImages.push(result.secure_url)
              console.log(`Migrated product image: ${imagePath} -> ${result.secure_url}`)
            } catch (error) {
              console.error(`Failed to migrate ${imagePath}:`, error.message)
              newImages.push(imagePath)
            }
          } else {
            newImages.push(imagePath)
          }
        } else {
          newImages.push(imagePath)
        }
      }
      await Product.findByIdAndUpdate(product._id, { images: newImages })
    }

    // Migrate sub-products
    console.log('Migrating sub-product images...')
    const subProducts = await SubProduct.find({ images: { $exists: true, $ne: [] } })
    for (const subProduct of subProducts) {
      const newImages = []
      for (const imagePath of subProduct.images) {
        if (imagePath.startsWith('/uploads/')) {
          const localPath = path.join(uploadDir, path.basename(imagePath))
          if (fs.existsSync(localPath)) {
            try {
              const result = await cloudinary.uploader.upload(localPath, {
                folder: 'di-wholesale/sub-products'
              })
              newImages.push(result.secure_url)
              console.log(`Migrated sub-product image: ${imagePath} -> ${result.secure_url}`)
            } catch (error) {
              console.error(`Failed to migrate ${imagePath}:`, error.message)
              newImages.push(imagePath)
            }
          } else {
            newImages.push(imagePath)
          }
        } else {
          newImages.push(imagePath)
        }
      }
      await SubProduct.findByIdAndUpdate(subProduct._id, { images: newImages })
    }

    console.log('Migration completed!')

  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from database')
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateImages()
}

module.exports = { migrateImages }
