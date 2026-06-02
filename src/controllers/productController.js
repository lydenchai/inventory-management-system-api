const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const Stock = require("../models/Stock");
const { generateCode } = require("../utils/code.util");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");

exports.getAll = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const category = req.query.category || "";
    const supplier = req.query.supplier || "";
    const status = req.query.status || "";
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ];
    }
    if (category) {
      where.category_id = category;
    }
    if (supplier) {
      where.supplier_id = supplier;
    }
    if (status) {
      if (status === "in_stock") where.stock = { [Op.gt]: 0 };
      else if (status === "out_of_stock") where.stock = 0;
      else if (status === "low_stock")
        where.stock = { [Op.gt]: 0, [Op.lte]: 10 };
    }
    const totalItems = await Product.count({ where });
    const totalPages = Math.ceil(totalItems / limit);
    const products = await Product.findAll({
      where,
      include: [
        { model: Category, as: "category" },
        { model: Supplier, as: "supplier" },
      ],
      limit,
      offset,
      order: [["_id", "DESC"]],
    });
    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: "category" },
        { model: Supplier, as: "supplier" },
      ],
    });
    if (!product) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    // Map frontend fields to DB fields
    if (req.body.category) {
      req.body.category_id = req.body.category;
      delete req.body.category;
    }
    if (req.body.supplier) {
      req.body.supplier_id = req.body.supplier;
      delete req.body.supplier;
    }
    // Auto-generate product code if not provided
    if (!req.body.code) {
      // Find the latest product code for this year
      const year = new Date().getFullYear().toString().slice(-2);
      const latest = await Product.findOne({
        where: { code: { [Op.like]: `P${year}%` } },
        order: [["code", "DESC"]],
      });
      let lastNumber = 0;
      if (latest && latest.code) {
        lastNumber = parseInt(latest.code.slice(3)) || 0;
      }
      req.body.code = generateCode(lastNumber, "P");
    }
    const product = await Product.create(req.body);

    // Always create a stock entry for the new product (quantity 0 if not provided)
    let initialStock = 0;
    if (req.body.stock && Number(req.body.stock) > 0) {
      initialStock = Number(req.body.stock);
    }

    try {
      await Stock.create({
        product_id: product._id,
        user_id: req.user?._id || null,
        type: initialStock > 0 ? "in" : "in",
        quantity: initialStock,
        balance: initialStock,
        reason: "Other",
        notes:
          initialStock > 0
            ? "Initial Stock"
            : "Auto-created when product added",
        location: "Main Warehouse",
        completed_at: new Date(),
      });
    } catch (stockErr) {
      console.error("Failed to create stock entry for new product:", stockErr);
    }

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Map frontend fields to DB fields
    if (req.body.category) {
      req.body.category_id = req.body.category;
      delete req.body.category;
    }
    if (req.body.supplier) {
      req.body.supplier_id = req.body.supplier;
      delete req.body.supplier;
    }

    // Protect stock from direct update - use Stock In/Out instead
    if (req.body.stock !== undefined) {
      delete req.body.stock;
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Not found" });
    await product.update(req.body);
    // Fetch user with full permission objects
    const productWithCategoryAndSupplier = await Product.findByPk(product._id, {
      include: [
        { model: Category, as: "category" },
        { model: Supplier, as: "supplier" },
      ],
    });
    res.json({ success: true, data: productWithCategoryAndSupplier });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Not found" });
    await product.destroy();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    // Handle foreign key constraint violations (product is referenced by sale_items, stocks, etc.)
    if (err.original && err.original.errno === 1451) {
      return res.status(409).json({
        success: false,
        error:
          "Cannot delete this product because it is referenced by existing sales or stock records.",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};
