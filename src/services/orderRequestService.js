const mongoose = require("mongoose");
const OrderRequestItem = require("../models/OrderRequestItem");
const ApproveRequest = require("../models/ApproveRequest");
const Notification = require("../models/Notification");
const OrderRequest = require("../models/OrderRequest");
const SaleItem = require("../models/SaleItem");
const ActivityLog = require("../models/ActivityLog");
const Product = require("../models/Product");
const Stock = require("../models/Stock");
const Sale = require("../models/Sale");
const User = require("../models/User");
const Supplier = require("../models/Supplier");
const { sendMail } = require("../utils/mail.util");

class OrderRequestService {
  async getAll({ page = 1, limit = 10, status, supplier_id, requester_id, search, approve_status, start_date, end_date }, user) {
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (status) {
      if (Array.isArray(status)) {
        where.status = { $in: status.map((s) => s.toLowerCase()) };
      } else if (typeof status === "string" && status.includes(",")) {
        where.status = { $in: status.split(",").map((s) => s.trim().toLowerCase()) };
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
        $gte: start,
        $lte: end,
      };
    }
    
    if (search) {
      where.$or = [
        { notes: { $regex: search, $options: "i" } },
        { customer_remark: { $regex: search, $options: "i" } },
        { admin_remark: { $regex: search, $options: "i" } },
      ];
    }
    
    const userRole = user?.role?.toLowerCase();
    const canSeeAll = ["admin", "staff", "manager", "stockkeeper"];
    if (!user || !canSeeAll.includes(userRole)) {
      where.requester_id = user?._id;
    }
    
    const totalItems = await OrderRequest.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);
    const orders = await OrderRequest.find(where)
      .populate("requester_id")
      .populate("approved_by", "_id first_name last_name email")
      .populate("confirmed_by", "_id first_name last_name email")
      .limit(limit)
      .skip(offset)
      .sort({ _id: -1 });
      
    const populatedOrders = [];
    for (const order of orders) {
      const obj = order.toJSON();
      obj.requester = obj.requester_id;
      obj.approver = obj.approved_by;
      obj.confirmer = obj.confirmed_by;
      delete obj.requester_id;
      delete obj.approved_by;
      delete obj.confirmed_by;
      
      const items = await OrderRequestItem.find({ order_request_id: order._id }).populate("product_id");
      obj.items = items.map(i => {
        const itemObj = i.toJSON();
        itemObj.product = itemObj.product_id;
        delete itemObj.product_id;
        return itemObj;
      });
      
      const approveReq = await ApproveRequest.findOne({ order_request_id: order._id });
      if (approveReq && (!approve_status || approveReq.status === approve_status)) {
        obj.approve_request = approveReq.toJSON();
      } else if (approve_status) {
        continue;
      } else {
        obj.approve_request = null;
      }
      
      populatedOrders.push(obj);
    }
    
