const multer = require("multer")
const cloudinary = require("cloudinary").v2

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'ddriavoau',
  api_key: '821316138248716',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'qKSz77nZuLXXxa_9mDDqh1laKu0'
})

// Custom multer storage for Cloudinary
const storage = multer.memoryStorage()

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(file.originalname.toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'))
    }
  }
})

// Middleware to upload files to Cloudinary after multer processing
const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 }
])

// Process uploaded files and upload to Cloudinary
const processUploads = async (req, res, next) => {
  try {
    if (req.files && req.files.images) {
      const cloudinaryUrls = []

      for (const file of req.files.images) {
        try {
          // Upload buffer to Cloudinary
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'di-wholesale',
                public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                transformation: [
                  { width: 1000, height: 1000, crop: 'limit' },
                  { quality: 'auto' }
                ]
              },
              (error, result) => {
                if (error) reject(error)
                else resolve(result)
              }
            )
            stream.end(file.buffer)
          })

          cloudinaryUrls.push(result.secure_url)
        } catch (error) {
          console.error('Cloudinary upload error:', error)
          // Continue with other files even if one fails
          continue
        }
      }

      // Replace req.files with Cloudinary URLs
      req.body.images = cloudinaryUrls
    }

    next()
  } catch (error) {
    console.error('Upload processing error:', error)
    res.status(500).json({ error: 'Failed to process uploads' })
  }
}

// Function to upload buffer to Cloudinary (for existing images)
async function uploadToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'di-wholesale',
        public_id: filename,
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    stream.end(buffer)
  })
}

// Function to delete from Cloudinary
async function deleteFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) reject(error)
      else resolve(result)
    })
  })
}

// Extract public ID from Cloudinary URL
function getPublicIdFromUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return null
  const parts = url.split('/')
  const filename = parts[parts.length - 1]
  const publicId = filename.split('.')[0]
  return `di-wholesale/${publicId}`
}

module.exports = {
  upload,
  uploadFields,
  processUploads,
  deleteFromCloudinary,
  getPublicIdFromUrl,
  uploadDir: null // Not used with Cloudinary
}


