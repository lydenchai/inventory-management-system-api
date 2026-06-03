const PDFDocument = require('pdfkit');
const { PurchaseOrder, OrderRequest, OrderRequestItem, Supplier, Product, User } = require('../models');

exports.createPurchaseOrder = async (req, res) => {
  try {
    const { order_request_id, notes } = req.body;

    const orderRequest = await OrderRequest.findById(order_request_id).populate('supplier_id');
    if (!orderRequest) {
      return res.status(404).json({ success: false, error: 'Order request not found' });
    }

    if (orderRequest.status !== 'approved' && orderRequest.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Order request must be approved to create a PO' });
    }

    // Check if PO already exists
    const existingPO = await PurchaseOrder.findOne({ order_request_id });
    if (existingPO) {
      return res.status(400).json({ success: false, error: 'Purchase Order already exists for this request' });
    }

    // Generate PO Number
    const count = await PurchaseOrder.countDocuments();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Calculate total amount
    const items = await OrderRequestItem.find({ order_request_id });
    const totalAmount = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    const po = new PurchaseOrder({
      po_number: poNumber,
      order_request_id,
      supplier_id: orderRequest.supplier_id._id,
      total_amount: totalAmount,
      notes,
      created_by: req.user.id,
      status: 'issued',
    });

    await po.save();

    res.status(201).json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPurchaseOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, supplier_id, status } = req.query;
    
    let query = {};
    if (supplier_id) query.supplier_id = supplier_id;
    if (status) query.status = status;
    if (search) {
      query.po_number = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    const totalItems = await PurchaseOrder.countDocuments(query);
    const totalPages = limitNum === -1 ? 1 : Math.ceil(totalItems / limitNum);
    
    const posQuery = PurchaseOrder.find(query)
      .populate('supplier_id', 'company_name contact_person email')
      .populate('created_by', 'first_name last_name email')
      .populate('order_request_id')
      .sort({ createdAt: -1 });

    if (limitNum !== -1) {
      posQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const pos = await posQuery;

    res.status(200).json({
      success: true,
      data: pos,
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

exports.getPurchaseOrderPdf = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplier_id')
      .populate('created_by', 'first_name last_name email');

    if (!po) {
      return res.status(404).json({ success: false, error: 'Purchase Order not found' });
    }

    const orderRequest = await OrderRequest.findById(po.order_request_id).populate('requester_id', 'first_name last_name email');
    const items = await OrderRequestItem.find({ order_request_id: po.order_request_id }).populate('product_id', 'name code');

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${po.po_number}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('PURCHASE ORDER', { align: 'right' });
    doc.fontSize(10).text(`PO Number: ${po.po_number}`, { align: 'right' });
    doc.text(`Date: ${po.issue_date.toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Company Info (Placeholder)
    doc.fontSize(12).text('Inventory Management System Inc.');
    doc.fontSize(10).text('123 Warehouse Lane');
    doc.text('City, State, 12345');
    doc.text('contact@ims.com');
    doc.moveDown();

    // Supplier Info
    doc.fontSize(12).text('Vendor:', { underline: true });
    doc.fontSize(10).text(po.supplier_id.company_name);
    doc.text(po.supplier_id.contact_person);
    doc.text(po.supplier_id.email);
    if (po.supplier_id.phone) doc.text(po.supplier_id.phone);
    if (po.supplier_id.address) doc.text(po.supplier_id.address);
    doc.moveDown(2);

    // Table Header
    const tableTop = 250;
    doc.font('Helvetica-Bold');
    doc.text('Item / Product', 50, tableTop);
    doc.text('Code', 250, tableTop);
    doc.text('Quantity', 350, tableTop);
    doc.text('Unit Price', 420, tableTop);
    doc.text('Amount', 490, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    doc.font('Helvetica');
    let y = tableTop + 25;

    items.forEach((item) => {
      doc.text(item.product_id.name, 50, y);
      doc.text(item.product_id.code, 250, y);
      doc.text(item.quantity.toString(), 350, y);
      doc.text(`$${item.unit_price ? item.unit_price.toFixed(2) : '0.00'}`, 420, y);
      doc.text(`$${item.subtotal ? item.subtotal.toFixed(2) : '0.00'}`, 490, y);
      y += 20;
    });

    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    // Total
    doc.font('Helvetica-Bold');
    doc.text('Total:', 420, y);
    doc.text(`$${po.total_amount.toFixed(2)}`, 490, y);

    doc.moveDown(2);

    if (po.notes) {
      doc.font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(po.notes);
      doc.moveDown();
    }

    doc.end();

  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, error: 'Purchase Order not found' });

    po.status = status;
    await po.save();
    
    res.status(200).json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};
