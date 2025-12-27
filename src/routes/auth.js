const express = require("express")
const nodemailer = require("nodemailer")
const { env } = require("../env")

const router = express.Router()

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map() // email -> { otp, expiresAt }

// Email transporter configuration
const createTransporter = () => {
  // For development/testing, you can use Gmail or other SMTP services
  // For production, use services like SendGrid, AWS SES, etc.

  // Using Gmail SMTP (you'll need to enable "Less secure app access" or use App Passwords)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  })
}

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
    // Send OTP via email
    const transporter = createTransporter()

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@di-wholesale.com',
      to: email,
      subject: 'DI Wholesale Admin Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7B00E0; text-align: center;">DI Wholesale Admin Login</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Your One-Time Password (OTP)</h3>
            <p style="font-size: 24px; font-weight: bold; color: #7B00E0; text-align: center; letter-spacing: 4px;">
              ${otp}
            </p>
            <p style="color: #666; margin-bottom: 0;">
              This OTP is valid for 10 minutes. Please use it to complete your login.
            </p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't request this OTP, please ignore this email.
          </p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
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

