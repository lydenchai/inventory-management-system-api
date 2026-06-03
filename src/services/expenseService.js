const Expense = require("../models/Expense");

class ExpenseService {
  async getAll({ page = 1, limit = 10, start_date, end_date, category, search }) {
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (category && category !== "All Categories") where.category = category;
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      where.date = {
        $gte: start,
        $lte: end,
      };
    }
    if (search) {
      where.description = { $regex: search, $options: "i" };
    }
    const totalItems = await Expense.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);
    const expenses = await Expense.find(where)
      .populate("user_id", "first_name last_name")
      .limit(limit)
      .skip(offset)
      .sort({ date: -1 });

    const mappedExpenses = expenses.map(e => {
      const obj = e.toJSON();
      obj.user = obj.user_id;
      delete obj.user_id;
      return obj;
    });

    return {
      data: mappedExpenses,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async getOne(id) {
    const expense = await Expense.findById(id);
    if (!expense) throw new Error("Not found");
    return expense;
  }

  async create(data, userId) {
    const { description, amount, category, date, receipt_image } = data;

    if (!description || !description.trim()) {
      throw new Error("Validation Error: Description is required.");
    }
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error("Validation Error: Amount must be a positive number.");
    }
    if (!category || !category.trim()) {
      throw new Error("Validation Error: Category is required.");
    }

    const expense = await Expense.create({
      description,
      amount,
      category,
      date: date || new Date(),
      receipt_image,
      user_id: userId || null,
    });

    return expense;
  }

  async update(id, data) {
    const expense = await Expense.findById(id);
    if (!expense) throw new Error("Not found");

    Object.assign(expense, data);
    return await expense.save();
  }

  async remove(id) {
    const expense = await Expense.findById(id);
    if (!expense) throw new Error("Not found");
    await Expense.findByIdAndDelete(id);
    return true;
  }
}

module.exports = new ExpenseService();
