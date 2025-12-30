const { Resend } = require('resend')

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || 're_N8aqm1Vy_PrwzmMKirtmiRrqZ9jEKUQvv')

/**
 * Send email using Resend
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.from] - From email (optional, uses default)
 */
async function sendEmail({ to, subject, html, from }) {
  try {
    // For development/testing, use Resend's test email
    // For production, use your verified domain
    const isDevelopment = process.env.NODE_ENV !== 'production'
    const defaultFrom = isDevelopment
      ? 'DI Wholesale <onboarding@resend.dev>'
      : 'DI Wholesale <noreply@yourdomain.com>'

    const data = await resend.emails.send({
      from: from || defaultFrom,
      to: [to],
      subject: subject,
      html: html,
    })

    console.log('Email sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

/**
 * Send order confirmation email
 */
async function sendOrderConfirmation(orderData) {
  const { customerEmail, customerName, orderId, items, total } = orderData

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #7B00E0;">Order Confirmation</h1>
      <p>Dear ${customerName},</p>
      <p>Thank you for your order! Here are the details:</p>

      <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
        <h3>Order #${orderId}</h3>
        <ul>
          ${items.map(item => `<li>${item.name} - Quantity: ${item.quantity}</li>`).join('')}
        </ul>
        <p><strong>Total: ₹${total}</strong></p>
      </div>

      <p>We will process your order shortly.</p>
      <p>Best regards,<br>DI Wholesale Team</p>
    </div>
  `

  return sendEmail({
    to: customerEmail,
    subject: `Order Confirmation #${orderId}`,
    html: html
  })
}

/**
 * Send OTP email
 */
async function sendOTP(email, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
      <h2 style="color: #7B00E0;">Your OTP Code</h2>
      <p>Your verification code is:</p>
      <div style="font-size: 24px; font-weight: bold; color: #7B00E0; text-align: center; padding: 20px; border: 2px solid #7B00E0; border-radius: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    </div>
  `

  return sendEmail({
    to: email,
    subject: 'Your OTP Code',
    html: html
  })
}

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendOTP
}