    return {
      data: populatedOrders,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async getPendingCount(user) {
    const where = { status: "pending" };
    const userRole = user?.role?.toLowerCase();
    const canSeeAll = ["admin", "staff", "manager", "stockkeeper"];
    if (!user || !canSeeAll.includes(userRole)) {
      where.requester_id = user?._id;
    }
    return await OrderRequest.countDocuments(where);
  }

  async create(data, user) {
    const { orderItems, ...orderData } = data;

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      throw new Error("Validation Error: At least one order item is required.");
    }

    const order = await OrderRequest.create({
      ...orderData,
      requester_id: user._id,
      status: "pending",
    });
    
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
    
    const items = await OrderRequestItem.find({ order_request_id: order._id }).populate("product_id");
    const requester = await User.findById(user._id);
    const approve_request = await ApproveRequest.findOne({ order_request_id: order._id });
    
    const populated = order.toJSON();
    populated.items = items.map(i => {
      const iObj = i.toJSON();
      iObj.product = iObj.product_id;
      delete iObj.product_id;
      return iObj;
    });
    populated.requester = requester;
    populated.approve_request = approve_request;

    const staffs = await User.find().populate("permission_id");
    const staffToNotify = staffs.filter(
      (u) =>
        u.permission_id &&
        u.permission_id.permissions &&
        u.permission_id.permissions.includes("update_approve_request"),
    );

    let notifMessage;
    if (populated.items.length > 0) {
      const itemSummary = populated.items
        .map((item) => `${item.quantity}x ${item.product?.name || "item"}`)
        .join(", ");
      const supplierName = orderData.supplier_id
        ? (await Supplier.findById(orderData.supplier_id))?.company_name || ""
        : "";
      notifMessage = `${user.first_name} ${user.last_name} submitted a new purchase order request for ${itemSummary}${supplierName ? ` from ${supplierName}` : ""}.`;
    } else {
      notifMessage = `${user.first_name} ${user.last_name} submitted a new purchase order request.`;
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

    return populated;
  }

  async updateStatus(id, data, user) {
    const order = await OrderRequest.findById(id);
    if (!order) throw new Error("Not found");
    
    const { status, rejection_reason, admin_remarks, customer_remark, delivery_date, is_active } = data;
    
    const allowedStatuses = ["pending", "approved", "rejected", "completed", "cancelled", "on_hold"];
    if (status && !allowedStatuses.includes(status)) {
      throw new Error(`Invalid status value: ${status}`);
    }
    const user_id = user?._id;
    
    if (status === "approved") {
      if (admin_remarks) {
        order.admin_remarks = admin_remarks;
        order.admin_remark = admin_remarks;
      }
      order.approved_by = user_id;
      order.approved_date = new Date();

      const orderItems = await OrderRequestItem.find({ order_request_id: order._id });
      if (!orderItems || orderItems.length === 0) {
        throw new Error("No order items found for this order.");
      }

      for (const item of orderItems) {
        const product = await Product.findById(item.product_id);
        if (!product) throw new Error(`Product not found for item with product_id: ${item.product_id}`);
        const availableStock = product.stock - product.reserved_stock;
        if (availableStock < item.quantity) {
          throw new Error(`Insufficient available stock for product: ${product.name} (Reserved limit reached: ${product.reserved_stock})`);
        }
      }

      let totalAmount = 0;
      for (const item of orderItems) {
        const product = await Product.findById(item.product_id);
        const itemTotal = item.subtotal || item.quantity * item.unit_price || item.quantity * (product ? product.price : 0) || 0;
        totalAmount += parseFloat(itemTotal);
      }

      const sale = await Sale.create({
        order_request_id: order._id,
        customer_id: order.requester_id,
        status: "processing",
        total_amount: totalAmount,
        grand_total: totalAmount,
        payment_status: "pending",
        notes: `Generated from Order Request #${order._id}`,
      });

      for (const item of orderItems) {
        const product = await Product.findById(item.product_id);
        if (product) {
          product.reserved_stock += item.quantity;
          await product.save();

          await SaleItem.create({
            sale_id: sale._id,
            product_id: product._id,
            quantity: item.quantity,
            price: item.unit_price || product.price,
            subtotal: item.subtotal || item.quantity * (item.unit_price || product.price),
          });
        }
      }

      order.status = "approved";
      order.rejection_reason = null;
      order.notified = false;
      await order.save();

      let approveRequest = await ApproveRequest.findOne({ order_request_id: order._id });
      if (!approveRequest) {
        await ApproveRequest.create({
          order_request_id: order._id,
          status: "approved",
          admin_remarks: admin_remarks || null,
          approved_by: user_id,
          approved_date: order.approved_date,
        });
      } else {
        approveRequest.status = "approved";
        approveRequest.admin_remarks = admin_remarks || approveRequest.admin_remarks;
        approveRequest.approved_by = user_id;
        approveRequest.approved_date = order.approved_date;
        await approveRequest.save();
      }

      for (const item of orderItems) {
        await ActivityLog.create({
          user_id,
          action: "approve_order_request",
          details: `Order Request approved. Reserved ${item.quantity} units of product ${item.product_id}.`,
          entity_type: "Order Request",
          entity_id: order._id,
        });
      }

      await Notification.create({
        user_id: order.requester_id,
        type: "order_approved",
        message: `Your order request has been approved.`,
        entity_type: "Order Request",
        entity_id: order._id,
      });

      const staffs = await User.find().populate("permission_id");
      const deliveryStaff = staffs.filter(
        (u) =>
          u.permission_id &&
          u.permission_id.permissions &&
          u.permission_id.permissions.includes("view_confirm_delivery") &&
          u.permission_id.permissions.includes("update_confirm_delivery"),
      );

      for (const staff of deliveryStaff) {
        if (String(staff._id) !== String(user_id)) {
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
      
      const requester = await User.findById(order.requester_id);
      if (requester && requester.email) {
        const companyName = process.env.COMPANY_NAME || "Inventory Management System";
        const requestDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-";
        
        let productLines = "";
        for (const item of orderItems) {
          const product = await Product.findById(item.product_id);
          const pName = product ? product.name : "Unknown Product";
          productLines += `* Product: ${pName}\n* Quantity: ${item.quantity}\n* Requested Date: ${requestDate}\n\n`;
        }
        const html = `
          <p>Dear ${requester.first_name + " " + requester.last_name},</p>
          <p>We’re happy to inform you that your order request has been <strong>approved</strong>.</p>
          <p><strong>Order Details:</strong></p>
          <ul>
            ${productLines.replace(/\n/g, "<br/>")}
          </ul>
          <p>Our inventory team is now processing your order. You will be notified once the items are prepared or dispatched.</p>
          <p>Thank you for using our Inventory Management System.</p>
          <p>Best regards,<br/>Inventory Management Team<br/>${companyName}</p>
        `;
        try {
          await sendMail({
            to: requester.email,
            subject: "Order Request Approved",
            text: `Dear ${requester.first_name + " " + requester.last_name},\n\nWe’re happy to inform you that your order request has been approved.\n\nOrder Details:\n${productLines}\nOur inventory team is now processing your order. You will be notified once the items are prepared or dispatched.\n\nThank you for using our Inventory Management System.\n\nBest regards,\nInventory Management Team\n${companyName}`,
            html,
          });
        } catch (emailErr) {
          console.error("Failed to send approval email:", emailErr);
        }
      }

      return await this._getPopulatedOrder(order._id);
      
    } else if (status === "rejected") {
      if (admin_remarks) order.admin_remarks = admin_remarks;
      const orderItems = await OrderRequestItem.find({ order_request_id: order._id });
      
      if (order.status === "approved") {
        for (const item of orderItems) {
          const product = await Product.findById(item.product_id);
          if (product) {
            product.reserved_stock = Math.max(0, product.reserved_stock - item.quantity);
            await product.save();
          }
        }
      }

      const sale = await Sale.findOne({ order_request_id: order._id });
      if (sale) {
        sale.status = "cancelled";
        await sale.save();
      }

      order.status = "rejected";
      order.rejection_reason = rejection_reason || "";
      order.notified = false;
      await order.save();
      
      let approveRequest = await ApproveRequest.findOne({ order_request_id: order._id });
      if (!approveRequest) {
        await ApproveRequest.create({
          order_request_id: order._id,
          status: "rejected",
          admin_remarks: admin_remarks || null,
          rejection_reason: rejection_reason || "",
          approved_by: user_id,
        });
      } else {
        approveRequest.status = "rejected";
        approveRequest.admin_remarks = admin_remarks || approveRequest.admin_remarks;
        approveRequest.rejection_reason = rejection_reason || approveRequest.rejection_reason;
        approveRequest.approved_by = user_id;
        await approveRequest.save();
      }
      
      await ActivityLog.create({
        user_id,
        action: "reject_order_request",
        details: `Order Request rejected.\nReason: ${order.rejection_reason}`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      
      await Notification.create({
        user_id: order.requester_id,
        type: "order_rejected",
        message: `Your order request has been rejected.\nReason: ${order.rejection_reason}`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      
      const requester = await User.findById(order.requester_id);
      if (requester && requester.email) {
        const companyName = process.env.COMPANY_NAME || "Inventory Management System";
        const requestDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-";
        
        let productLines = "";
        for (const item of orderItems) {
          const product = await Product.findById(item.product_id);
          const pName = product ? product.name : "Unknown Product";
          productLines += `* Product: ${pName}\n* Quantity: ${item.quantity}\n* Requested Date: ${requestDate}\n\n`;
        }
        const html = `
          <p>Dear ${requester.first_name + " " + requester.last_name},</p>
          <p>Thank you for submitting your order request.</p>
          <p>After review, we regret to inform you that your request has been <strong>rejected</strong>.</p>
          <p><strong>Order Details:</strong></p>
          <ul>
            ${productLines.replace(/\n/g, "<br/>")}
          </ul>
          <p><strong>Reason for Rejection:</strong><br/>${order.rejection_reason || "No reason provided."}</p>
          <p>Best regards,<br/>Inventory Management Team<br/>${companyName}</p>
        `;
        try {
          await sendMail({
            to: requester.email,
            subject: "Order Request Rejected",
            text: `Dear ${requester.first_name},\n\nThank you for submitting your order request.\n\nAfter review, we regret to inform you that your request has been rejected.\n\nOrder Details:\n${productLines}\nReason for Rejection:\n${order.rejection_reason || "No reason provided."}\n\nBest regards,\nInventory Management Team\n${companyName}`,
            html,
          });
        } catch (emailErr) {
          console.error("Failed to send rejection email:", emailErr);
        }
      }
      
      return await this._getPopulatedOrder(order._id);
      
    } else if (status === "completed") {
      const sale = await Sale.findOne({ order_request_id: order._id });
      if (sale) {
        sale.status = "completed";
        sale.completed_at = new Date();
        await sale.save();
      }

      const orderItems = await OrderRequestItem.find({ order_request_id: order._id });

      for (const item of orderItems) {
        const product = await Product.findById(item.product_id);
        if (!product) continue;

        product.stock = Math.max(0, product.stock - item.quantity);
        product.reserved_stock = Math.max(0, product.reserved_stock - item.quantity);
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
      
      await Notification.create({
        user_id: order.requester_id,
        type: "order_completed",
        message: `Your order request has been completed.`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      
      return await this._getPopulatedOrder(order._id);
      
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
      
      await Notification.create({
        user_id: order.requester_id,
        type: "order_on_hold",
        message: `Your order request is on hold.`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      
      return await this._getPopulatedOrder(order._id);
      
    } else {
      if (status) order.status = status;
      if (customer_remark) order.customer_remark = customer_remark;
      if (delivery_date) order.delivery_date = delivery_date;
      if (is_active !== undefined) order.is_active = is_active;
      order.updated_by = user_id;
      order.updated_at = new Date();
      await order.save();
      
      await Notification.create({
        user_id: order.requester_id,
        type: `order_${status}`,
        message: `Your order request status updated to ${status}.`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
      
      return order;
    }
  }

  async cancelOrderRequest(id, user) {
    const order = await OrderRequest.findById(id);
    if (!order) throw new Error("Not found");
    if (order.status !== "pending") {
      throw new Error("Only pending orders can be cancelled");
    }
    if (String(order.requester_id) !== String(user._id)) {
      throw new Error("Not authorized to cancel this order");
    }
    order.status = "cancelled";
    await order.save();
    
    await ActivityLog.create({
      user_id: user._id,
      action: "cancel_order_request",
      details: `Order Request cancelled by customer`,
      entity_type: "Order Request",
      entity_id: order._id,
    });
    
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await Notification.create({
        user_id: admin._id,
        type: "order_cancelled",
        message: `Order request was cancelled by the customer`,
        entity_type: "Order Request",
        entity_id: order._id,
      });
    }
    
    return await this._getPopulatedOrder(order._id);
  }

  async confirmDelivery(id, user) {
    const order = await OrderRequest.findById(id);
    if (!order) throw new Error("Not found");
    if (order.status !== "approved") {
      throw new Error("Only approved orders can be confirmed for delivery");
    }
    order.status = "completed";
    await order.save();

    const sale = await Sale.findOne({ order_request_id: order._id });
    if (sale) {
      sale.status = "completed";
      sale.completed_at = new Date();
      await sale.save();
    }

    const orderItems = await OrderRequestItem.find({ order_request_id: order._id });

    for (const item of orderItems) {
      const product = await Product.findById(item.product_id);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
        product.reserved_stock = Math.max(0, product.reserved_stock - item.quantity);
        await product.save();

        await Stock.create({
          product_id: product._id,
          user_id: user._id,
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
      user_id: user._id,
      action: "confirm_delivery",
      details: `Order Request delivery confirmed`,
      entity_type: "Order Request",
      entity_id: order._id,
    });
    
    await Notification.create({
      user_id: order.requester_id,
      type: "order_delivered",
      message: `Your order request has been delivered.`,
      entity_type: "Order Request",
      entity_id: order._id,
    });
    
    order.confirmed_by = user._id;
    order.confirmed_at = new Date();
    await order.save();

    const requester = await User.findById(order.requester_id);
    if (requester && requester.email) {
      const companyName = process.env.COMPANY_NAME || "Inventory Management System";
      const deliveryDate = order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "-";
      let productLines = "";
      for (const item of orderItems) {
        const product = await Product.findById(item.product_id);
        const pName = product ? product.name : "Unknown Product";
        productLines += `* Product: ${pName}\n* Quantity: ${item.quantity}\n`;
      }
      const html = `
        <p>Dear ${requester.first_name + " " + requester.last_name},</p>
        <p>Your order request <strong>(Order ID: ${order._id})</strong> has been <strong>delivered</strong>.</p>
        <p><strong>Order Details:</strong></p>
        <ul>
          ${productLines.replace(/\n/g, "<br/>")}
        </ul>
        <p>Delivery Date: ${deliveryDate}</p>
        <p>Thank you for using our Inventory Management System.</p>
        <p>Best regards,<br/>Inventory Management Team<br/>${companyName}</p>
      `;
      try {
        await sendMail({
          to: requester.email,
          subject: "Order Request Delivered",
          text: `Dear ${requester.first_name + " " + requester.last_name},\n\nYour order request (Order ID: ${order._id}) has been delivered.\n\nOrder Details:\n${productLines}\nDelivery Date: ${deliveryDate}\n\nThank you for using our Inventory Management System.\n\nBest regards,\nInventory Management Team\n${companyName}`,
          html,
        });
      } catch (emailErr) {
        console.error("Failed to send delivery confirmation email:", emailErr);
      }
    }
    return await this._getPopulatedOrder(order._id);
  }

  async update(id, data, user) {
    const order = await OrderRequest.findById(id);
    if (!order) throw new Error("Order request not found");
    if (order.status !== "pending") {
      throw new Error("Only pending order requests can be updated");
    }
    
    const { notes, delivery_date, orderItems, is_active } = data;
    if (notes !== undefined) order.notes = notes;
    if (delivery_date !== undefined) order.delivery_date = delivery_date;
    if (is_active !== undefined) order.is_active = is_active;
    await order.save();
    
    if (Array.isArray(orderItems)) {
      const existingItems = await OrderRequestItem.find({ order_request_id: order._id });
      const existingMap = new Map(existingItems.map((item) => [String(item.product_id), item]));
      const incomingMap = new Map(orderItems.map((item) => [String(item.product_id), item]));
      
      for (const item of orderItems) {
        if (existingMap.has(String(item.product_id))) {
          const existing = existingMap.get(String(item.product_id));
          existing.quantity = item.quantity;
          existing.unit_price = item.unit_price;
          existing.subtotal = item.subtotal;
          await existing.save();
        } else {
          await OrderRequestItem.create({
            order_request_id: order._id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          });
        }
      }
      for (const [product_id, existing] of existingMap.entries()) {
        if (!incomingMap.has(product_id)) {
          await OrderRequestItem.findByIdAndDelete(existing._id);
        }
      }
    }
    
    await ActivityLog.create({
      user_id: user._id,
      action: "update_order_request",
      details: `Order Request updated`,
      entity_type: "Order Request",
      entity_id: order._id,
    });
    
    return await this._getPopulatedOrder(order._id);
  }

  async remove(id) {
    const order = await OrderRequest.findById(id);
    if (!order) throw new Error("Order request not found");

    await OrderRequestItem.deleteMany({ order_request_id: order._id });
    await ApproveRequest.deleteMany({ order_request_id: order._id });
    await Sale.deleteMany({ order_request_id: order._id });
    await Notification.deleteMany({ entity_id: order._id, entity_type: "Order Request" });
    await OrderRequest.findByIdAndDelete(order._id);
    return true;
  }

  async _getPopulatedOrder(orderId) {
    const order = await OrderRequest.findById(orderId)
      .populate("requester_id")
      .populate("approved_by", "_id first_name last_name email")
      .populate("updated_by", "_id first_name last_name email")
      .populate("confirmed_by", "_id first_name last_name email");
      
    if (!order) return null;
    
    const obj = order.toJSON();
    obj.requester = obj.requester_id;
    obj.approver = obj.approved_by;
    obj.confirmer = obj.confirmed_by;
    obj.updatedBy = obj.updated_by;
    delete obj.requester_id;
    delete obj.approved_by;
    delete obj.confirmed_by;
    delete obj.updated_by;
    
    const items = await OrderRequestItem.find({ order_request_id: order._id }).populate("product_id");
    obj.items = items.map(i => {
      const itemObj = i.toJSON();
      itemObj.product = itemObj.product_id;
      delete itemObj.product_id;
      return itemObj;
    });
    
    const approveReq = await ApproveRequest.findOne({ order_request_id: order._id });
    obj.approve_request = approveReq ? approveReq.toJSON() : null;
    
    return obj;
  }
}

module.exports = new OrderRequestService();
