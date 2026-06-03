const { Return, Sale, Supplier, Product, Stock, Location } = require('../models');
const mongoose = require('mongoose');
const emailService = require('../services/emailService');

exports.createReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { type, sale_id, supplier_id, items, location_id, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Return items are required' });
    }

    if (!location_id) {
      return res.status(400).json({ success: false, error: 'Location is required to process return' });
    }

    // Generate Return Number
    const count = await Return.countDocuments();
    const returnNumber = `RET-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newReturn = new Return({
      return_number: returnNumber,
      type,
      sale_id: type === 'customer_return' ? sale_id : null,
      supplier_id: type === 'supplier_return' ? supplier_id : null,
      items,
      notes,
      status: 'processed', // Auto-process for now
      processed_by: req.user.id,
    });

    await newReturn.save({ session });

    // Handle Stock adjustments
    for (const item of items) {
      const product = await Product.findById(item.product_id).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.product_id}`);
      }

      if (type === 'customer_return') {
        // Customer return: Stock In (Add back to inventory if sellable, otherwise maybe put in quarantine location?)
        // Assuming we add it back if condition is sellable, or we just add it to stock anyway for tracking
        const newStock = new Stock({
          product: product._id,
          type: 'in',
          quantity: item.quantity,
          balance: product.stock + item.quantity,
          user: req.user.id,
          location: location_id,
          reason: 'Customer Return',
          note: item.reason || 'Returned by customer',
          status: 'active'
        });
        await newStock.save({ session });

        product.stock += item.quantity;
        await product.save({ session });
        await emailService.checkAndAlertLowStock(product, session);

      } else if (type === 'supplier_return') {
        // Supplier return: Stock Out (Deduct from inventory to send back to supplier)
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name} to return to supplier`);
        }
        
        const newStock = new Stock({
          product: product._id,
          type: 'out',
          quantity: item.quantity,
          balance: product.stock - item.quantity,
          user: req.user.id,
          location: location_id,
          reason: 'Supplier Return',
          note: item.reason || 'Returned to supplier',
          status: 'active'
        });
        await newStock.save({ session });

        product.stock -= item.quantity;
        await product.save({ session });
        await emailService.checkAndAlertLowStock(product, session);
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: newReturn });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating return:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getReturns = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, search } = req.query;
    
    let query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (search) {
      query.return_number = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    const totalItems = await Return.countDocuments(query);
    const totalPages = limitNum === -1 ? 1 : Math.ceil(totalItems / limitNum);
    
    const returnsQuery = Return.find(query)
      .populate('sale_id')
      .populate('supplier_id', 'company_name email')
      .populate('processed_by', 'first_name last_name email')
      .populate('items.product_id', 'name code')
      .sort({ createdAt: -1 });

    if (limitNum !== -1) {
      returnsQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const returns = await returnsQuery;

    res.status(200).json({
      success: true,
      data: returns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};
