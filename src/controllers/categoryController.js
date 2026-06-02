const Category = require("../models/Category");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");

exports.getAll = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "";
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    if (status) {
      where.status = status;
    }
    const totalItems = await Category.count({ where });
    const totalPages = Math.ceil(totalItems / limit);
    const categories = await Category.findAll({
      where,
      limit,
      offset,
      order: [["_id", "DESC"]],
    });
    res.json({
      success: true,
      data: categories,
      pagination: { page, limit, totalItems, totalPages },
    });
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
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: "Not found" });

    // Check for duplicate name (excluding self)
    if (req.body.name && req.body.name.trim()) {
      const duplicate = await Category.findOne({
        where: {
          name: { [Op.like]: req.body.name.trim() },
          _id: { [Op.ne]: req.params.id },
        },
      });
      if (duplicate) {
        return res.status(409).json({ success: false, error: `Category "${req.body.name}" already exists.` });
      }
    }

    await category.update(req.body);
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: "Not found" });
    await category.destroy();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    // Handle foreign key constraint violations (category is referenced by products)
    if (err.original && err.original.errno === 1451) {
      return res.status(409).json({
        success: false,
        error:
          "Cannot delete this category because it is referenced by existing products.",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};
