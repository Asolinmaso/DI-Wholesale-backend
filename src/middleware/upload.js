const path = require("path")
const fs = require("fs")
const multer = require("multer")

const uploadDir = path.join(process.cwd(), "backend", "uploads")
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

function safeExt(originalname) {
  const ext = path.extname(originalname || "").toLowerCase()
  if (!ext || ext.length > 10) return ""
  return ext.replace(/[^a-z0-9.]/g, "")
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir)
  },
  filename: function (_req, file, cb) {
    const ext = safeExt(file.originalname)
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    cb(null, `${id}${ext}`)
  },
})

const upload = multer({ storage })

function toPublicUploadPath(file) {
  return `/uploads/${file.filename}`
}

module.exports = { upload, uploadDir, toPublicUploadPath }


