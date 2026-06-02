const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
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
    const search = req.query.search || "";
    const status = req.query.status || "";
    const location = req.query.location || "";
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where[Op.or] = [
        { company_name: { [Op.like]: `%${search}%` } },
        { contact_person: { [Op.like]: `%${search}%` } },
        { contact_email: { [Op.like]: `%${search}%` } },
        { contact_phone: { [Op.like]: `%${search}%` } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (location) {
      where.location = location;
    }
    const totalItems = await Supplier.count({ where });
    const totalPages = Math.ceil(totalItems / limit);
    const suppliers = await Supplier.findAll({
      where,
      limit,
      offset,
      order: [["_id", "DESC"]],
      include: [
        {
          model: Product,
          as: "products",
          attributes: [], // don't include product details, just count
        },
      ],
    });

    // For each supplier, count products
    const suppliersMapped = await Promise.all(
      suppliers.map(async (supplier) => {
        const count = await supplier.countProducts();
        let address = supplier.address;
        if (typeof address === "string") {
          try {
            address = JSON.parse(address);
          } catch {
            address = {};
          }
        }
        return {
          ...supplier.toJSON(),
          address: address || {},
          products_count: count,
        };
      }),
    );

    res.json({
      success: true,
      data: suppliersMapped,
      pagination: { page, limit, totalItems, totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get a single supplier
exports.getOne = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id, {
      include: [{ model: Product, as: "products" }],
    });
    if (!supplier) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data: supplier });
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
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Not found" });
    await supplier.update(req.body);
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a supplier
exports.remove = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Not found" });
    await supplier.destroy();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    // Handle foreign key constraint violations (supplier is referenced by products)
    if (err.original && err.original.errno === 1451) {
      return res.status(409).json({
        success: false,
        error:
          "Cannot delete this supplier because it is referenced    existing products.",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};
