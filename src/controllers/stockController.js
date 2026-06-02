const Stock = require("../models/Stock");
const Product = require("../models/Product");
const User = require("../models/User");
const { Op } = require("sequelize");

// Get all stock movements (with filters, pagination)
exports.getAll = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (req.query.type && ["in", "out"].includes(req.query.type)) {
      where.type = req.query.type;
    }
    if (req.query.product) {
      where.product_id = req.query.product;
    }
    if (req.query.user) {
      where.user_id = req.query.user;
    }
    if (req.query.location && req.query.location !== "All Locations") {
      where.location = req.query.location;
    }
    if (req.query.search) {
      const products = await Product.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${req.query.search}%` } },
            { code: { [Op.like]: `%${req.query.search}%` } },
          ],
        },
        attributes: ["_id"],
      });
      const productIds = products.map((p) => p._id);

      if (productIds.length > 0) {
        where.product_id = { [Op.in]: productIds };
      } else {
        where.product_id = "non-existent-id";
      }
    }
    if (req.query.start_date && req.query.end_date) {
      const startDate = new Date(req.query.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(req.query.end_date);
      endDate.setHours(23, 59, 59, 999);
      where.completed_at = {
        [Op.between]: [startDate, endDate],
      };
    }
    const totalItems = await Stock.count({ where });
    const totalPages = Math.ceil(totalItems / limit);
    const stocks = await Stock.findAll({
      where,
      include: [
        { model: Product, as: "product" },
        { model: User, as: "user" },
      ],
      limit,
      offset,
      order: [["completed_at", "DESC"]],
    });
    res.json({
      success: true,
      data: stocks,
      pagination: { page, limit, totalItems, totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create a stock in/out transaction
exports.create = async (req, res) => {
  const transaction = await Stock.sequelize.transaction();
  try {
    const {
      product_id,
      type,
      quantity,
      reason,
      batch_number,
      location,
      notes,
      completed_at,
      user_id,
    } = req.body;

    // ... validation logic (product existence etc) ...
    const product = await Product.findByPk(product_id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: "Product not found" });
    }

    // Calculate new stock level
    // Calculate new stock level and cost
    let newStock = product.stock;
    const updateData = {};

    if (type === "in") {
      const addedQty = Number(quantity);

      // Calculate Weighted Average Cost (WAC) if cost provided
      if (req.body.cost_price !== undefined) {
        const currentCost = Number(product.cost_price || 0);
        const currentStock = Number(product.stock || 0);
        const newCost = Number(req.body.cost_price);

        // Avoid division by zero
        const totalQty = currentStock + addedQty;
        if (totalQty > 0) {
          const wac =
            (currentStock * currentCost + addedQty * newCost) / totalQty;
          updateData.cost_price = Number(wac.toFixed(2));
        } else {
          updateData.cost_price = newCost;
        }
      }

      newStock += addedQty;
    } else {
      const availableStock = product.stock - product.reserved_stock;
      const qty = Number(quantity);
      if (availableStock < qty) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Insufficient available stock (Reserved limit reached: ${product.reserved_stock})`,
        });
      }
      newStock -= qty;
    }

    updateData.stock = newStock;
    await product.update(updateData, { transaction });

    // Create stock record
    const stock = await Stock.create(
      {
        product_id,
        user_id: user_id || req.user._id,
        type,
        quantity,
        balance: newStock,
        reason,
        batch_number,
        location,
        notes,
        completed_at: completed_at || new Date(),
      },
      { transaction },
    );

    await transaction.commit();
    res.status(201).json(stock);
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
};

