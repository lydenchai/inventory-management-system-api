const Permission = require("../models/Permission");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { Op } = require("sequelize");
const { sendMail } = require("../utils/mail.util");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const REFRESH_SECRET =
  process.env.REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";
const refreshTokens = new Set(); // In-memory store for demo; use DB/Redis in production

exports.register = async (req, res) => {
  try {
    let {
      email,
      password,
      first_name,
      last_name,
      phone,
      address,
      company_name,
      position,
      company_registration_no,
      request_purpose,
      expected_order_volume,
      order_frequency,
      product_categories,
      id_card_or_business_license,
      shop_photo,
      location_lat,
      location_lng,
      agree_terms,
      note_from_customer,
    } = req.body;

    // Ensure address is always an object if provided as a JSON string
    if (typeof address === "string") {
      try {
        address = JSON.parse(address);
      } catch (e) {
        address = null;
      }
    }

    // Ensure product_categories is parsed if string
    if (typeof product_categories === "string") {
      try {
        product_categories = JSON.parse(product_categories);
      } catch (e) {
        product_categories = [];
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check for duplicate email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }

    // Always assign 'customer' role and customer permissions
    // Find or create the 'customer' permission
    // let customerPermission = await Permission.findOne({
    //   where: { name: "customer" },
    // });
    // if (!customerPermission) {
    //   customerPermission = await Permission.create({
    //     name: "customer",
    //     description: "Customer role permissions",
    //     permissions: [
    //       "view_dashboard",
    //       "view_product",
    //       "view_category",
    //       "view_supplier",
    //       "view_order_request",
    //       "create_order_request",
    //       "view_order_history",
    //     ],
    //   });
    // }

    const user = await User.create({
      first_name,
      last_name,
      email,
      phone,
      address: address && typeof address === "object" ? address : null,
      password: hashedPassword,
      role: null,
      permission_id: null,
      status: "pending", // Default to pending for approval
      user_type: "external",
      company_name,
      position,
      company_registration_no,
      request_purpose,
      expected_order_volume,
      order_frequency,
      product_categories,
      id_card_or_business_license,
      shop_photo,
      location_lat,
      location_lng,
      agree_terms,
      note_from_customer,
    });

    // Fetch user with permission (role) object
    const userMapped = await User.findByPk(user._id, {
      include: [{ model: Permission, as: "permission" }],
    });

    // Send email to users with user management permissions
    try {
      // Find all permissions that include 'view_user' or 'update_user'
      const permissions = await Permission.findAll();
      const targetPermissionIds = permissions
        .filter(
          (p) =>
            p.permissions &&
            (p.permissions.includes("view_user") ||
              p.permissions.includes("update_user")),
        )
        .map((p) => p._id);

      if (targetPermissionIds.length > 0) {
        const recipients = await User.findAll({
          where: {
            permission_id: { [Op.in]: targetPermissionIds },
            status: "active",
          },
        });

        const recipientEmails = recipients.map((u) => u.email);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

        if (recipientEmails.length > 0) {
          // Create in-app notifications
          await Promise.all(
            recipients.map((recipient) =>
              Notification.create({
                user_id: recipient._id,
                type: "register_request",
                message: `New partner request from ${first_name} ${last_name}`,
                entity_type: "user",
                entity_id: user._id,
                read: false,
              }),
            ),
          );

          await sendMail({
            to: recipientEmails.join(","),
            subject: "New Partner Registration Request",
            text: `A new partner request has been received from ${first_name} ${last_name} (${company_name || "Business"}).\n\nEmail: ${email}\nPhone: ${phone}\n\nPlease login to the admin panel to review and approve:\n${frontendUrl}/users`,
            html: `<p>A new partner request has been received from <b>${first_name} ${last_name}</b> (${company_name || "Business"}).</p>
                 <p>Email: ${email}</p>
                 <p>Phone: ${phone}</p>
                 <p>Please login to the admin panel to review and approve.</p>
                 <p>
                   <a href="${frontendUrl}/users" style="display: inline-block; padding: 10px 20px; background-color: #1e3a5f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Request</a>
                 </p>`,
          });
        }
      }
    } catch (emailErr) {
      console.error("Failed to send notification email:", emailErr);
    }
    res.status(201).json({
      success: true,
      data: {
        _id: userMapped._id,
        email: userMapped.email,
        phone: userMapped.phone,
        address: userMapped.address || {},
        role: userMapped.role,
        first_name: userMapped.first_name,
        last_name: userMapped.last_name,
        permission: userMapped.permission,
        profile: userMapped.profile,
        status: userMapped.status,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Fetch user with permission (role) object
    // Allow login with email, phone
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email }, { phone: email }],
      },
      include: [{ model: Permission, as: "permission" }],
    });
    if (!user)
      return res
        .status(400)
        .json({ success: false, error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res
        .status(400)
        .json({ success: false, error: "Invalid credentials" });

    if (user.status === "pending") {
      return res.status(403).json({
        success: false,
        error:
          "Your account is pending approval. Please wait for admin confirmation.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Your account is inactive. Please contact administrator.",
      });
    }

    const access_token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        permission: user.permission,
        profile: user.profile,
        iat: Math.floor(Date.now() / 1000), // Issued at time
        jti: require("crypto").randomUUID(), // JWT ID for uniqueness
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    const refresh_token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        permission: user.permission,
        profile: user.profile,
        jti: require("crypto").randomUUID(),
      },
      REFRESH_SECRET,
      { expiresIn: "7d" },
    );
    refreshTokens.add(refresh_token);

    // Set secure httpOnly cookies
    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ success: true, data: { access_token, refresh_token } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Stateless logout for JWT
exports.logout = (req, res) => {
  // Remove refresh token if provided
  const refresh_token = req.cookies.refresh_token || req.body.refresh_token;
  if (refresh_token) refreshTokens.delete(refresh_token);

  // Clear cookies
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");

  res.json({ success: true, data: { message: "Logged out" } });
};

exports.refresh = (req, res) => {
  // Check for refresh token in cookie or body
  const refresh_token = req.cookies.refresh_token || req.body.refresh_token;

  if (!refresh_token) {
    return res
      .status(401)
      .json({ success: false, error: "No refresh token provided" });
  }

  // Check if refresh token is valid and not revoked
  if (!refreshTokens.has(refresh_token)) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid refresh token" });
  }

  try {
    const payload = jwt.verify(refresh_token, REFRESH_SECRET);

    // Remove old refresh token (token rotation)
    refreshTokens.delete(refresh_token);

    // Generate new tokens
    const new_access_token = jwt.sign(
      {
        _id: payload._id,
        email: payload.email,
        role: payload.role,
        first_name: payload.first_name,
        last_name: payload.last_name,
        permission: payload.permission,
        profile: payload.profile,
        iat: Math.floor(Date.now() / 1000),
        jti: require("crypto").randomUUID(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const new_refresh_token = jwt.sign(
      {
        _id: payload._id,
        email: payload.email,
        role: payload.role,
        first_name: payload.first_name,
        last_name: payload.last_name,
        permission: payload.permission,
        profile: payload.profile,
        jti: require("crypto").randomUUID(),
      },
      REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    // Store new refresh token
    refreshTokens.add(new_refresh_token);

    // Set new secure cookies
    res.cookie("access_token", new_access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", new_refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { access_token: new_access_token } });
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: "Expired or invalid refresh token" });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user._id, {
      attributes: [
        "_id",
        "email",
        "role",
        "first_name",
        "last_name",
        "phone",
        "address",
        "profile",
        "phone",
        "address",
        "user_type",
        "createdAt",
        "updatedAt",
      ],
      include: [{ model: Permission, as: "permission" }],
    });
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    let address = user.address;
    if (typeof address === "string") {
      try {
        address = JSON.parse(address);
      } catch (e) {
        address = {};
      }
    }

    res.json({
      success: true,
      data: { ...user.toJSON(), address: address || {} },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
