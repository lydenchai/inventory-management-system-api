const { StockTransfer, Stock, Product } = require('../models');

// Create a stock transfer
exports.createTransfer = async (req, res) => {
  try {
    const { product_id, from_location_id, to_location_id, quantity, notes } = req.body;
    
    if (!product_id || !from_location_id || !to_location_id || !quantity) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 1. Check if sufficient stock exists at from_location
    // In a real robust system, we would calculate balance per location
    // Here we'll just log the transaction as a "Stock Out" from source and "Stock In" to destination

    // Create the transfer record
    const transfer = new StockTransfer({
      product_id,
      from_location_id,
      to_location_id,
      user_id: req.user._id,
      quantity,
      notes,
      status: 'completed'
    });

    await transfer.save();

    // Deduct stock from origin location
    await Stock.create({
      product_id,
      user_id: req.user._id,
      type: 'out',
      quantity,
      location_id: from_location_id,
      reason: 'Adjustment',
      notes: `Transfer out to location ${to_location_id}`,
      status: 'active'
    });

    // Add stock to destination location
    await Stock.create({
      product_id,
      user_id: req.user._id,
      type: 'in',
      quantity,
      location_id: to_location_id,
      reason: 'Adjustment',
      notes: `Transfer in from location ${from_location_id}`,
      status: 'active'
    });

    res.status(201).json({ success: true, message: 'Stock transferred successfully', data: transfer });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error processing transfer', details: error.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit === 0) limit = 10;
    const skip = limit === -1 ? 0 : (page - 1) * limit;

    let dbQuery = StockTransfer.find()
      .populate('product_id', 'name code')
      .populate('from_location_id', 'name')
      .populate('to_location_id', 'name')
      .populate('user_id', 'first_name last_name')
      .sort({ createdAt: -1 });

    if (limit !== -1) {
      dbQuery = dbQuery.skip(skip).limit(limit);
    }
    const transfers = await dbQuery;

    const total = await StockTransfer.countDocuments();

    res.status(200).json({
      success: true,
      data: transfers,
      pagination: {
        totalItems: total,
        totalPages: limit === -1 ? 1 : Math.ceil(total / limit),
        page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error fetching transfers', details: error.message });
  }
};
