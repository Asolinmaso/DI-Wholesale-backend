const dotenv = require("dotenv")

dotenv.config()

function mustGet(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 4000),
  MONGODB_URI: process.env.MONGODB_URI || mustGet("MONGO_URI"),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
}

module.exports = { env }


