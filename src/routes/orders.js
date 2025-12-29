const express = require("express")
const nodemailer = require("nodemailer")
const PDFDocument = require("pdfkit")
const { env } = require("../env")

const router = express.Router()

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  })
}

// Get admin emails from env
function getAdminEmails() {
  const adminMailIds = process.env.ADMIN_MAIL_IDS || ""
  return adminMailIds
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0)
}

// Generate PDF with order details
function generateOrderPDF(orderData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const buffers = []
      
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Header
      doc.fontSize(20).text('DI Wholesale - Product Enquiry', { align: 'center' })
      doc.moveDown()
      doc.fontSize(12).text(`Order Date: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, { align: 'center' })
      doc.moveDown(2)

      // Buyer Information
      doc.fontSize(16).text('Buyer Information', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12)
      doc.text(`Name: ${orderData.name}`)
      doc.text(`Organization: ${orderData.orgName}`)
      doc.text(`Email: ${orderData.email}`)
      doc.text(`Contact: ${orderData.contact}`)
      doc.text(`Business Type: ${orderData.businessType || 'N/A'}`)
      doc.moveDown()
      doc.text(`Address: ${orderData.address}`)
      doc.text(`${orderData.city}, ${orderData.state} - ${orderData.pincode}`)
      doc.text(`${orderData.country}`)
      doc.moveDown(2)

      // Order Items
      doc.fontSize(16).text('Product List', { underline: true })
      doc.moveDown(0.5)
      
      orderData.cartItems.forEach((item, index) => {
        doc.fontSize(12)
        doc.text(`${index + 1}. ${item.name}`, { continued: false })
        doc.fontSize(10)
        doc.text(`   Quantity: ${item.quantity} boxes`, { indent: 20 })
        if (item.size) {
          doc.text(`   Size: ${item.size}`, { indent: 20 })
        }
        if (item.shape) {
          doc.text(`   Shape: ${item.shape}`, { indent: 20 })
        }
        doc.moveDown()
      })

      // Additional Message
      if (orderData.message) {
        doc.moveDown()
        doc.fontSize(14).text('Additional Notes', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11).text(orderData.message, { indent: 20 })
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

// Email templates
const getSellerEmailContent = (orderData) => {
  return {
    subject: 'Product Enquiry – DI Wholesale',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7B00E0;">Product Enquiry – DI Wholesale</h2>
        <p>Hello team,</p>
        <p>Please find attached the PDF containing details of our product enquiry placed on DI Wholesale.</p>
        <p>Kindly review the requirements and let us know the pricing, availability, and next steps.</p>
        <p>Looking forward to your response.</p>
        <p>Thank you.</p>
        <p style="margin-top: 30px;">
          <strong>Buyer Details:</strong><br>
          Name: ${orderData.name}<br>
          Organization: ${orderData.orgName}<br>
          Contact: ${orderData.contact}<br>
          Email: ${orderData.email}
        </p>
        <p style="margin-top: 20px;">Regards,<br>
        ${orderData.name}<br>
        ${orderData.orgName}<br>
        ${orderData.contact}<br>
        ${orderData.email}</p>
      </div>
    `
  }
}

const getBuyerEmailContent = (orderData) => {
  const contactPhone = process.env.CONTACT_PHONE || '+91-XXXXXXXXXX'
  const contactEmail = process.env.CONTACT_EMAIL || 'info@diwholesale.com'
  
  return {
    subject: 'Order Enquiry Received – DI Wholesale',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7B00E0;">Order Enquiry Received – DI Wholesale</h2>
        <p>Hello ${orderData.name},</p>
        <p>Thank you for your enquiry on DI Wholesale.</p>
        <p>We have received your order details. Please find the attached PDF for reference. Our team is reviewing the requirements and will get back to you shortly with pricing, availability, and further steps.</p>
        <p>If you have any additional questions, feel free to reach out.</p>
        <p style="margin-top: 30px;">Regards,<br>
        <strong>DI Wholesale Team</strong><br>
        📞 ${contactPhone}<br>
        ✉️ ${contactEmail}</p>
      </div>
    `
  }
}

// Checkout endpoint
router.post("/checkout", async (req, res) => {
  try {
    const {
      name,
      orgName,
      contact,
      email,
      address,
      city,
      state,
      country,
      pincode,
      businessType,
      message,
      cartItems
    } = req.body

    // Validate required fields
    if (!name || !orgName || !contact || !email || !address || !city || !state || !country || !pincode || !businessType) {
      return res.status(400).json({ error: "All required fields must be provided" })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" })
    }

    // Validate contact (should be numeric and at least 10 digits)
    const contactRegex = /^\d{10,}$/
    if (!contactRegex.test(contact.replace(/\D/g, ''))) {
      return res.status(400).json({ error: "Invalid contact number" })
    }

    // Validate pincode (should be numeric)
    const pincodeRegex = /^\d+$/
    if (!pincodeRegex.test(pincode)) {
      return res.status(400).json({ error: "Invalid pincode" })
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart items are required" })
    }

    // Prepare order data
    const orderData = {
      name: name.trim(),
      orgName: orgName.trim(),
      contact: contact.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      pincode: pincode.trim(),
      businessType: businessType.trim(),
      message: message ? message.trim() : '',
      cartItems: cartItems.map(item => ({
        name: item.name || 'N/A',
        quantity: item.quantity || 1,
        size: item.size || '',
        shape: item.shape || ''
      }))
    }

    // Generate PDF
    const pdfBuffer = await generateOrderPDF(orderData)

    // Get admin emails
    const adminEmails = getAdminEmails()
    if (adminEmails.length === 0) {
      console.warn("No admin emails configured in ADMIN_MAIL_IDS")
    }

    const transporter = createTransporter()

    // Send email to seller (admin)
    const sellerEmailContent = getSellerEmailContent(orderData)
    if (adminEmails.length > 0) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'noreply@di-wholesale.com',
          to: adminEmails.join(','),
          subject: sellerEmailContent.subject,
          html: sellerEmailContent.html,
          attachments: [
            {
              filename: `product-enquiry-${Date.now()}.pdf`,
              content: pdfBuffer
            }
          ]
        })
        console.log(`Order email sent to sellers: ${adminEmails.join(', ')}`)
      } catch (emailError) {
        console.error('Failed to send email to sellers:', emailError)
        // Continue even if seller email fails
      }
    }

    // Send email to buyer
    try {
      const buyerEmailContent = getBuyerEmailContent(orderData)
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@di-wholesale.com',
        to: orderData.email,
        subject: buyerEmailContent.subject,
        html: buyerEmailContent.html,
        attachments: [
          {
            filename: `order-enquiry-${Date.now()}.pdf`,
            content: pdfBuffer
          }
        ]
      })
      console.log(`Order confirmation email sent to buyer: ${orderData.email}`)
    } catch (emailError) {
      console.error('Failed to send email to buyer:', emailError)
      // In development, continue even if email fails
      if (env.NODE_ENV !== "development") {
        return res.status(500).json({ error: "Failed to send confirmation email" })
      }
    }

    res.json({
      message: "Order submitted successfully. Emails sent to seller and buyer.",
      orderId: `ORD-${Date.now()}`
    })
  } catch (error) {
    console.error('Checkout error:', error)
    res.status(500).json({ error: "Failed to process order", details: error.message })
  }
})

module.exports = router

