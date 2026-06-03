const mongoose = require("mongoose");
const Stock = require("../models/Stock");
const Product = require("../models/Product");

class StockService {
  async getAll({ page = 1, limit = 10, search = "", type = "", product = "", user = "", location = "", start_date = "", end_date = "" }) {
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (type && ["in", "out"].includes(type)) {
      where.type = type;
    }
    if (product) {
      where.product_id = product;
    }
    if (user) {
      where.user_id = user;
    }
    if (location && location !== "All Locations") {
      where.location = location;
    }
    if (search) {
      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      const productIds = products.map((p) => p._id);

      if (productIds.length > 0) {
        where.product_id = { $in: productIds };
      } else {
        where.product_id = new mongoose.Types.ObjectId(); // Non-existent ID
      }
    }
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
      where.completed_at = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    const totalItems = await Stock.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);
    const stocks = await Stock.find(where)
      .populate("product_id")
      .populate("user_id")
      .limit(limit)
      .skip(offset)
      .sort({ completed_at: -1 });
      
    const mappedStocks = stocks.map(s => {
      const obj = s.toJSON();
      obj.product = obj.product_id;
      obj.user = obj.user_id;
      delete obj.product_id;
      delete obj.user_id;
      return obj;
    });
      
    return {
      data: mappedStocks,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async create(data, reqUserId) {
    const session = await mongoose.startSession();
    session.startTransaction();
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
      } = data;

      const product = await Product.findById(product_id).session(session);
      if (!product) {
        throw new Error("Product not found");
      }

      let newStock = product.stock;

      if (type === "in") {
        const addedQty = Number(quantity);

        if (data.cost_price !== undefined) {
          const currentCost = Number(product.cost_price || 0);
          const currentStock = Number(product.stock || 0);
          const newCost = Number(data.cost_price);

          const totalQty = currentStock + addedQty;
          if (totalQty > 0) {
            const wac = (currentStock * currentCost + addedQty * newCost) / totalQty;
            product.cost_price = Number(wac.toFixed(2));
          } else {
            product.cost_price = newCost;
          }
        }
        newStock += addedQty;
      } else {
        const availableStock = product.stock - product.reserved_stock;
        const qty = Number(quantity);
        if (availableStock < qty) {
          throw new Error(`Insufficient available stock (Reserved limit reached: ${product.reserved_stock})`);
        }
        newStock -= qty;
      }

      product.stock = newStock;
      await product.save({ session });

      const [stock] = await Stock.create(
        [{
          product_id,
          user_id: user_id || reqUserId,
          type,
          quantity,
          balance: newStock,
          reason,
          batch_number,
          location,
          notes,
          completed_at: completed_at || new Date(),
        }],
        { session },
      );

      await session.commitTransaction();
      session.endSession();
      return stock;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async getSummary(query) {
    const where = {};
    if (query.type && query.type !== "All Transactions") {
      where.type = query.type === "Stock In" ? "in" : "out";
    }
    if (query.product) {
      where.product_id = new mongoose.Types.ObjectId(query.product);
    }
    if (query.user) {
      where.user_id = new mongoose.Types.ObjectId(query.user);
    }
    if (query.location && query.location !== "All Locations") {
      where.location = query.location;
    }
    if (query.search) {
      const products = await Product.find({
        $or: [
          { name: { $regex: query.search, $options: "i" } },
          { code: { $regex: query.search, $options: "i" } },
        ],
      }).select("_id");
      const productIds = products.map((p) => p._id);

      if (productIds.length > 0) {
        where.product_id = { $in: productIds };
      } else {
        where.product_id = new mongoose.Types.ObjectId();
      }
    }
    if (query.start_date && query.end_date) {
      const startDate = new Date(query.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(query.end_date);
      endDate.setHours(23, 59, 59, 999);
      where.completed_at = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const getSum = async (q) => {
      const result = await Stock.aggregate([
        { $match: q },
        { $group: { _id: null, total: { $sum: "$quantity" } } }
      ]);
      return result.length > 0 ? result[0].total : 0;
    };

    const stockInWhere = { ...where, type: "in" };
    const totalStockIn = await getSum(stockInWhere);

    const stockOutWhere = { ...where, type: "out" };
    const totalStockOut = await getSum(stockOutWhere);

    let currentBalance = 0;
    const isGlobalScope =
      !query.user &&
      (!query.location || query.location === "All Locations") &&
      (!query.type || query.type === "All Transactions") &&
      !query.start_date;

    if (isGlobalScope) {
      const productBalanceWhere = {};
      if (query.product) {
        productBalanceWhere._id = new mongoose.Types.ObjectId(query.product);
      }
      if (query.search && where.product_id && where.product_id.$in) {
        productBalanceWhere._id = { $in: where.product_id.$in };
      }
      const productSumResult = await Product.aggregate([
        { $match: productBalanceWhere },
        { $group: { _id: null, total: { $sum: "$stock" } } }
      ]);
      currentBalance = productSumResult.length > 0 ? productSumResult[0].total : 0;
    } else {
      currentBalance = (totalStockIn || 0) - (totalStockOut || 0);
    }

    const productWhere = { stock: { $lt: 10 } };
    if (query.product) {
      productWhere._id = new mongoose.Types.ObjectId(query.product);
    }
    const lowStockItems = await Product.countDocuments(productWhere);

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const getTrendSum = async (type, start_date, end_date) => {
      const trendWhere = { ...where };
      trendWhere.type = type;
      trendWhere.completed_at = {
        $gte: start_date,
        $lte: end_date,
      };
      return await getSum(trendWhere);
    };

    const currentIn = await getTrendSum("in", thirtyDaysAgo, today);
    const previousIn = await getTrendSum("in", sixtyDaysAgo, thirtyDaysAgo);
    const stockInTrend =
      previousIn === 0
        ? currentIn > 0 ? 100 : 0
        : Math.round(((currentIn - previousIn) / previousIn) * 100);

    const currentOut = await getTrendSum("out", thirtyDaysAgo, today);
    const previousOut = await getTrendSum("out", sixtyDaysAgo, thirtyDaysAgo);
    const stockOutTrend =
      previousOut === 0
        ? currentOut > 0 ? 100 : 0
        : Math.round(((currentOut - previousOut) / previousOut) * 100);

    const netChangeLast30 = currentIn - currentOut;
    const balance30DaysAgo = currentBalance - netChangeLast30;
    const balanceTrend =
      balance30DaysAgo === 0
        ? currentBalance > 0 ? 100 : 0
        : Math.round(((currentBalance - balance30DaysAgo) / balance30DaysAgo) * 100);

    return {
      totalStockIn: totalStockIn || 0,
      totalStockOut: totalStockOut || 0,
      currentBalance,
      lowStockItems,
      trends: {
        stockIn: stockInTrend,
        stockOut: stockOutTrend,
        currentBalance: balanceTrend,
      },
    };
  }

  async update(id, data) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        product_id,
        quantity,
        type,
        batch_number,
        reason,
        location,
        notes,
        status,
      } = data;

      const stock = await Stock.findById(id).session(session);
      if (!stock) {
        throw new Error("Stock record not found");
      }

      const product = await Product.findById(stock.product_id).session(session);
      if (!product) {
        throw new Error("Associated product not found");
      }

      const targetProductId = product_id || stock.product_id;
      const targetType = type || stock.type;
      const targetQuantity = quantity !== undefined ? Number(quantity) : Number(stock.quantity);

      if (stock.type === "in") {
        product.stock -= Number(stock.quantity);
      } else if (stock.type === "out") {
        product.stock += Number(stock.quantity);
      }

      if (product_id && String(product_id) !== String(stock.product_id)) {
        await product.save({ session });
        const newProduct = await Product.findById(product_id).session(session);
        if (!newProduct) {
          throw new Error("New product not found");
        }

        if (targetType === "in") {
          newProduct.stock += targetQuantity;
        } else {
          const availableNewProductStock = newProduct.stock - newProduct.reserved_stock;
          if (availableNewProductStock < targetQuantity) {
            throw new Error(`Not enough available stock (Reserved limit reached: ${newProduct.reserved_stock})`);
          }
          newProduct.stock -= targetQuantity;
        }
        await newProduct.save({ session });
        stock.balance = newProduct.stock;
      } else {
        if (targetType === "in") {
          product.stock += targetQuantity;
        } else {
          const availableStock = product.stock - product.reserved_stock;
          if (availableStock < targetQuantity) {
            throw new Error(`Not enough available stock (Reserved limit reached: ${product.reserved_stock})`);
          }
          product.stock -= targetQuantity;
        }
        await product.save({ session });
        stock.balance = product.stock;
      }

      stock.product_id = targetProductId;
      stock.quantity = targetQuantity;
      stock.type = targetType;
      if (batch_number) stock.batch_number = batch_number;
      if (reason) stock.reason = reason;
      if (location) stock.location = location;
      if (notes) stock.notes = notes;
      if (status) stock.status = status;

      await stock.save({ session });
      await session.commitTransaction();
      session.endSession();

      return stock;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async remove(id) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const stock = await Stock.findById(id).session(session);
      if (!stock) {
        throw new Error("Stock record not found");
      }

      const product = await Product.findById(stock.product_id).session(session);

      if (product) {
        if (stock.type === "in") {
          product.stock -= Number(stock.quantity);
        } else if (stock.type === "out") {
          product.stock += Number(stock.quantity);
        }
        await product.save({ session });
      }

      await Stock.findByIdAndDelete(id).session(session);
      await session.commitTransaction();
      session.endSession();
      return true;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

module.exports = new StockService();
