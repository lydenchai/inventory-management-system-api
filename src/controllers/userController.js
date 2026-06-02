const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const User = require("../models/User");
const Permission = require("../models/Permission");
const { sendMail } = require("../utils/mail.util");

// Get all users
exports.getAll = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const search = req.query.search || "";
    const permission_id = req.query.permission_id || "";
    const status = req.query.status || "";
    const user_type = req.query.user_type || "";
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { role: { [Op.like]: `%${search}%` } },
      ];
    }
    if (permission_id) {
      where.permission_id = permission_id;
    }
    if (status) {
      where.status = status;
    }
    if (user_type) {
      where.user_type = user_type;
    }
    const totalItems = await User.count({ where });
    const totalPages = Math.ceil(totalItems / limit);
    const users = await User.findAll({
      where,
      limit,
      offset,
      order: [["_id", "DESC"]],
    });
    const usersMapped = users.map((user) => {
      let address = user.address;
      if (typeof address === "string") {
        try {
          address = JSON.parse(address);
        } catch {
          address = {};
        }
      }
      let product_categories = user.product_categories;
      if (typeof product_categories === "string") {
        try {
          product_categories = JSON.parse(product_categories);
        } catch {
          product_categories = [];
        }
      }
      return {
        ...user.toJSON(),
        address: address || {},
        product_categories: product_categories || [],
      };
    });
    res.json({
      success: true,
      data: usersMapped,
      pagination: { page, limit, totalItems, totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get a single user
exports.getOne = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: Permission, as: "permission" }],
    });
    if (!user) return res.status(404).json({ error: "Not found" });

    let userData = user.toJSON();

  // Parse address
  if (typeof userData.address === "string") {
    try {
      userData.address = JSON.parse(userData.address);
    } catch {
      userData.address = {};
    }
  }

  // Parse product_categories
  if (typeof userData.product_categories === "string") {
    try {
      userData.product_categories = JSON.parse(userData.product_categories);
    } catch {
      userData.product_categories = [];
    }
  }

  res.json({ success: true, data: userData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create a user
// Create a user (Admin)
exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    // Extract specific fields to prevent pollution
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      role,
      permission_id,
      status,
      address,
      profile,
      user_type,
      company_name,
      company_registration_no,
      request_purpose,
      expected_order_volume,
      order_frequency,
      product_categories,
      id_card_or_business_license,
      shop_photo,
      location_lat,
      location_lng,
      note_from_customer,
    } = req.body;

    const data = {
      email,
      first_name,
      last_name,
      phone,
      role,
      permission_id,
      status: status || "active", // Default to active for admin-created users
      profile,
      user_type,
      company_name,
      company_registration_no,
      request_purpose,
      expected_order_volume,
      order_frequency,
      product_categories,
      id_card_or_business_license,
      shop_photo,
      location_lat,
      location_lng,
      note_from_customer,
    };

    // Sanitize address
    if (address) {
      if (typeof address === "object" && !Array.isArray(address)) {
        data.address = {
          street: address.street || "",
          house: address.house || "",
          village: address.village || "",
          commune: address.commune || "",
          district: address.district || "",
          province: address.province || "",
        };
      } else if (typeof address === "string") {
        try {
          data.address = JSON.parse(address);
        } catch (e) {
          data.address = {};
        }
      }
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    } else {
      // Require password for manual creation? Or generate temp?
      // For now, let's assume UI requires it or we fail database constraint if null
      return res
        .status(400)
        .json({ success: false, error: "Password is required" });
    }

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Email already exists" });
    }

    // If permission_id is provided, verify it exists (optional but good practice)
    if (permission_id) {
      const perm = await Permission.findByPk(permission_id);
      if (!perm) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid permission role selected" });
      }
      // Force role name to match permission name for consistency
      data.role = perm.name;
    }

    const user = await User.create(data);

    // Fetch user with full permission objects
    const userWithPermissions = await User.findByPk(user._id, {
      include: [{ model: Permission, as: "permission" }],
    });

    res.status(201).json({ success: true, data: userWithPermissions });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update a user
