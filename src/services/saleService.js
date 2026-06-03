const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const SaleItem = require("../models/SaleItem");
const Product = require("../models/Product");
const Stock = require("../models/Stock");

class SaleService {
  async getAll({ page = 1, limit = 10, start_date, end_date, customer, status, search }) {
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};

    if (status && status !== "All Status") where.status = status;
    if (customer && customer !== "All Customers") where.customer_id = customer;
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      where.completed_at = {
        $gte: start,
        $lte: end,
      };
    }

    if (search) {
      where.$or = [
        { _id: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const totalItems = await Sale.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);

    const sales = await Sale.find(where)
      .populate("customer_id")
      .limit(limit)
      .skip(offset)
      .sort({ completed_at: -1 });

    const populatedSales = [];
    for (const sale of sales) {
      const obj = sale.toJSON();
      obj.customer = obj.customer_id;
      delete obj.customer_id;

      const items = await SaleItem.find({ sale_id: sale._id }).populate("product_id");
      obj.items = items.map((i) => {
        const itemObj = i.toJSON();
        itemObj.product = itemObj.product_id;
        delete itemObj.product_id;
        return itemObj;
      });
      populatedSales.push(obj);
    }

    return {
      data: populatedSales,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async getSummary() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const getStats = async (start_date, end_date) => {
      const where = {
        status: "Completed",
        completed_at: {
          $gte: start_date,
          $lte: end_date,
        },
      };

      const sales = await Sale.find(where);
      let revenue = 0;
      let count = sales.length;

      for (const sale of sales) {
        const items = await SaleItem.find({ sale_id: sale._id });
        if (items) {
          items.forEach((item) => {
            const price = Number(item.price) || 0;
            const qty = Number(item.quantity) || 0;
            const discount = Number(item.discount) || 0;
            revenue += price * qty * (1 - discount / 100);
          });
        }
      }

      return { revenue, count };
    };

    const current = await getStats(thirtyDaysAgo, today);
    const previous = await getStats(sixtyDaysAgo, thirtyDaysAgo);

    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const revenueTrend = calcTrend(current.revenue, previous.revenue);
    const salesTrend = calcTrend(current.count, previous.count);

    const currentAvg = current.count > 0 ? current.revenue / current.count : 0;
    const previousAvg = previous.count > 0 ? previous.revenue / previous.count : 0;
    const avgTrend = calcTrend(currentAvg, previousAvg);

    const allTime = await getStats(new Date("2000-01-01"), new Date());

    const pendingSales = await Sale.find({ status: "Processing" });
    let pendingAmount = 0;
    for (const sale of pendingSales) {
      const items = await SaleItem.find({ sale_id: sale._id });
      if (items) {
        items.forEach((item) => {
          const price = Number(item.price) || 0;
          const qty = Number(item.quantity) || 0;
          const discount = Number(item.discount) || 0;
          pendingAmount += price * qty * (1 - discount / 100);
        });
      }
    }

    return {
      totalRevenue: allTime.revenue,
      totalSales: allTime.count,
      avgTransaction: allTime.count > 0 ? allTime.revenue / allTime.count : 0,
      pendingPayments: pendingAmount,
      trends: {
        revenue: revenueTrend,
        sales: salesTrend,
        avgTransaction: avgTrend,
      },
    };
  }

  async getOne(id) {
    const sale = await Sale.findById(id).populate("customer_id");
    if (!sale) throw new Error("Not found");

    const obj = sale.toJSON();
    obj.customer = obj.customer_id;
    delete obj.customer_id;

    const items = await SaleItem.find({ sale_id: sale._id }).populate("product_id");
    obj.items = items.map((i) => {
      const itemObj = i.toJSON();
      itemObj.product = itemObj.product_id;
      delete itemObj.product_id;
      return itemObj;
    });

    return obj;
  }

  async create(data, reqUserId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { items, customer_id, payment_method, notes } = data;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error("Validation Error: items array is required and must not be empty.");
      }
      const salesItems = items;

      const [sale] = await Sale.create(
        [{
          customer_id: customer_id || null,
          payment_method: payment_method || "Cash",
          notes: notes || "",
          status: "Completed",
          completed_at: new Date(),
        }],
        { session },
      );

      let totalAmount = 0;
      const saleItemsData = [];

      for (const item of salesItems) {
        const productId = item.product_id || item.product;
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const discount = Number(item.discount) || 0;

        if (!productId || quantity <= 0) continue;

        const product = await Product.findById(productId).session(session);
        if (!product) {
          throw new Error(`Product not found: ${productId}`);
        }
        const availableStock = product.stock - product.reserved_stock;
        if (availableStock < quantity) {
          throw new Error(`Insufficient available stock for product: ${product.name} (Reserved: ${product.reserved_stock})`);
        }

        const newStock = product.stock - quantity;
        product.stock = newStock;
        await product.save({ session });

        const subtotal = price * quantity * (1 - discount / 100);
        totalAmount += subtotal;

        saleItemsData.push({
          sale_id: sale._id,
          product_id: productId,
          quantity: quantity,
          price: price,
          discount: discount,
          cost_price: product.cost_price,
          subtotal: subtotal,
        });

        await Stock.create(
          [{
            product_id: productId,
            user_id: reqUserId || null,
            type: "out",
            quantity: quantity,
            balance: newStock,
            location: "Showroom",
            notes: `Sale #${sale._id} - ${notes || "Direct Sale"}`,
            completed_at: new Date(),
          }],
          { session },
        );
      }

      if (saleItemsData.length === 0) {
        throw new Error("Validation Error: No valid items to process. Check product IDs and quantities.");
      }
      await SaleItem.insertMany(saleItemsData, { session });

      const saleDiscount = Number(data.discount) || 0;
      const grandTotal = totalAmount - saleDiscount;

      sale.total_amount = totalAmount;
      sale.discount = saleDiscount;
      sale.grand_total = grandTotal < 0 ? 0 : grandTotal;
      sale.payment_status = data.payment_status || "paid";
      await sale.save({ session });

      await session.commitTransaction();
      session.endSession();
      return sale;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async update(id, data, reqUserId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const sale = await Sale.findById(id).session(session);

      if (!sale) {
        throw new Error("Not found");
      }

      const { items, customer_id, payment_method, notes, status, is_active } = data;

      const existingItems = await SaleItem.find({ sale_id: sale._id }).session(session);

      if (existingItems && existingItems.length > 0) {
        for (const item of existingItems) {
          const product = await Product.findById(item.product_id).session(session);
          if (product) {
            product.stock = product.stock + item.quantity;
            await product.save({ session });

            await Stock.create(
              [{
                product_id: item.product_id,
                user_id: reqUserId || null,
                type: "in",
                quantity: item.quantity,
                balance: product.stock,
                location: "Showroom",
                notes: `Sale #${sale._id} Updated (Revert)`,
                completed_at: new Date(),
              }],
              { session },
            );
          }
          await SaleItem.findByIdAndDelete(item._id).session(session);
        }
      }

      const salesItems = items && Array.isArray(items) ? items : [];

      if (items) {
        for (const item of salesItems) {
          const productId = item.product_id || item.product;
          const quantity = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          const discount = Number(item.discount) || 0;

          if (!productId || quantity <= 0) continue;

          const product = await Product.findById(productId).session(session);
          if (!product) throw new Error(`Product not found: ${productId}`);
          const availableStock = product.stock - product.reserved_stock;
          if (availableStock < quantity) {
            throw new Error(`Insufficient available stock for product: ${product.name} (Reserved: ${product.reserved_stock})`);
          }

          const newStock = product.stock - quantity;
          product.stock = newStock;
          await product.save({ session });

          await SaleItem.create(
            [{
              sale_id: sale._id,
              product_id: productId,
              quantity,
              price,
              discount,
              cost_price: product.cost_price,
            }],
            { session },
          );

          await Stock.create(
            [{
              product_id: productId,
              user_id: reqUserId || null,
              type: "out",
              quantity: quantity,
              balance: newStock,
              location: "Showroom",
              notes: `Sale #${sale._id} Updated`,
              completed_at: new Date(),
            }],
            { session },
          );
        }
      }

      sale.customer_id = customer_id || sale.customer_id;
      sale.payment_method = payment_method || sale.payment_method;
      sale.notes = notes !== undefined ? notes : sale.notes;
      sale.status = status || sale.status;
      sale.payment_status = data.payment_status || sale.payment_status;
      sale.is_active = is_active !== undefined ? is_active : sale.is_active;
      await sale.save({ session });

      await session.commitTransaction();
      session.endSession();

      const updatedSale = await Sale.findById(id).populate("customer_id");
      const obj = updatedSale.toJSON();
      obj.customer = obj.customer_id;
      delete obj.customer_id;

      const newItems = await SaleItem.find({ sale_id: sale._id }).populate("product_id");
      obj.items = newItems.map((i) => {
        const itemObj = i.toJSON();
        itemObj.product = itemObj.product_id;
        delete itemObj.product_id;
        return itemObj;
      });

      return obj;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async remove(id, reqUserId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const sale = await Sale.findById(id).session(session);

      if (!sale) {
        throw new Error("Not found");
      }

      const saleItems = await SaleItem.find({ sale_id: sale._id }).session(session);

      if (saleItems && saleItems.length > 0) {
        for (const item of saleItems) {
          const product = await Product.findById(item.product_id).session(session);
          if (product) {
            product.stock = product.stock + item.quantity;
            await product.save({ session });

            await Stock.create(
              [{
                product_id: item.product_id,
                user_id: reqUserId || null,
                type: "in",
                quantity: item.quantity,
                balance: product.stock,
                location: "Showroom",
                notes: `Sale #${sale._id} Deleted (Revert)`,
                completed_at: new Date(),
              }],
              { session },
            );
          }
          await SaleItem.findByIdAndDelete(item._id).session(session);
        }
      }

      await Sale.findByIdAndDelete(id).session(session);
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

module.exports = new SaleService();
