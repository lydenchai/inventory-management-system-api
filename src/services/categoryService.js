const Category = require("../models/Category");
const Product = require("../models/Product");

class CategoryService {
  async getAll({ page = 1, limit = 10, search = "", status = "" }) {
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where.name = { $regex: search, $options: "i" };
    }
    if (status) {
      where.status = status;
    }
    const totalItems = await Category.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);
    const categories = await Category.find(where)
      .limit(limit)
      .skip(offset)
      .sort({ _id: -1 });

    return {
      data: categories,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async create(data) {
    try {
      return await Category.create(data);
    } catch (err) {
      if (err.code === 11000) {
        throw new Error("Category already exists.");
      }
      throw err;
    }
  }

  async update(id, data) {
    const category = await Category.findById(id);
    if (!category) throw new Error("Category not found");

    if (data.name && data.name.trim()) {
      const duplicate = await Category.findOne({
        name: { $regex: new RegExp("^" + data.name.trim() + "$", "i") },
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new Error(`Category "${data.name}" already exists.`);
      }
    }

    Object.assign(category, data);
    return await category.save();
  }

  async remove(id) {
    const category = await Category.findById(id);
    if (!category) throw new Error("Category not found");

    const productCount = await Product.countDocuments({ category_id: id });
    if (productCount > 0) {
      throw new Error("Cannot delete this category because it is referenced by existing products.");
    }

    await Category.findByIdAndDelete(id);
    return true;
  }
}

module.exports = new CategoryService();
