const { validationResult } = require("express-validator");
const { Op, Sequelize } = require("sequelize");
const { sendMail } = require("../utils/mail.util");

const {
  OrderRequestItem,
  ApproveRequest,
  Notification,
  OrderRequest,
  SaleItem,
  ActivityLog,
  Permission,
  Product,
  Stock,
  Sale,
  User,
} = require("../models/associations");

exports.getAll = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    // Allow status filter from query or route (for approve/confirm delivery)
    let status = req.query.status;
    if (req.status) status = req.status;
    const {
      supplier_id,
      requester_id,
      search,
      approve_status,
      start_date,
      end_date,
    } = req.query;

    const where = {};
    if (status) {
      if (Array.isArray(status)) {
        where.status = { [Op.in]: status.map((s) => s.toLowerCase()) };
      } else if (typeof status === "string" && status.includes(",")) {
        where.status = {
          [Op.in]: status.split(",").map((s) => s.trim().toLowerCase()),
        };
      } else {
        where.status = status.toLowerCase();
      }
    }
    if (supplier_id) where.supplier_id = supplier_id;
    if (requester_id) where.requester_id = requester_id;
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      where.createdAt = {
        [Op.between]: [start, end],
      };
    }
    if (search) {
      // Search in match requester, product name, quantity, notes, customer_remark, admin_remark
      where[Op.or] = [
        { "$requester.first_name$": { [Op.like]: `%${search}%` } },
        { "$requester.last_name$": { [Op.like]: `%${search}%` } },
        { "$items.product.name$": { [Op.like]: `%${search}%` } },
        // Cast quantity to string for search
        Sequelize.where(
          Sequelize.cast(Sequelize.col("items.quantity"), "char"),
          { [Op.like]: `%${search}%` },
        ),
        { notes: { [Op.like]: `%${search}%` } },
        { customer_remark: { [Op.like]: `%${search}%` } },
        { admin_remark: { [Op.like]: `%${search}%` } },
      ];
    }
    // Build include array with possible where for nested approve_request/delivery
    const include = [
      {
        model: OrderRequestItem,
        as: "items",
        include: [{ model: Product, as: "product" }],
      },
      { model: User, as: "requester" },
      {
        model: User,
        as: "approver",
        attributes: ["_id", "first_name", "last_name", "email"],
      },
      {
        model: User,
        as: "confirmer",
        attributes: ["_id", "first_name", "last_name", "email"],
      },
      // Add where for approve_request if approve_status is set
      approve_status
        ? {
            model: ApproveRequest,
            as: "approve_request",
            where: { status: approve_status },
          }
        : { model: ApproveRequest, as: "approve_request" },
    ];
    // Only admin/staff/manager/stockkeeper see all, others see only their own
    const userRole = req.user?.role?.toLowerCase();
    const canSeeAll = ["admin", "staff", "manager", "stockkeeper"];
    if (!req.user || !canSeeAll.includes(userRole)) {
      where.requester_id = req.user?._id;
    }
    // For count, don't use nested where (Sequelize limitation), so count all matching main where
    const totalItems = await OrderRequest.count({ where });
    const totalPages = Math.ceil(totalItems / limit);
    const orders = await OrderRequest.findAll({
      where,
      include,
      limit,
      offset,
      order: [["_id", "DESC"]],
    });
    res.json({
      success: true,
      data: orders,
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
    // Create the order request (without product_id)
    const { orderItems, ...orderData } = req.body;

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res
        .status(422)
        .json({
          success: false,
          error: "At least one order item is required.",
        });
    }

    const order = await OrderRequest.create({
      ...orderData,
      requester_id: req.user._id,
      status: "pending",
    });
    // Create order items
    if (Array.isArray(orderItems)) {
      for (const item of orderItems) {
        await OrderRequestItem.create({
          order_request_id: order._id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        });
      }
    }
    // Populate order with items
    const populated = await OrderRequest.findByPk(order._id, {
      include: [
        {
          model: OrderRequestItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
        { model: User, as: "requester" },
        { model: ApproveRequest, as: "approve_request" },
      ],
    });

    // Notify staff with 'update_approve_request' permission about new order
    const staffs = await User.findAll({
      include: [{ model: Permission, as: "permission" }],
    });

    // Filter users who have the 'update_approve_request' permission
    const staffToNotify = staffs.filter(
      (user) =>
        user.permission &&
        user.permission.permissions &&
        user.permission.permissions.includes("update_approve_request"),
    );

    // Build rich notification message from populated order items
    const populatedItems = populated.items || [];
    let notifMessage;
    if (populatedItems.length > 0) {
      const itemSummary = populatedItems
        .map((item) => `${item.quantity}x ${item.product?.name || "item"}`)
        .join(", ");
      const supplierName = orderData.supplier_id
        ? (
            await require("../models/associations").Supplier?.findByPk(
              orderData.supplier_id,
            )
          )?.company_name || ""
        : "";
      notifMessage = `${req.user.first_name} ${req.user.last_name} submitted a new purchase order request for ${itemSummary}${supplierName ? ` from ${supplierName}` : ""}.`;
    } else {
      notifMessage = `${req.user.first_name} ${req.user.last_name} submitted a new purchase order request.`;
    }

    for (const staff of staffToNotify) {
      await Notification.create({
        user_id: staff._id,
        type: "new_order_request",
        message: notifMessage,
        entity_type: "Order Request",
        entity_id: order._id,
        read: false,
      });
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const order = await OrderRequest.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: "Not found" });
    const {
      status,
      rejection_reason,
      admin_remarks,
      customer_remark,
      delivery_date,
      is_active,
    } = req.body;
    // Only allow valid ENUM values for status
    const allowedStatuses = [
      "pending",
      "approved",
      "rejected",
      "completed",
      "cancelled",
      "on_hold",
    ];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status value: ${status}` });
    }
    const user_id = req.user?._id || (req.user && req.user._id);
    if (status === "approved") {
      if (admin_remarks) order.admin_remarks = admin_remarks;
      if (admin_remarks) order.admin_remark = admin_remarks;
      order.approved_by = user_id;
      order.approved_date = new Date();

      // Fetch all order items
      const orderItems = await OrderRequestItem.findAll({
        where: { order_request_id: order._id },
      });
      if (!orderItems || orderItems.length === 0) {
        return res
          .status(400)
          .json({ error: "No order items found for this order." });
      }

      // Check stock for all items first
      for (const item of orderItems) {
        const product = await Product.findByPk(item.product_id);
        if (!product) {
          return res.status(404).json({
            error: `Product not found for item with product_id: ${item.product_id}`,
          });
        }
        const availableStock = product.stock - product.reserved_stock;
        if (availableStock < item.quantity) {
          return res.status(400).json({
            error: `Insufficient available stock for product: ${product.name} (Reserved limit reached: ${product.reserved_stock})`,
          });
        }
      }

      // 1. Calculate totals for the Sale
      let totalAmount = 0;
      for (const item of orderItems) {
        const itemTotal =
          item.subtotal ||
          item.quantity * item.unit_price ||
          item.quantity * (await Product.findByPk(item.product_id)).price ||
          0;
        totalAmount += parseFloat(itemTotal);
      }

      // 2. Create ONE Sale record
      const sale = await Sale.create({
        order_request_id: order._id,
        customer_id: order.requester_id,
        status: "processing",
        total_amount: totalAmount,
        grand_total: totalAmount,
        payment_status: "pending", // Default
        notes: `Generated from Order Request #${order._id}`,
      });

      // 3. Reserve stock and create SaleItems
      for (const item of orderItems) {
        const product = await Product.findByPk(item.product_id);
        if (product) {
          product.reserved_stock += item.quantity;
          await product.save();

          await SaleItem.create({
            sale_id: sale._id,
            product_id: product._id,
            quantity: item.quantity,
            price: item.unit_price || product.price,
            subtotal:
              item.subtotal ||
              item.quantity * (item.unit_price || product.price),
          });
        }
      }

      order.status = "approved";
      order.rejection_reason = null;
      order.notified = false;
      await order.save();

      let approveRequest = await ApproveRequest.findOne({
        where: { order_request_id: order._id },
      });
      if (!approveRequest) {
        approveRequest = await ApproveRequest.create({
          order_request_id: order._id,
          status: "approved",
          admin_remarks: admin_remarks || null,
          approved_by: user_id,
          approved_date: order.approved_date,
        });
      } else {
        approveRequest.status = "approved";
        approveRequest.admin_remarks =
          admin_remarks || approveRequest.admin_remarks;
        approveRequest.approved_by = user_id;
        approveRequest.approved_date = order.approved_date;
        await approveRequest.save();
      }

      // Log activity (for all items)
      for (const item of orderItems) {
        await ActivityLog.create({
          user_id,
          action: "approve_order_request",
          details: `Order Request approved. Reserved ${item.quantity} units of product ${item.product_id}.`,
          entity_type: "Order Request",
          entity_id: order._id,
        });
      }

      // Notify requester
      await Notification.create({
        user_id: order.requester_id,
        type: "order_approved",
        message: `Your order request has been approved.`,
        entity_type: "Order Request",
        entity_id: order._id,
      });

      // Notify staff with 'update_confirm_delivery' permission
      const staffs = await User.findAll({
        include: [{ model: Permission, as: "permission" }],
      });

      const deliveryStaff = staffs.filter(
        (user) =>
          user.permission &&
          user.permission.permissions &&
          user.permission.permissions.includes("view_confirm_delivery") &&
          user.permission.permissions.includes("update_confirm_delivery"),
      );

      for (const staff of deliveryStaff) {
        if (String(staff._id) !== String(user_id)) {
          // Don't notify the approver if they are admin
          await Notification.create({
            user_id: staff._id,
            type: "pending_delivery",
            message: `Order approved and pending delivery confirmation.`,
            entity_type: "Order Request",
            entity_id: order._id,
            read: false,
          });
        }
      }
      // Send email to requester
      const requester = await User.findByPk(order.requester_id);
      if (requester && requester.email) {
        // Prepare order details for email
        const companyName =
          process.env.COMPANY_NAME || "Stockify Inventory Management System";
        const requestDate = order.createdAt
          ? new Date(order.createdAt).toLocaleDateString()
          : "-";
        // Fetch product details for each item and attach to item
        for (const item of orderItems) {
          const product = await Product.findByPk(item.product_id);
          item._productName = product ? product.name : "Unknown Product";
        }
        let productLines = "";
        for (const item of orderItems) {
          productLines += `* Product: ${item._productName}\n* Quantity: ${item.quantity}\n* Requested Date: ${requestDate}\n\n`;
        }
        const html = `
          <p>Dear ${requester.first_name + " " + requester.last_name},</p>
          <p>We’re happy to inform you that your order request has been <strong>approved</strong>.</p>
          <p><strong>Order Details:</strong></p>
          <ul>
            ${orderItems
              .map((item) => {
                return `<li>Product: ${item._productName}, Quantity: ${item.quantity}, Requested Date: ${requestDate}</li>`;
              })
              .join("")}
          </ul>
          <p>Our inventory team is now processing your order. You will be notified once the items are prepared or dispatched.</p>
          <p>If you have any questions or need further assistance, feel free to contact us.</p>
          <p>Thank you for using our Inventory Management System.</p>
          <p>Best regards,<br/>Inventory Management Team<br/>${companyName}</p>
        `;
        try {
          await sendMail({
            to: requester.email,
            subject: "Order Request Approved",
            text: `Dear ${requester.first_name + " " + requester.last_name},\n\nWe’re happy to inform you that your order request has been approved.\n\nOrder Details:\n${productLines}\nOur inventory team is now processing your order. You will be notified once the items are prepared or dispatched.\n\nIf you have any questions or need further assistance, feel free to contact us.\n\nThank you for using our Inventory Management System.\n\nBest regards,\nInventory Management Team\n${companyName}`,
            html,
          });
        } catch (emailErr) {
          console.error("Failed to send approval email:", emailErr);
        }
      }

      // Return updated order with items
      const orderRequest = await OrderRequest.findByPk(order._id, {
        include: [
          {
            model: OrderRequestItem,
            as: "items",
            include: [{ model: Product, as: "product" }],
          },
          { model: User, as: "requester" },
          { model: ApproveRequest, as: "approve_request" },
        ],
      });
      const data = orderRequest.toJSON();
      // Always return populated order with items, requester, approve_request, confirm_delivery
      const populatedOrder = await OrderRequest.findByPk(order._id, {
        include: [
          {
            model: OrderRequestItem,
            as: "items",
            include: [{ model: Product, as: "product" }],
          },
          { model: User, as: "requester" },
          { model: ApproveRequest, as: "approve_request" },
        ],
      });
      return res.json({ success: true, data: populatedOrder });
    } else if (status === "rejected") {
      if (admin_remarks) order.admin_remarks = admin_remarks;
      // Always fetch order items (needed for email and stock release)
      const orderItems = await OrderRequestItem.findAll({
        where: { order_request_id: order._id },
      });
      // Release reserved stock for all items if previously approved
      if (order.status === "approved") {
        for (const item of orderItems) {
          const product = await Product.findByPk(item.product_id);
          if (product) {
            product.reserved_stock = Math.max(
              0,
              product.reserved_stock - item.quantity,
            );
            await product.save();
          }
        }
      }

      // Find the associated pending Sale and cancel it to avoid ghost sales
      const sale = await Sale.findOne({
        where: { order_request_id: order._id },
      });
      if (sale) {
        sale.status = "cancelled";
        await sale.save();
      }

      order.status = "rejected";
      order.rejection_reason = rejection_reason || "";
      order.notified = false;
      await order.save();
      let approveRequest = await ApproveRequest.findOne({
        where: { order_request_id: order._id },
      });
      if (!approveRequest) {
        approveRequest = await ApproveRequest.create({
          order_request_id: order._id,
          status: "rejected",
          admin_remarks: admin_remarks || null,
          rejection_reason: rejection_reason || "",
          approved_by: user_id,
        });
      } else {
        approveRequest.status = "rejected";
        approveRequest.admin_remarks =
          admin_remarks || approveRequest.admin_remarks;
        approveRequest.rejection_reason =
          rejection_reason || approveRequest.rejection_reason;
        approveRequest.approved_by = user_id;
        await approveRequest.save();
      }
      // Log activity for all items
      await ActivityLog.create({
        user_id,
        action: "reject_order_request",
        details: `Order Request rejected.\nReason: ${order.rejection_reason}`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      // Notify requester
      await Notification.create({
        user_id: order.requester_id,
        type: "order_rejected",
        message: `Your order request has been rejected.\nReason: ${order.rejection_reason}`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      // Send email to requester
      const requester = await User.findByPk(order.requester_id);
      if (requester && requester.email) {
        const companyName =
          process.env.COMPANY_NAME || "Stockify Inventory Management System";
        const requestDate = order.createdAt
          ? new Date(order.createdAt).toLocaleDateString()
          : "-";
        // Fetch product details for each item and attach to item
        for (const item of orderItems) {
          const product = await Product.findByPk(item.product_id);
          item._productName = product ? product.name : "Unknown Product";
        }
        let productLines = "";
        for (const item of orderItems) {
          productLines += `* Product: ${item._productName}\n* Quantity: ${item.quantity}\n* Requested Date: ${requestDate}\n\n`;
        }
        const html = `
          <p>Dear ${requester.first_name + " " + requester.last_name},</p>
          <p>Thank you for submitting your order request.</p>
          <p>After review, we regret to inform you that your request has been <strong>rejected</strong>.</p>
          <p><strong>Order Details:</strong></p>
          <ul>
            ${orderItems
              .map((item) => {
                return `<li>Product: ${item._productName}, Quantity: ${item.quantity}, Requested Date: ${requestDate}</li>`;
              })
              .join("")}
          </ul>
          <p><strong>Reason for Rejection:</strong><br/>${order.rejection_reason || "No reason provided."}</p>
          <p>You may submit a new request with updated details or contact the inventory administrator for further clarification.</p>
          <p>We appreciate your understanding and thank you for using our Inventory Management System.</p>
          <p>Best regards,<br/>Inventory Management Team<br/>${companyName}</p>
        `;
        try {
          await sendMail({
            to: requester.email,
            subject: "Order Request Rejected",
            text: `Dear ${requester.first_name},\n\nThank you for submitting your order request.\n\nAfter review, we regret to inform you that your request has been rejected.\n\nOrder Details:\n${productLines}\nReason for Rejection:\n${order.rejection_reason || "No reason provided."}\n\nYou may submit a new request with updated details or contact the inventory administrator for further clarification.\n\nWe appreciate your understanding and thank you for using our Inventory Management System.\n\nBest regards,\nInventory Management Team\n${companyName}`,
            html,
          });
        } catch (emailErr) {
          console.error("Failed to send rejection email:", emailErr);
        }
      }
      const orderRequest = await OrderRequest.findByPk(order._id, {
        include: [
          {
            model: OrderRequestItem,
            as: "items",
            include: [{ model: Product, as: "product" }],
          },
          { model: User, as: "requester" },
          { model: ApproveRequest, as: "approve_request" },
        ],
      });
      const data = orderRequest.toJSON();
      return res.json({ success: true, data });
    } else if (status === "completed") {
      // Mark all sales as completed and deduct stock for all items
      // Find the associated Sale
      const sale = await Sale.findOne({
        where: { order_request_id: order._id },
      });
      if (sale) {
        sale.status = "completed";
        sale.completed_at = new Date();
        await sale.save();
      }

      const orderItems = await OrderRequestItem.findAll({
        where: { order_request_id: order._id },
      });

      for (const item of orderItems) {
        const product = await Product.findByPk(item.product_id);
        if (!product) continue;

        // Deduct stock and release reserved
        product.stock = Math.max(0, product.stock - item.quantity);
        product.reserved_stock = Math.max(
          0,
          product.reserved_stock - item.quantity,
        );
        await product.save();

        await Stock.create({
          product_id: product._id,
          user_id,
          type: "out",
          quantity: item.quantity,
          balance: product.stock,
          reason: "Sale",
          location: order.location || "Main Warehouse",
          completed_at: new Date(),
          notes: `Deducted for order completion (#${order._id})`,
        });

        // Log activity for each item
        await ActivityLog.create({
          user_id,
          action: "complete_order_request",
          details: `Order Request completed.\nDeducted ${item.quantity} units from product ${product._id}.`,
          entity_type: "Order Request",
          entity_id: order._id,
        });
      }
      order.status = "completed";
      order.notified = false;
      await order.save();
      // Notify requester
      await Notification.create({
        user_id: order.requester_id,
        type: "order_completed",
        message: `Your order request has been completed.`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      // Populate order with items
      const populated = await OrderRequest.findByPk(order._id, {
        include: [
          {
            model: OrderRequestItem,
            as: "items",
            include: [{ model: Product, as: "product" }],
          },
          { model: User, as: "requester" },
          { model: ApproveRequest, as: "approve_request" },
        ],
      });
      const o = populated.toJSON();
      // Always return populated order with items, requester, approve_request, confirm_delivery
      const populatedOrder = await OrderRequest.findByPk(order._id, {
        include: [
          {
            model: OrderRequestItem,
            as: "items",
            include: [{ model: Product, as: "product" }],
          },
          { model: User, as: "requester" },
          { model: ApproveRequest, as: "approve_request" },
        ],
      });
      return res.json({ success: true, data: populatedOrder });
    } else if (status === "on_hold") {
      order.status = "on_hold";
      if (customer_remark) order.customer_remark = customer_remark;
      if (delivery_date) order.delivery_date = delivery_date;
      order.updated_by = user_id;
      order.updated_at = new Date();
      await order.save();
      await ActivityLog.create({
        user_id,
        action: "hold_order_request",
        details: `Order Request put on hold.`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      // Notify requester
      await Notification.create({
        user_id: order.requester_id,
        type: "order_on_hold",
        message: `Your order request is on hold.`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      // Populate Product and requester
      const populated = await OrderRequest.findByPk(order._id, {
        include: [
          { model: Product, as: "product" },
          { model: User, as: "requester" },
          { model: User, as: "approvedBy", foreignKey: "approved_by" },
          { model: User, as: "updatedBy", foreignKey: "updated_by" },
          { model: ApproveRequest, as: "approve_request" },
        ],
      });
      const o = populated.toJSON();
      if (o.product) o.product_id = o.product;
      if (o.requester) o.requester_id = o.requester;
      if (o.approvedBy) o.approved_by = o.approvedBy;
      if (o.updatedBy) o.updated_by = o.updatedBy;
      return res.json({ success: true, data: o });
    } else {
      // For other statuses, just update
      if (status) order.status = status;
      if (customer_remark) order.customer_remark = customer_remark;
      if (delivery_date) order.delivery_date = delivery_date;
      if (is_active !== undefined) order.is_active = is_active;
      order.updated_by = user_id;
      order.updated_at = new Date();
      await order.save();
      // Notify requester
      await Notification.create({
        user_id: order.requester_id,
        type: `order_${status}`,
        message: `Your order request status updated to ${status}.`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      return res.json({ success: true, data: order });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.cancelOrderRequest = async (req, res) => {
  try {
    const order = await OrderRequest.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: "Not found" });
    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Only pending orders can be cancelled" });
    }
    if (String(order.requester_id) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ error: "Not authorized to cancel this order" });
    }
    order.status = "cancelled";
    await order.save();
    await ActivityLog.create({
      user_id: req.user._id,
      action: "cancel_order_request",
      details: `Order Request cancelled by customer`,
      entity_type: "Order Request",
      entity_id: order._id,
    });
    // Notify admin(s) - for demo, notify all admins (could be improved)
    const admins = await User.findAll({ where: { role: "admin" } });
    for (const admin of admins) {
      await Notification.create({
        user_id: admin._id,
        type: "order_cancelled",
        message: `Order request was cancelled by the customer`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
    }
    const orderRequest = await OrderRequest.findByPk(order._id, {
      include: [{ model: ApproveRequest, as: "approve_request" }],
    });
    res.json({ success: true, data: orderRequest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Confirm delivery for an approved order
exports.confirmDelivery = async (req, res) => {
  try {
    const order = await OrderRequest.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: "Not found" });
    if (order.status !== "approved") {
      return res
        .status(400)
        .json({ error: "Only approved orders can be confirmed for delivery" });
    }
    order.status = "completed";
    await order.save();

    // Deduct stock and update sales
    // Create transaction or ensure atomicity if needed
    // Update linked Sale record
    const sale = await Sale.findOne({
      where: { order_request_id: order._id },
    });
    if (sale) {
      sale.status = "completed";
      sale.completed_at = new Date();
      await sale.save();
    }

    // Deduct stock
    const orderItems = await OrderRequestItem.findAll({
      where: { order_request_id: order._id },
    });

    for (const item of orderItems) {
      // Sale is already updated above, no need to find per item

      const product = await Product.findByPk(item.product_id);
      if (product) {
        // Deduct actual stock and release reserved stock
        product.stock = Math.max(0, product.stock - item.quantity);
        product.reserved_stock = Math.max(
          0,
          product.reserved_stock - item.quantity,
        );
        await product.save();

        // Create Stock Out Record
        await Stock.create({
          product_id: product._id,
          user_id: req.user._id,
          type: "out",
          quantity: item.quantity,
          balance: product.stock,
          reason: "Sale",
          location: order.location || "Main Warehouse",
          completed_at: new Date(),
          notes: `Deducted for delivery confirmation (#${order._id})`,
        });
      }
    }

    await ActivityLog.create({
      user_id: req.user._id,
      action: "confirm_delivery",
      details: `Order Request delivery confirmed`,
      entity_type: "Order Request",
      entity_id: order._id,
    });
    // Notify requester
    await Notification.create({
      user_id: order.requester_id,
      type: "order_delivered",
      message: `Your order request has been delivered.`,
      entity_type: "Order Request",
      entity_id: order._id,
    });
    // Verify confirmDelivery logic: Update order fields directly
    order.confirmed_by = req.user._id;
    order.confirmed_at = new Date();
    await order.save();

    // Send email to requester
    const requester = await User.findByPk(order.requester_id);
    if (requester && requester.email) {
      const companyName =
        process.env.COMPANY_NAME || "Stockify Inventory Management System";
      const deliveryDate = order.delivery_date
        ? new Date(order.delivery_date).toLocaleDateString()
        : "-";
      let productLines = "";
      const orderItems = await OrderRequestItem.findAll({
        where: { order_request_id: order._id },
      });
      for (const item of orderItems) {
        const product = await Product.findByPk(item.product_id);
        item._productName = product ? product.name : "Unknown Product";
        productLines += `* Product: ${item._productName}\n* Quantity: ${item.quantity}\n`;
      }
      const html = `
        <p>Dear ${requester.first_name + " " + requester.last_name},</p>
        <p>Your order request <strong>(Order ID: ${order._id})</strong> has been <strong>delivered</strong>.</p>
        <p><strong>Order Details:</strong></p>
        <ul>
          ${orderItems
            .map((item) => {
              return `<li>Product: ${item._productName}, Quantity: ${item.quantity}</li>`;
            })
            .join("")}
        </ul>
        <p>Delivery Date: ${deliveryDate}</p>
        <p>If you have any questions, please contact us.</p>
        <p>Thank you for using our Inventory Management System.</p>
        <p>Best regards,<br/>Inventory Management Team<br/>${companyName}</p>
      `;
      try {
        await sendMail({
          to: requester.email,
          subject: "Order Request Delivered",
          text: `Dear ${requester.first_name + " " + requester.last_name},\n\nYour order request (Order ID: ${order._id}) has been delivered.\n\nOrder Details:\n${productLines}\nDelivery Date: ${deliveryDate}\n\nIf you have any questions, please contact us.\n\nThank you for using our Inventory Management System.\n\nBest regards,\nInventory Management Team\n${companyName}`,
          html,
        });
      } catch (emailErr) {
        console.error("Failed to send delivery confirmation email:", emailErr);
      }
    }
    const populatedOrder = await OrderRequest.findByPk(order._id, {
      include: [
        {
          model: OrderRequestItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
        { model: User, as: "requester" },
        { model: ApproveRequest, as: "approve_request" },
      ],
    });
    res.json({ success: true, data: populatedOrder });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Generic update for ConfirmDelivery (e.g. is_active, status override)
// Update order request details (notes, delivery_date, items, etc.)
exports.update = async (req, res) => {
  try {
    const order = await OrderRequest.findByPk(req.params.id, {
      include: [{ model: OrderRequestItem, as: "items" }],
    });
    if (!order)
      return res.status(404).json({ error: "Order request not found" });
    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Only pending order requests can be updated" });
    }
    const { notes, delivery_date, orderItems, is_active } = req.body;
    if (notes !== undefined) order.notes = notes;
    if (delivery_date !== undefined) order.delivery_date = delivery_date;
    if (is_active !== undefined) order.is_active = is_active;
    await order.save();
    // Patch items if provided
    if (Array.isArray(orderItems)) {
      // Get current items as a map for quick lookup
      const existingItems = await OrderRequestItem.findAll({
        where: { order_request_id: order._id },
      });
      const existingMap = new Map(
        existingItems.map((item) => [item.product_id, item]),
      );
      const incomingMap = new Map(
        orderItems.map((item) => [item.product_id, item]),
      );
      // Update or create items
      for (const item of orderItems) {
        if (existingMap.has(item.product_id)) {
          // Update existing item
          const existing = existingMap.get(item.product_id);
          existing.quantity = item.quantity;
          existing.unit_price = item.unit_price;
          existing.subtotal = item.subtotal;
          await existing.save();
        } else {
          // Add new item
          await OrderRequestItem.create({
            order_request_id: order._id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          });
        }
      }
      // Remove items not in incoming list
      for (const [product_id, existing] of existingMap.entries()) {
        if (!incomingMap.has(product_id)) {
          await existing.destroy();
        }
      }
    }
    // Log activity
    await ActivityLog.create({
      user_id: req.user._id,
      action: "update_order_request",
      details: `Order Request updated`,
      entity_type: "Order Request",
      entity_id: order._id,
    });
    // Return updated order
    const populatedOrder = await OrderRequest.findByPk(order._id, {
      include: [
        {
          model: OrderRequestItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
        { model: User, as: "requester" },
        { model: ApproveRequest, as: "approve_request" },
      ],
    });
    return res.json({ success: true, data: populatedOrder });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get count of order requests needing approval (pending or rejected)
exports.getPendingOrderRequestCount = async (req, res) => {
  try {
    // Only admin/staff/manager/stockkeeper see all, others see only their own
    const where = {
      status: { [Op.in]: ["pending"] },
    };
    const userRole = req.user?.role?.toLowerCase();
    const canSeeAll = ["admin", "staff", "manager", "stockkeeper"];
    if (!req.user || !canSeeAll.includes(userRole)) {
      where.requester_id = req.user?._id;
    }
    const count = await OrderRequest.count({ where });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Remove confirm delivery record - Removed as ConfirmDelivery model is deleted

exports.delete = async (req, res) => {
  try {
    const order = await OrderRequest.findByPk(req.params.id);
    if (!order)
      return res.status(404).json({ error: "Order request not found" });

    // Delete associated items
    await OrderRequestItem.destroy({ where: { order_request_id: order._id } });

    // Delete associated approve request
    await ApproveRequest.destroy({ where: { order_request_id: order._id } });

    // Delete associated sales (if any, though usually completed orders shouldn't be deleted easily)
    await Sale.destroy({ where: { order_request_id: order._id } });

    // Logs and notifications can be kept or deleted. For now, let's keep logs for audit trail but maybe delete notifications?
    // Usually we keep logs. Notifications can be deleted to clean up.
    await Notification.destroy({
      where: { entity_id: order._id, entity_type: "Order Request" },
    });

    await order.destroy();
    res.json({ success: true, message: "Order request deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
