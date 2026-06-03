const Product = require("../models/Product");
const Stock = require("../models/Stock");
const ActivityLog = require("../models/ActivityLog");
const OrderRequest = require("../models/OrderRequest");
const Supplier = require("../models/Supplier");
const Sale = require("../models/Sale");
const SaleItem = require("../models/SaleItem");
const Expense = require("../models/Expense");

class ReportService {
  async getTrends({ from, to }, user) {
    const userRole = user?.role?.toLowerCase();
    const permissions = user?.permission?.permissions || [];

    const allowedRolesForTrends = ["admin", "staff", "stockkeeper"];
    if (user && !allowedRolesForTrends.includes(userRole) && !permissions.includes("view_report")) {
      return [];
    }

    let start_date, end_date;
    if (from && to) {
      start_date = new Date(from);
      end_date = new Date(to);
      end_date.setHours(23, 59, 59, 999);
    } else {
      end_date = new Date();
      start_date = new Date();
      start_date.setDate(end_date.getDate() - 7);
    }

    const trends = await Stock.aggregate([
      {
        $match: {
          completed_at: { $gte: start_date, $lte: end_date }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$completed_at" } },
            type: "$type"
          },
          total: { $sum: "$quantity" }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    const dateMap = new Map();
    for (let d = new Date(start_date); d <= end_date; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dateMap.set(dateStr, { name: dateStr, in: 0, out: 0 });
    }

    trends.forEach((t) => {
      const date = t._id.date;
      if (dateMap.has(date)) {
        const entry = dateMap.get(date);
        if (t._id.type === "in") entry.in = Number(t.total);
        else if (t._id.type === "out") entry.out = Number(t.total);
      }
    });

    return Array.from(dateMap.values());
  }

  async getInventorySummary(user) {
    const userRole = user?.role?.toLowerCase();
    const permissions = user?.permission?.permissions || [];
    const allowedRoles = ["admin", "staff", "manager", "stockkeeper", "finance"];

    if (
      user &&
      !allowedRoles.includes(userRole) &&
      !permissions.includes("view_inventory_summary") &&
      !permissions.includes("view_report")
    ) {
      return {
        totalProducts: 0,
        totalQuantity: 0,
        lowStock: 0,
        totalSuppliers: 0,
      };
    }
    const totalSuppliers = await Supplier.countDocuments();
    const products = await Product.find();
    const totalProducts = products.length;
    const totalQuantity = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = products.filter((p) => p.stock <= 10).length;
    return { totalProducts, totalQuantity, lowStock, totalSuppliers };
  }

  async getOrderStats({ from, to }, user) {
    const where = {};
    const userRole = user?.role?.toLowerCase();
    const permissions = user?.permission?.permissions || [];

    const allowedRolesForOrderStats = ["admin", "staff", "stockkeeper"];
    if (
      user &&
      !allowedRolesForOrderStats.includes(userRole) &&
      !permissions.includes("view_order_stats")
    ) {
      where.requester_id = user._id;
    }

    if (from && to) {
      const start_date = new Date(from);
      const end_date = new Date(to);
      end_date.setHours(23, 59, 59, 999);
      where.createdAt = { $gte: start_date, $lte: end_date };
    }
    const totalOrders = await OrderRequest.countDocuments(where);
    const pending = await OrderRequest.countDocuments({ ...where, status: "pending" });
    const approved = await OrderRequest.countDocuments({ ...where, status: "approved" });
    const rejected = await OrderRequest.countDocuments({ ...where, status: "rejected" });
    return { totalOrders, pending, approved, rejected };
  }

  async getActivityLogs({ page = 1, limit = 10, start_date, end_date }, user) {
    const offset = (page - 1) * limit;
    const where = {};
    const userRole = user?.role?.toLowerCase();
    const permissions = user?.permission?.permissions || [];

    const allowedRolesForActivity = ["admin", "staff", "stockkeeper"];
    if (
      user &&
      !allowedRolesForActivity.includes(userRole) &&
      !permissions.includes("view_activity_log")
    ) {
      where.user_id = user._id;
    }

    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { $gte: start, $lte: end };
    }

    const totalItems = await ActivityLog.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);

    const logs = await ActivityLog.find(where)
      .populate("user_id")
      .limit(limit)
      .skip(offset)
      .sort({ _id: -1 });

    const mapped = logs.map(l => {
      const obj = l.toJSON();
      obj.user = obj.user_id;
      delete obj.user_id;
      return obj;
    });

    return {
      data: mapped,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async getFinancialSummary({ start_date, end_date }, user) {
    const userRole = user?.role?.toLowerCase();
    const permissions = user?.permission?.permissions || [];

    if (
      user &&
      userRole !== "admin" &&
      userRole !== "staff" &&
      !permissions.includes("view_report")
    ) {
      return {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
      };
    }
    const dateFilter = {};
    const expenseDateFilter = {};

    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);

      dateFilter.completed_at = { $gte: start, $lte: end };
      expenseDateFilter.date = { $gte: start, $lte: end };
    }

    const sales = await Sale.find({ ...dateFilter, status: "completed" });
    
    for (const sale of sales) {
      sale.items = await SaleItem.find({ sale_id: sale._id });
    }

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

    const expenses = await Expense.find(expenseDateFilter);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    return {
      revenue: totalRevenue,
      cogs: totalCOGS,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
    };
  }
}

module.exports = new ReportService();
