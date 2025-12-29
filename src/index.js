const express = require("express")
const cors = require("cors")
const { env } = require("./env")
const { connectDb } = require("./db")
const categoriesRouter = require("./routes/categories")
const productsRouter = require("./routes/products")
async function main() {
  await connectDb()

  const app = express()

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  )
  app.use(express.json({ limit: "2mb" }))
  app.use(express.urlencoded({ extended: true }))

  // Images are now served from Cloudinary, no local static files needed

  app.get("/health", (_req, res) => res.json({ ok: true }))

  // Test Cloudinary connection
  app.get("/api/test-cloudinary", async (_req, res) => {
    try {
      const cloudinary = require("cloudinary").v2
      // Test basic Cloudinary connection
      const result = await cloudinary.api.ping()
      res.json({ status: "Cloudinary connected", result })
    } catch (error) {
      res.status(500).json({ error: "Cloudinary connection failed", details: error.message })
    }
  })

  app.use("/api/auth", require("./routes/auth"))
  app.use("/api/categories", categoriesRouter)
  app.use("/api/products", productsRouter)
  app.use("/api/orders", require("./routes/orders"))

  // basic error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: "internal_error" })
  })

  app.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`)
    console.log(`CORS origin: ${env.CORS_ORIGIN}`)
    console.log(`Image storage: Cloudinary`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


