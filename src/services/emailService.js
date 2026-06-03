const nodemailer = require('nodemailer');
const User = require('../models/User');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

exports.sendLowStockAlert = async (adminEmails, product) => {
  if (!adminEmails || adminEmails.length === 0) return;
  if (!process.env.SMTP_USER) {
    console.warn('SMTP_USER not configured. Skipping email alert for:', product.name);
    return;
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || '"IMS System" <noreply@ims.example.com>',
    to: adminEmails.join(','),
    subject: `⚠️ Low Stock Alert: ${product.name}`,
    html: `
      <h2>Low Stock Alert</h2>
      <p>The following product has dropped below its minimum stock threshold:</p>
      <ul>
        <li><strong>Product Code:</strong> ${product.code}</li>
        <li><strong>Product Name:</strong> ${product.name}</li>
        <li><strong>Current Stock:</strong> <span style="color: red; font-weight: bold;">${product.stock}</span></li>
        <li><strong>Minimum Threshold:</strong> ${product.min_stock_level}</li>
      </ul>
      <p>Please log in to the Inventory Management System to issue a Purchase Order or restock the item.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Low stock alert email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending low stock email:', error);
  }
};

exports.checkAndAlertLowStock = async (product, session = null) => {
  if (product.stock < product.min_stock_level && !product.low_stock_notified) {
    try {
      const admins = await User.find({ user_type: 'internal' }).session(session); // Assuming internal users are admins
      const adminEmails = admins.map(admin => admin.email).filter(Boolean);
      
      if (adminEmails.length > 0) {
        await exports.sendLowStockAlert(adminEmails, product);
      }
      
      product.low_stock_notified = true;
      await product.save({ session });
    } catch (err) {
      console.error('Error in checkAndAlertLowStock:', err);
    }
  } else if (product.stock >= product.min_stock_level && product.low_stock_notified) {
    // Reset flag if stock goes back to normal
    product.low_stock_notified = false;
    await product.save({ session });
  }
};
