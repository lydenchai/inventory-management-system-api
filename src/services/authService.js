const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Permission = require("../models/Permission");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendMail } = require("../utils/mail.util");

const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";
const refreshTokens = new Set();
const resetTokens = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of resetTokens) {
    if (val.expires < now) resetTokens.delete(key);
  }
}, 15 * 60 * 1000).unref();

class AuthService {
  async register(data) {
    let {
      email, password, first_name, last_name, phone, address,
      company_name, position, company_registration_no, request_purpose,
      expected_order_volume, order_frequency, product_categories,
      id_card_or_business_license, shop_photo, location_lat, location_lng,
      agree_terms, note_from_customer,
    } = data;

    if (typeof address === "string") {
      try { address = JSON.parse(address); } catch (e) { address = null; }
    }
    if (typeof product_categories === "string") {
      try { product_categories = JSON.parse(product_categories); } catch (e) { product_categories = []; }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    const user = await User.create({
      first_name, last_name, email, phone,
      address: address && typeof address === "object" ? address : null,
      password: hashedPassword,
      role: null,
      permission_id: null,
      status: "pending",
      user_type: "external",
      company_name, position, company_registration_no, request_purpose,
      expected_order_volume, order_frequency, product_categories,
      id_card_or_business_license, shop_photo, location_lat, location_lng,
      agree_terms, note_from_customer,
    });

    const userMapped = await User.findById(user._id).populate("permission_id");

    try {
      const permissions = await Permission.find();
      const targetPermissionIds = permissions
        .filter(p => p.permissions && (p.permissions.includes("view_user") || p.permissions.includes("update_user")))
        .map(p => p._id);

      if (targetPermissionIds.length > 0) {
        const recipients = await User.find({ permission_id: { $in: targetPermissionIds }, status: "active" });
        const recipientEmails = recipients.map(u => u.email);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

        if (recipientEmails.length > 0) {
          await Promise.all(
            recipients.map(recipient => Notification.create({
              user_id: recipient._id,
              type: "register_request",
              message: `New partner request from ${first_name} ${last_name}`,
              entity_type: "user",
              entity_id: user._id,
              read: false,
            }))
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

    return {
      _id: userMapped._id,
      email: userMapped.email,
      phone: userMapped.phone,
      address: userMapped.address || {},
      role: userMapped.role,
      first_name: userMapped.first_name,
      last_name: userMapped.last_name,
      permission: userMapped.permission_id,
      profile: userMapped.profile,
      status: userMapped.status,
    };
  }

  async login(email, password) {
    const user = await User.findOne({
      $or: [{ email }, { phone: email }],
    }).populate("permission_id");

    if (!user) throw new Error("Invalid credentials");
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    if (user.status === "pending") {
      throw new Error("Your account is pending approval. Please wait for admin confirmation.");
    }
    if (user.status !== "active") {
      throw new Error("Your account is inactive. Please contact administrator.");
    }

    const access_token = jwt.sign(
      {
        _id: user._id, email: user.email, role: user.role,
        first_name: user.first_name, last_name: user.last_name,
        permission: user.permission_id, profile: user.profile,
        iat: Math.floor(Date.now() / 1000), jti: crypto.randomUUID(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const refresh_token = jwt.sign(
      {
        _id: user._id, email: user.email, role: user.role,
        first_name: user.first_name, last_name: user.last_name,
        permission: user.permission_id, profile: user.profile,
        jti: crypto.randomUUID(),
      },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    refreshTokens.add(refresh_token);

    return { access_token, refresh_token };
  }

  logout(refresh_token) {
    if (refresh_token) refreshTokens.delete(refresh_token);
    return true;
  }

  async refresh(refresh_token) {
    if (!refresh_token) throw new Error("No refresh token provided");
    if (!refreshTokens.has(refresh_token)) throw new Error("Invalid refresh token");

    try {
      const payload = jwt.verify(refresh_token, REFRESH_SECRET);
      refreshTokens.delete(refresh_token);

      const new_access_token = jwt.sign(
        {
          _id: payload._id, email: payload.email, role: payload.role,
          first_name: payload.first_name, last_name: payload.last_name,
          permission: payload.permission, profile: payload.profile,
          iat: Math.floor(Date.now() / 1000), jti: crypto.randomUUID(),
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      const new_refresh_token = jwt.sign(
        {
          _id: payload._id, email: payload.email, role: payload.role,
          first_name: payload.first_name, last_name: payload.last_name,
          permission: payload.permission, profile: payload.profile,
          jti: crypto.randomUUID(),
        },
        REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      refreshTokens.add(new_refresh_token);
      return { access_token: new_access_token, refresh_token: new_refresh_token };
    } catch (err) {
      throw new Error("Expired or invalid refresh token");
    }
  }

  async getProfile(userId) {
    const user = await User.findById(userId)
      .select("_id email role first_name last_name phone address profile user_type createdAt updatedAt permission_id")
      .populate("permission_id");

    if (!user) throw new Error("User not found");

    let address = user.address;
    if (typeof address === "string") {
      try { address = JSON.parse(address); } catch (e) { address = {}; }
    }

    const userData = user.toJSON();
    userData.permission = userData.permission_id;
    delete userData.permission_id;

    return { ...userData, address: address || {} };
  }

  async requestPasswordReset(email) {
    if (!email) throw new Error("Email is required");
    const user = await User.findOne({ email });
    if (!user) return true; // Always return true to prevent enumeration

    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, {
      userId: user._id,
      expires: Date.now() + 1000 * 60 * 15,
    });
    
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;
    try {
      await sendMail({
        to: user.email,
        subject: "Password Reset Request",
        text: `Reset your password: ${resetUrl}`,
        html: `<p>Click <a href='${resetUrl}'>here</a> to reset your password. This link expires in 15 minutes.</p>`,
      });
    } catch (err) {
      console.error("Failed to send password reset email:", err);
      throw new Error("Failed to send reset email. Please try again later.");
    }
    return true;
  }

  async resetPassword(token, password) {
    if (!token || !password) throw new Error("Token and password required");
    const data = resetTokens.get(token);
    if (!data || data.expires < Date.now()) throw new Error("Invalid or expired token");
    const user = await User.findById(data.userId);
    if (!user) throw new Error("User not found");
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    resetTokens.delete(token);
    return true;
  }
}

module.exports = new AuthService();
