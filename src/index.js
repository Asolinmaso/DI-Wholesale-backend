const path = require("path")
const express = require("express")
const cors = require("cors")
const { env } = require("./env")
const { connectDb } = require("./db")
const categoriesRouter = require("./routes/categories")
const productsRouter = require("./routes/products")
const { uploadDir } = require("./middleware/upload")

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

  // serve uploaded images
  app.use("/uploads", express.static(uploadDir))

  app.get("/health", (_req, res) => res.json({ ok: true }))
  app.use("/api/categories", categoriesRouter)
  app.use("/api/products", productsRouter)

  // basic error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: "internal_error" })
  })

  app.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`)
    console.log(`CORS origin: ${env.CORS_ORIGIN}`)
    console.log(`Uploads dir: ${path.relative(process.cwd(), uploadDir)}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


