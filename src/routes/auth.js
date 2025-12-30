const express = require("express")
const { sendOTP } = require("../utils/email")
const { env } = require("../env")

const router = express.Router()

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map() // email -> { otp, expiresAt }

// Email sending is now handled by Resend (see utils/email.js)

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Get admin emails from env
function getAdminEmails() {
  const adminMailIds = process.env.ADMIN_MAIL_IDS || ""
  return adminMailIds
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0)
}

// Send OTP via email
router.post("/send-otp", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase()

  if (!email) {
    return res.status(400).json({ error: "email is required" })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "invalid email format" })
  }

  // Check if email is in admin list
  const adminEmails = getAdminEmails()
  if (!adminEmails.includes(email)) {
    return res.status(403).json({ error: "unauthorized email" })
  }

  // Generate OTP
  const otp = generateOTP()
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

  // Store OTP
  otpStore.set(email, { otp, expiresAt })

  try {
    // Send OTP via Resend
    await sendOTP(email, otp)
    console.log(`OTP email sent to ${email}: ${otp}`)

    res.json({
      message: "OTP sent successfully",
      otp: env.NODE_ENV === "development" ? otp : undefined
    })

  } catch (error) {
    console.error('Email sending failed:', error)
    // In development, still allow login with the OTP even if email fails
    if (env.NODE_ENV === "development") {
      res.json({
        message: "OTP generated (email failed, check console)",
        otp: otp
      })
    } else {
      res.status(500).json({ error: "Failed to send OTP email" })
    }
  }
})

// Verify OTP and login
router.post("/verify-otp", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase()
  const otp = String(req.body?.otp || "").trim()

  if (!email || !otp) {
    return res.status(400).json({ error: "email and otp are required" })
  }

  // Check if email is in admin list
  const adminEmails = getAdminEmails()
  if (!adminEmails.includes(email)) {
    return res.status(403).json({ error: "unauthorized email" })
  }

  // Get stored OTP
  const stored = otpStore.get(email)
  if (!stored) {
    return res.status(400).json({ error: "otp not found or expired" })
  }

  // Check expiration
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email)
    return res.status(400).json({ error: "otp expired" })
  }

  // Verify OTP
  if (stored.otp !== otp) {
    return res.status(400).json({ error: "invalid otp" })
  }

  // OTP verified - create session token (simple JWT-like token)
  // In production, use proper JWT with secret
  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64")

  // Clear OTP after successful verification
  otpStore.delete(email)

  res.json({ token, email })
})

// Verify token (middleware helper)
router.post("/verify-token", async (req, res) => {
  const token = String(req.body?.token || "").trim()

  if (!token) {
    return res.status(401).json({ error: "token required" })
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const [email] = decoded.split(":")

    // Check if email is in admin list
    const adminEmails = getAdminEmails()
    if (!adminEmails.includes(email)) {
      return res.status(403).json({ error: "unauthorized" })
    }

    res.json({ valid: true, email })
  } catch {
    res.status(401).json({ error: "invalid token" })
  }
})

module.exports = router

