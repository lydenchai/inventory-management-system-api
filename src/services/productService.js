const Product = require("../models/Product");
const Stock = require("../models/Stock");
const { generateCode } = require("../utils/code.util");

class ProductService {
  async getAll({ page = 1, limit = 10, search = "", category = "", supplier = "", status = "" }) {
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }
    if (category) {
      where.category_id = category;
    }
    if (supplier) {
      where.supplier_id = supplier;
    }
    if (status) {
      if (status === "in_stock") where.stock = { $gt: 0 };
      else if (status === "out_of_stock") where.stock = 0;
      else if (status === "low_stock") where.stock = { $gt: 0, $lte: 10 };
    }
    const totalItems = await Product.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);
    const products = await Product.find(where)
      .populate("category_id")
      .populate("supplier_id")
      .limit(limit)
      .skip(offset)
      .sort({ _id: -1 });

    const mappedProducts = products.map((p) => {
      const obj = p.toJSON();
      obj.category = obj.category_id;
      obj.supplier = obj.supplier_id;
      delete obj.category_id;
      delete obj.supplier_id;
      return obj;
    });

    return {
      data: mappedProducts,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async getOne(id) {
    const product = await Product.findById(id)
      .populate("category_id")
      .populate("supplier_id");

    if (!product) throw new Error("Not found");

    const obj = product.toJSON();
    obj.category = obj.category_id;
    obj.supplier = obj.supplier_id;
    delete obj.category_id;
    delete obj.supplier_id;

    return obj;
  }

  async create(data, userId) {
    if (data.category) {
      data.category_id = data.category;
      delete data.category;
    }
    if (data.supplier) {
      data.supplier_id = data.supplier;
      delete data.supplier;
    }
    if (!data.code) {
      const year = new Date().getFullYear().toString().slice(-2);
      const latest = await Product.findOne({
        code: { $regex: new RegExp(`^P${year}`, "i") },
      }).sort({ code: -1 });

      let lastNumber = 0;
      if (latest && latest.code) {
        lastNumber = parseInt(latest.code.slice(3)) || 0;
      }
      data.code = generateCode(lastNumber, "P");
    }
    const product = await Product.create(data);

    let initialStock = 0;
    if (data.stock && Number(data.stock) > 0) {
      initialStock = Number(data.stock);
    }

    try {
      await Stock.create({
        product_id: product._id,
        user_id: userId || null,
        type: "in",
        quantity: initialStock,
        balance: initialStock,
        reason: "Other",
        notes: initialStock > 0 ? "Initial Stock" : "Auto-created when product added",
        location: "Main Warehouse",
        completed_at: new Date(),
      });
    } catch (stockErr) {
      console.error("Failed to create stock entry for new product:", stockErr);
    }

    return product;
  }

  async update(id, data) {
    if (data.category) {
      data.category_id = data.category;
      delete data.category;
    }
    if (data.supplier) {
      data.supplier_id = data.supplier;
      delete data.supplier;
    }
    if (data.stock !== undefined) {
      delete data.stock;
    }

    const product = await Product.findById(id);
    if (!product) throw new Error("Not found");
    Object.assign(product, data);
    await product.save();

    const productWithRelations = await Product.findById(product._id)
      .populate("category_id")
      .populate("supplier_id");

    const obj = productWithRelations.toJSON();
    obj.category = obj.category_id;
    obj.supplier = obj.supplier_id;
    delete obj.category_id;
    delete obj.supplier_id;

    return obj;
  }

  async remove(id) {
    const product = await Product.findById(id);
    if (!product) throw new Error("Not found");
    await Product.findByIdAndDelete(id);
    return true;
  }
}

module.exports = new ProductService();
