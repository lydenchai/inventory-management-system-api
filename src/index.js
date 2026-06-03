const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./config/database");

const app = express();
const path = require("path");

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite default
      "http://127.0.0.1:5173",
      "http://localhost:3000", // React default
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" })); // Limit payload size

// Import routes
const authRoutes = require("./routes/auth");
const passwordResetRoutes = require("./routes/passwordReset");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const supplierRoutes = require("./routes/suppliers");
const orderRequestRoutes = require("./routes/orderRequests");
const reportsRoutes = require("./routes/reports");
const permissionRoutes = require("./routes/permissions");
const userRoutes = require("./routes/users");
const uploadRoutes = require("./routes/upload");
const approveRequestsRoutes = require("./routes/approveRequests");
const salesRoutes = require("./routes/sales");
const stockRoutes = require("./routes/stocks");
const notificationsRoutes = require("./routes/notifications");
const expenseRoutes = require("./routes/expenses");

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/order-requests", orderRequestRoutes);
app.use("/api/approve-requests", approveRequestsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/expenses", expenseRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "IMS Backend is running." });
});

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Start server after DB connection
const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
}

startServer();

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Global error handler — prevents stack traces leaking to clients
app.use((err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