// Get stock summary (totals, low stock, etc.)
exports.summary = async (req, res) => {
  try {
    const where = {};
    if (req.query.type && req.query.type !== "All Transactions") {
      where.type = req.query.type === "Stock In" ? "in" : "out";
    }
    if (req.query.product) {
      where.product_id = req.query.product;
    }
    if (req.query.user) {
      where.user_id = req.query.user;
    }
    if (req.query.location && req.query.location !== "All Locations") {
      where.location = req.query.location;
    }
    if (req.query.search) {
      // Find matching products first
      const products = await Product.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${req.query.search}%` } },
            { code: { [Op.like]: `%${req.query.search}%` } },
          ],
        },
        attributes: ["_id"],
      });
      const productIds = products.map((p) => p._id);

      if (productIds.length > 0) {
        where.product_id = { [Op.in]: productIds };
      } else {
        where.product_id = "non-existent-id";
      }
    }
    if (req.query.start_date && req.query.end_date) {
      const startDate = new Date(req.query.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(req.query.end_date);
      endDate.setHours(23, 59, 59, 999);
      where.completed_at = {
        [Op.between]: [startDate, endDate],
      };
    }

    // Total stock in (filtered)
    const stockInWhere = { ...where, type: "in" };
    const totalStockIn = await Stock.sum("quantity", { where: stockInWhere });

    // Total stock out (filtered)
    const stockOutWhere = { ...where, type: "out" };
    const totalStockOut = await Stock.sum("quantity", { where: stockOutWhere });

    let currentBalance = 0;
    const isGlobalScope =
      !req.query.user &&
      (!req.query.location || req.query.location === "All Locations") &&
      (!req.query.type || req.query.type === "All Transactions") &&
      !req.query.start_date;

    if (isGlobalScope) {
      // Use actual inventory count from Products table
      const productBalanceWhere = {};
      if (req.query.product) {
        productBalanceWhere._id = req.query.product;
      }
      if (req.query.search && where.product_id && where.product_id[Op.in]) {
        productBalanceWhere._id = { [Op.in]: where.product_id[Op.in] };
      }
      currentBalance = await Product.sum("stock", {
        where: productBalanceWhere,
      });
      currentBalance = currentBalance || 0;
    } else {
      currentBalance = (totalStockIn || 0) - (totalStockOut || 0);
    }

    const productWhere = { stock: { [Op.lt]: 10 } };
    if (req.query.product) {
      productWhere._id = req.query.product;
    }
    const lowStockItems = await Product.count({ where: productWhere });

    // --- Trend Calculation (Last 30 Days vs Previous 30 Days) ---
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);

    // Helper for filtered sum
    const getTrendSum = async (type, start_date, end_date) => {
      const trendWhere = { ...where }; // Inherit filters
      trendWhere.type = type;
      trendWhere.completed_at = {
        [Op.between]: [start_date, end_date],
      };
      return (await Stock.sum("quantity", { where: trendWhere })) || 0;
    };

    // 1. Stock In Trend
    const currentIn = await getTrendSum("in", thirtyDaysAgo, today);
    const previousIn = await getTrendSum("in", sixtyDaysAgo, thirtyDaysAgo);
    const stockInTrend =
      previousIn === 0
        ? currentIn > 0
          ? 100
          : 0
        : Math.round(((currentIn - previousIn) / previousIn) * 100);

    // 2. Stock Out Trend
    const currentOut = await getTrendSum("out", thirtyDaysAgo, today);
    const previousOut = await getTrendSum("out", sixtyDaysAgo, thirtyDaysAgo);
    const stockOutTrend =
      previousOut === 0
        ? currentOut > 0
          ? 100
          : 0
        : Math.round(((currentOut - previousOut) / previousOut) * 100);

    // 3. Balance Trend
    const netChangeLast30 = currentIn - currentOut;
    const balance30DaysAgo = currentBalance - netChangeLast30;
    const balanceTrend =
      balance30DaysAgo === 0
        ? currentBalance > 0
          ? 100
          : 0
        : Math.round(
            ((currentBalance - balance30DaysAgo) / balance30DaysAgo) * 100,
          );

    res.json({
      totalStockIn: totalStockIn || 0,
      totalStockOut: totalStockOut || 0,
      currentBalance,
      lowStockItems,
      trends: {
        stockIn: stockInTrend,
        stockOut: stockOutTrend,
        currentBalance: balanceTrend,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update a stock transaction
exports.update = async (req, res) => {
  const t = await Stock.sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      product_id,
      quantity,
      type,
      batch_number,
      reason,
      location,
      notes,
      status,
    } = req.body;

    const stock = await Stock.findByPk(id, { transaction: t });
    if (!stock) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, error: "Stock record not found" });
    }

    const product = await Product.findByPk(stock.product_id, {
      transaction: t,
    });
    if (!product) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, error: "Associated product not found" });
    }

    const targetProductId = product_id || stock.product_id;
    const targetType = type || stock.type;
    const targetQuantity =
      quantity !== undefined ? Number(quantity) : Number(stock.quantity);

    if (targetProductId !== stock.product_id) {
    }

    // 1. Revert OLD
    if (stock.type === "in") {
      product.stock -= Number(stock.quantity);
    } else if (stock.type === "out") {
      product.stock += Number(stock.quantity);
    }

    // If product changed (rare case but handled)
    if (product_id && product_id !== stock.product_id) {
      await product.save({ transaction: t });
      const newProduct = await Product.findByPk(product_id, { transaction: t });
      if (!newProduct) {
        await t.rollback();
        return res
          .status(404)
          .json({ success: false, error: "New product not found" });
      }

      if (targetType === "in") {
        newProduct.stock += targetQuantity;
      } else {
        // Check stock
        const availableNewProductStock = newProduct.stock - newProduct.reserved_stock;
        if (availableNewProductStock < targetQuantity) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: `Not enough available stock (Reserved limit reached: ${newProduct.reserved_stock})`,
          });
        }
        newProduct.stock -= targetQuantity;
      }
      await newProduct.save({ transaction: t });
      stock.balance = newProduct.stock; // Snapshot balance
    } else {
      // Same Product
      if (targetType === "in") {
        product.stock += targetQuantity;
      } else {
        const availableStock = product.stock - product.reserved_stock;
        if (availableStock < targetQuantity) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: `Not enough available stock (Reserved limit reached: ${product.reserved_stock})`,
          });
        }
        product.stock -= targetQuantity;
      }
      await product.save({ transaction: t });
      stock.balance = product.stock;
    }

    stock.product_id = targetProductId;
    stock.quantity = targetQuantity;
    stock.type = targetType;
    stock.batch_number = batch_number || stock.batch_number;
    stock.reason = reason || stock.reason;
    stock.location = location || stock.location;
    stock.location = location || stock.location;
    stock.notes = notes || stock.notes;
    if (status) stock.status = status;
    // stock.balance updated above

    await stock.save({ transaction: t });
    await t.commit();

    res.json({ success: true, data: stock });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a stock transaction
exports.delete = async (req, res) => {
  const t = await Stock.sequelize.transaction();
  try {
    const { id } = req.params;
    const stock = await Stock.findByPk(id, { transaction: t });
    if (!stock) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, error: "Stock record not found" });
    }

    const product = await Product.findByPk(stock.product_id, {
      transaction: t,
    });

    // If product exists, revert the stock change
    if (product) {
      if (stock.type === "in") {
        product.stock -= Number(stock.quantity);
      } else if (stock.type === "out") {
        product.stock += Number(stock.quantity);
      }
      await product.save({ transaction: t });
    }

    await stock.destroy({ transaction: t });
    await t.commit();
    res.json({ success: true, message: "Stock record deleted" });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
};
