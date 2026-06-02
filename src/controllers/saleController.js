const { sequelize } = require("../models");
const Sale = require("../models/Sale");
const { SaleItem } = require("../models/associations");
const Product = require("../models/Product");
const Stock = require("../models/Stock");
const User = require("../models/User");
const { Op } = require("sequelize");

// Get all sales
exports.getAll = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const { start_date, end_date, customer, status, search } = req.query;
    const where = {};

    if (status && status !== "All Status") where.status = status;
    if (customer && customer !== "All Customers") where.customer_id = customer;
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      where.completed_at = {
        [Op.between]: [start, end],
      };
    }

    // Optional: Add simple search by ID or Note
    if (search) {
      where[Op.or] = [
        { _id: { [Op.like]: `%${search}%` } },
        { notes: { [Op.like]: `%${search}%` } },
      ];
    }

    const totalItems = await Sale.count({ where });
    const totalPages = Math.ceil(totalItems / limit);

    const sales = await Sale.findAll({
      where,
      include: [
        {
          model: SaleItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
        { model: User, as: "customer" },
      ],
      limit,
      offset,
      order: [["completed_at", "DESC"]],
    });
    res.json({
      success: true,
      data: sales,
      pagination: { page, limit, totalItems, totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get sales summary
exports.summary = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);

    // Helper for filtered stats
    const getStats = async (start_date, end_date) => {
      const where = {
        status: "Completed",
        completed_at: {
          [Op.between]: [start_date, end_date],
        },
      };

      const sales = await Sale.findAll({
        where,
        include: [
          {
            model: SaleItem,
            as: "items",
          },
        ],
      });

      let revenue = 0;
      let count = sales.length;

      sales.forEach((sale) => {
        if (sale.items) {
          sale.items.forEach((item) => {
            const price = Number(item.price) || 0;
            const qty = Number(item.quantity) || 0;
            const discount = Number(item.discount) || 0;
            revenue += price * qty * (1 - discount / 100);
          });
        }
      });

      return { revenue, count };
    };

    // Current Period (Last 30 Days)
    const current = await getStats(thirtyDaysAgo, today);

    // Previous Period (30-60 Days Ago)
    const previous = await getStats(sixtyDaysAgo, thirtyDaysAgo);

    // Calculate Trends
    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const revenueTrend = calcTrend(current.revenue, previous.revenue);
    const salesTrend = calcTrend(current.count, previous.count);

    // Avg Transaction Trend
    const currentAvg = current.count > 0 ? current.revenue / current.count : 0;
    const previousAvg =
      previous.count > 0 ? previous.revenue / previous.count : 0;
    const avgTrend = calcTrend(currentAvg, previousAvg);

    // All Time Stats
    const allTime = await getStats(new Date("2000-01-01"), new Date()); // effectively all time

    // Pending Payments (Status = Processing)
    const pendingSales = await Sale.findAll({
      where: { status: "Processing" },
      include: [{ model: SaleItem, as: "items" }],
    });
    let pendingAmount = 0;
    pendingSales.forEach((sale) => {
      if (sale.items) {
        sale.items.forEach((item) => {
          const price = Number(item.price) || 0;
          const qty = Number(item.quantity) || 0;
          const discount = Number(item.discount) || 0;
          pendingAmount += price * qty * (1 - discount / 100);
        });
      }
    });

    res.json({
      totalRevenue: allTime.revenue,
      totalSales: allTime.count,
      avgTransaction: allTime.count > 0 ? allTime.revenue / allTime.count : 0,
      pendingPayments: pendingAmount,
      trends: {
        revenue: revenueTrend,
        sales: salesTrend,
        avgTransaction: avgTrend,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.getOne = async (req, res) => {
  const sale = await Sale.findByPk(req.params.id, {
    include: [
      {
        model: SaleItem,
        as: "items",
        include: [{ model: Product, as: "product" }],
      },
      { model: User, as: "customer" },
    ],
  });
  if (!sale) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, data: sale });
};

// Create a sale
exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, customer_id, payment_method, notes } = req.body;

    // Normalize items — reject if not a valid array
    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(422).json({ success: false, error: "items array is required and must not be empty." });
    }
    const salesItems = items;

    // 1. Create Sale Header
    const sale = await Sale.create(
      {
        customer_id: customer_id || null,
        payment_method: payment_method || "Cash",
        notes: notes || "",
        status: "Completed",
        completed_at: new Date(),
      },
      { transaction: t },
    );

    let totalAmount = 0;
    const saleItemsData = [];

    for (const item of salesItems) {
      const productId = item.product_id || item.product;
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const discount = Number(item.discount) || 0;
      // cost_price will be fetched from product

      if (!productId || quantity <= 0) continue;

      // 2. Check and Update Product Stock
      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }
      const availableStock = product.stock - product.reserved_stock;
      if (availableStock < quantity) {
        throw new Error(
          `Insufficient available stock for product: ${product.name} (Reserved: ${product.reserved_stock})`,
        );
      }

      const newStock = product.stock - quantity;
      await product.update({ stock: newStock }, { transaction: t });

      const subtotal = price * quantity * (1 - discount / 100);
      totalAmount += subtotal;

      saleItemsData.push({
        sale_id: sale._id,
        product_id: productId,
        quantity: quantity,
        price: price,
        discount: discount,
        cost_price: product.cost_price, // Snapshot cost at time of sale
        subtotal: subtotal,
      });

      // 4. Create Stock Out Record
      await Stock.create(
        {
          product_id: productId,
          user_id: req.user ? req.user._id : null,
          type: "out",
          quantity: quantity,
          balance: newStock,
          location: "Showroom",
          notes: `Sale #${sale._id} - ${notes || "Direct Sale"}`, // Updated field name
          completed_at: new Date(),
        },
        { transaction: t },
      );
    }

    // 3. Create SaleItems
    if (saleItemsData.length === 0) {
      await t.rollback();
      return res.status(422).json({ success: false, error: "No valid items to process. Check product IDs and quantities." });
    }
    await SaleItem.bulkCreate(saleItemsData, { transaction: t });

    // Update Sale with totals
    const saleDiscount = Number(req.body.discount) || 0;
    const grandTotal = totalAmount - saleDiscount;

    await sale.update(
      {
        total_amount: totalAmount,
        discount: saleDiscount,
        grand_total: grandTotal < 0 ? 0 : grandTotal,
        payment_status: req.body.payment_status || "paid",
      },
      { transaction: t },
    );

    await t.commit();
    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update a sale
exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: SaleItem, as: "items" }],
      transaction: t,
    });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({ success: false, error: "Not found" });
    }

    const { items, customer_id, payment_method, notes, status, is_active } =
      req.body;

    // 1. Revert Stock for existing items
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        const product = await Product.findByPk(item.product_id, {
          transaction: t,
        });
        if (product) {
          await product.update(
            { stock: product.stock + item.quantity },
            { transaction: t },
          );

          // Log Stock In (Revert) - Optional but good for tracking
          await Stock.create(
            {
              product_id: item.product_id,
              user_id: req.user ? req.user._id : null,
              type: "in",
              quantity: item.quantity,
              balance: product.stock + item.quantity, // Balance after revert
              location: "Showroom",
              notes: `Sale #${sale._id} Updated (Revert)`,
              completed_at: new Date(),
            },
            { transaction: t },
          );
        }
        await item.destroy({ transaction: t });
      }
    }

    // 2. Normalize and Create New Items
    const salesItems = items && Array.isArray(items) ? items : [];

    if (items) {
      // Only update items if 'items' field is present
      for (const item of salesItems) {
        const productId = item.product_id || item.product;
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const discount = Number(item.discount) || 0;
        // cost_price fetched from product

        if (!productId || quantity <= 0) continue;

        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) throw new Error(`Product not found: ${productId}`);
        const availableStock = product.stock - product.reserved_stock;
        if (availableStock < quantity) {
          throw new Error(
            `Insufficient available stock for product: ${product.name} (Reserved: ${product.reserved_stock})`,
          );
        }

        const newStock = product.stock - quantity;
        await product.update({ stock: newStock }, { transaction: t });

        await SaleItem.create(
          {
            sale_id: sale._id,
            product_id: productId,
            quantity,
            price,
            discount,
            cost_price: product.cost_price, // Snapshot cost
          },
          { transaction: t },
        );

        // Log Stock Out
        await Stock.create(
          {
            product_id: productId,
            user_id: req.user ? req.user._id : null,
            type: "out",
            quantity: quantity,
            balance: newStock,
            location: "Showroom",
            notes: `Sale #${sale._id} Updated`,
            completed_at: new Date(),
          },
          { transaction: t },
        );
      }
    }

    // 3. Update Sale Header
    await sale.update(
      {
        customer_id: customer_id || sale.customer_id,
        payment_method: payment_method || sale.payment_method,
        notes: notes !== undefined ? notes : sale.notes,
        status: status || sale.status,
        payment_status: req.body.payment_status || sale.payment_status,
        is_active: is_active !== undefined ? is_active : sale.is_active,
      },
      { transaction: t },
    );

    await t.commit();

    // Fetch updated sale with items to return
    const updatedSale = await Sale.findByPk(req.params.id, {
      include: [
        {
          model: SaleItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
        { model: User, as: "customer" },
      ],
    });

    res.json({ success: true, data: updatedSale });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: SaleItem, as: "items" }],
      transaction: t,
    });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({ error: "Not found" });
    }

    // Revert Stock
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        const product = await Product.findByPk(item.product_id, {
          transaction: t,
        });
        if (product) {
          await product.update(
            { stock: product.stock + item.quantity },
            { transaction: t },
          );

          await Stock.create(
            {
              product_id: item.product_id,
              user_id: req.user ? req.user._id : null,
              type: "in",
              quantity: item.quantity,
              balance: product.stock + item.quantity,
              location: "Showroom",
              notes: `Sale #${sale._id} Deleted (Revert)`,
              completed_at: new Date(),
            },
            { transaction: t },
          );
        }
        await item.destroy({ transaction: t });
      }
    }

    await sale.destroy({ transaction: t });
    await t.commit();
    res.json({ message: "Deleted" });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};
