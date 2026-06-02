const { Op } = require("sequelize");
const {
  User,
  Product,
  Stock,
  ActivityLog,
  OrderRequest,
  Supplier,
  Sale,
  SaleItem,
  Expense,
} = require("../models/associations");
const { sequelize } = require("../models");

exports.trends = async (req, res) => {
  try {
    const { from, to } = req.query;
    const userRole = req.user?.role?.toLowerCase();
    const permissions = req.user?.permission?.permissions || [];

    const allowedRolesForTrends = ["admin", "staff", "stockkeeper"];
    if (
      req.user &&
      !allowedRolesForTrends.includes(userRole) &&
      !permissions.includes("view_report")
    ) {
      return res.json({ success: true, data: [] });
    }
    let start_date, end_date;

    if (from && to) {
      start_date = new Date(from);
      end_date = new Date(to);
      end_date.setHours(23, 59, 59, 999);
    } else {
      // Default to last 7 days if no range provided
      end_date = new Date();
      start_date = new Date();
      start_date.setDate(end_date.getDate() - 7);
    }

    const trends = await Stock.findAll({
      attributes: [
        [sequelize.fn("DATE", sequelize.col("completed_at")), "date"],
        "type",
        [sequelize.fn("SUM", sequelize.col("quantity")), "total"],
      ],
      where: {
        completed_at: {
          [Op.between]: [start_date, end_date],
        },
      },
      group: ["date", "type"],
      order: [["date", "ASC"]],
      raw: true,
    });

    // Process data to match chart format
    const chartData = [];
    const dateMap = new Map();

    // Generate date range
    for (
      let d = new Date(start_date);
      d <= end_date;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      dateMap.set(dateStr, { name: dateStr, in: 0, out: 0 });
    }

    trends.forEach((t) => {
      if (dateMap.has(t.date)) {
        const entry = dateMap.get(t.date);
        if (t.type === "in") entry.in = Number(t.total);
        else if (t.type === "out") entry.out = Number(t.total);
      }
    });

    res.json({
      success: true,
      data: Array.from(dateMap.values()),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.inventorySummary = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    const permissions = req.user?.permission?.permissions || [];
    const allowedRoles = ["admin", "staff", "manager", "stockkeeper", "finance"];

    if (
      req.user &&
      !allowedRoles.includes(userRole) &&
      !permissions.includes("view_inventory_summary") &&
      !permissions.includes("view_report")
    ) {
      return res.json({
        totalProducts: 0,
        totalQuantity: 0,
        lowStock: 0,
        totalSuppliers: 0,
      });
    }
    const totalSuppliers = await Supplier.count();
    const products = await Product.findAll();
    const totalProducts = products.length;
    const totalQuantity = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = products.filter((p) => p.stock <= 10).length;
    res.json({ totalProducts, totalQuantity, lowStock, totalSuppliers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.orderStats = async (req, res) => {
  const { from, to } = req.query;
  const where = {};

  // Filter by user if not admin/staff
  const userRole = req.user?.role?.toLowerCase();
  const permissions = req.user?.permission?.permissions || [];

  const allowedRolesForOrderStats = ["admin", "staff", "stockkeeper"];
  if (
    req.user &&
    !allowedRolesForOrderStats.includes(userRole) &&
    !permissions.includes("view_order_stats")
  ) {
    where.requester_id = req.user._id;
  }

  if (from && to) {
    const start_date = new Date(from);
    const end_date = new Date(to);
    end_date.setHours(23, 59, 59, 999);
    where.createdAt = { [Op.between]: [start_date, end_date] };
  }
  const totalOrders = await OrderRequest.count({ where });
  const pending = await OrderRequest.count({
    where: { ...where, status: "pending" },
  });
  const approved = await OrderRequest.count({
    where: { ...where, status: "approved" },
  });
  const rejected = await OrderRequest.count({
    where: { ...where, status: "rejected" },
  });
  res.json({ totalOrders, pending, approved, rejected });
};

exports.activityLogs = async (req, res) => {
  try {
    // Parse pagination params
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const { start_date, end_date } = req.query;

    const where = {};
    // Filter by user if not admin/staff
    const userRole = req.user?.role?.toLowerCase();
    const permissions = req.user?.permission?.permissions || [];

    const allowedRolesForActivity = ["admin", "staff", "stockkeeper"];
    if (
      req.user &&
      !allowedRolesForActivity.includes(userRole) &&
      !permissions.includes("view_activity_log")
    ) {
      where.user_id = req.user._id;
    }

    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { [Op.between]: [start, end] };
    }

    // Get total count
    const totalItems = await ActivityLog.count({ where });
    const totalPages = Math.ceil(totalItems / limit);

    const logs = await ActivityLog.findAll({
      where,
      include: [{ model: User, as: "user" }],
      limit,
      offset,
      order: [["_id", "DESC"]],
    });
    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, totalItems, totalPages },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch activity logs" });
  }
};
exports.financialSummary = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    const permissions = req.user?.permission?.permissions || [];

    if (
      req.user &&
      userRole !== "admin" &&
      userRole !== "staff" &&
      !permissions.includes("view_report")
    ) {
      return res.json({
        success: true,
        data: {
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          expenses: 0,
          netProfit: 0,
        },
      });
    }
    const { start_date, end_date } = req.query;
    const dateFilter = {};
    const expenseDateFilter = {};

    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);

      dateFilter.completed_at = { [Op.between]: [start, end] };
      expenseDateFilter.date = { [Op.between]: [start, end] };
    }

    const sales = await Sale.findAll({
      where: { ...dateFilter, status: "completed" },
      include: [{ model: SaleItem, as: "items" }],
    });

    let totalRevenue = 0;
    let totalCOGS = 0;

    sales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          const cost = Number(item.cost_price) || 0;
          const discount = Number(item.discount) || 0;

          const itemRevenue = price * qty * (1 - discount / 100);
          const itemCost = cost * qty;

          totalRevenue += itemRevenue;
          totalCOGS += itemCost;
        });
      } else {
        const qty = Number(sale.quantity) || 0;
        const price = Number(sale.price) || 0;
        const discount = Number(sale.discount) || 0;
        totalRevenue += price * qty * (1 - discount / 100);
      }
    });

    const totalExpenses =
      (await Expense.sum("amount", {
        where: expenseDateFilter,
      })) || 0;

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      success: true,
      data: {
        revenue: totalRevenue,
        cogs: totalCOGS,
        grossProfit,
        expenses: totalExpenses,
        netProfit,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