exports.update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    // Only allow updating specific fields
    const allowedFields = [
      "email",
      "password",
      "role",
      "first_name",
      "last_name",
      "phone",
      "address",
      "profile",
      "permission_id",
      "status",
      "user_type",
      "company_name",
      "company_registration_no",
      "request_purpose",
      "expected_order_volume",
      "order_frequency",
      "product_categories",
      "id_card_or_business_license",
      "shop_photo",
      "location_lat",
      "location_lng",
      "agree_terms",
      "note_from_customer",
    ];
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        if (
          key === "address" &&
          typeof req.body.address === "object" &&
          !Array.isArray(req.body.address)
        ) {
          updateData.address = {
            street: req.body.address.street || "",
            house: req.body.address.house || "",
            village: req.body.address.village || "",
            commune: req.body.address.commune || "",
            district: req.body.address.district || "",
            province: req.body.address.province || "",
          };
        } else {
          updateData[key] = req.body[key];
        }
      }
    }
    const previousStatus = user.status;

    // Check for duplicate email if email is being changed
    if (updateData.email && updateData.email !== user.email) {
      const { Op } = require("sequelize");
      const emailTaken = await User.findOne({
        where: { email: updateData.email, _id: { [Op.ne]: req.params.id } },
      });
      if (emailTaken) {
        return res.status(409).json({ success: false, error: "Email already in use by another user." });
      }
    }

    await user.update(updateData);

    // Send email notification if status changed from 'pending' to 'active'
    if (previousStatus === "pending" && updateData.status === "active") {
      try {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        await sendMail({
          to: user.email,
          subject: "Your Partner Account Approved",
          text: `Dear ${user.first_name},\n\nYour partner account request has been approved!\nYou can now login to the system here: ${frontendUrl}/login\n\nThank you for partnering with us.`,
          html: `<p>Dear <b>${user.first_name}</b>,</p>
                 <p>Your partner account request has been approved!</p>
                 <p>You can now login to the system using your credentials.</p>
                 <p>
                   <a href="${frontendUrl}/login" style="display: inline-block; padding: 10px 20px; background-color: #1e3a5f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Login Now</a>
                 </p>
                 <p>Thank you for partnering with us.</p>`,
        });
      } catch (emailErr) {
        console.error("Failed to send approval email:", emailErr);
      }
    }

    // Fetch user with full permission objects
    const userWithPermissions = await User.findByPk(user._id, {
      include: [{ model: Permission, as: "permission" }],
    });
    res.json({ success: true, data: userWithPermissions });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a user
exports.remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    await user.destroy();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    // Handle foreign key constraint violations (user is referenced by sale_items, stocks, etc.)
    if (err.original && err.original.errno === 1451) {
      return res.status(409).json({
        success: false,
        error:
          "Cannot delete this user because it is referenced by existing user records.",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// Reset password (admin)
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await user.update({ password: hashedPassword });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update profile (self)
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const allowedFields = [
      "first_name",
      "last_name",
      "phone",
      "address",
      "profile",
      "email", // Allow email update
      "password", // Allow password update
    ];

    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        if (key === "password") {
          if (req.body.password && req.body.password.length >= 6) {
            updateData.password = await bcrypt.hash(req.body.password, 10);
          }
        } else if (key === "email") {
          const newEmail = req.body.email;
          if (newEmail && newEmail !== user.email) {
            // Check if email already exists
            const existing = await User.findOne({ where: { email: newEmail } });
            if (existing) {
              return res.status(409).json({
                success: false,
                error: "Email already exists",
              });
            }
            updateData.email = newEmail;
          }
        } else if (
          key === "address" &&
          typeof req.body.address === "object" &&
          !Array.isArray(req.body.address)
        ) {
          updateData.address = {
            street: req.body.address.street || "",
            house: req.body.address.house || "",
            village: req.body.address.village || "",
            commune: req.body.address.commune || "",
            district: req.body.address.district || "",
            province: req.body.address.province || "",
          };
        } else {
          updateData[key] = req.body[key];
        }
      }
    }

    await user.update(updateData);

    // Return updated user info (exclude password)
    const updatedUser = user.toJSON();
    delete updatedUser.password;

    res.json({ success: true, data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all active external customers (for sale modal - no view_user permission required)
exports.getCustomers = async (req, res) => {
  try {
    const customers = await User.findAll({
      where: { user_type: "external", status: "active" },
      attributes: ["_id", "first_name", "last_name", "email", "phone"],
      order: [["first_name", "ASC"]],
    });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};