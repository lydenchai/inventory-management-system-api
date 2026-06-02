const Expense = require("../models/Expense");
const User = require("../models/User");
const { Op } = require("sequelize");

// Get all expenses
exports.getAll = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const { start_date, end_date, category, search } = req.query;
    const where = {};
    if (category && category !== "All Categories") where.category = category;
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      where.date = {
        [Op.between]: [start, end],
      };
    }
    if (search) {
      where.description = { [Op.like]: `%${search}%` };
    }
    const totalItems = await Expense.count({ where });
    const totalPages = Math.ceil(totalItems / limit);
    const expenses = await Expense.findAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["first_name", "last_name"] },
      ],
      limit,
      offset,
      order: [["date", "DESC"]],
    });

    res.json({
      success: true,
      data: expenses,
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

// Get single expense
exports.getOne = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create expense
exports.create = async (req, res) => {
  try {
    const { description, amount, category, date, receipt_image } = req.body;

    if (!description || !description.trim()) {
      return res.status(422).json({ success: false, error: "Description is required." });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(422).json({ success: false, error: "Amount must be a positive number." });
    }
    if (!category || !category.trim()) {
      return res.status(422).json({ success: false, error: "Category is required." });
    }

    const expense = await Expense.create({
      description,
      amount,
      category,
      date: date || new Date(),
      receipt_image,
      user_id: req.user ? req.user._id : null,
    });

    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update expense
exports.update = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ error: "Not found" });

    await expense.update(req.body);
    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Delete expense
exports.remove = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ error: "Not found" });
    await expense.destroy();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    // Handle foreign key constraint violations (expense is referenced by sale_items, stocks, etc.)
    if (err.original && err.original.errno === 1451) {
      return res.status(409).json({
        success: false,
        error:
          "Cannot delete this expense because it is referenced by existing expense records.",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};
