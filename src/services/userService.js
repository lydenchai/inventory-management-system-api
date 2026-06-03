const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Permission = require("../models/Permission");
const { sendMail } = require("../utils/mail.util");

class UserService {
  async getAll({ page = 1, limit = 10, search, permission_id, status, user_type }) {
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where.$or = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
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
    const totalItems = await User.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);
    const users = await User.find(where)
      .limit(limit)
      .skip(offset)
      .sort({ _id: -1 });

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
    return {
      data: usersMapped,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async getOne(id) {
    const user = await User.findById(id).populate("permission_id");
    if (!user) throw new Error("Not found");

    let userData = user.toJSON();
    userData.permission = userData.permission_id;
    delete userData.permission_id;

    if (typeof userData.address === "string") {
      try {
        userData.address = JSON.parse(userData.address);
      } catch {
        userData.address = {};
      }
    }

    if (typeof userData.product_categories === "string") {
      try {
        userData.product_categories = JSON.parse(userData.product_categories);
      } catch {
        userData.product_categories = [];
      }
    }

    return userData;
  }

  async create(data) {
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
    } = data;

    const userData = {
      email,
      first_name,
      last_name,
      phone,
      role,
      permission_id: permission_id || null,
      status: status || "active",
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

    if (address) {
      if (typeof address === "object" && !Array.isArray(address)) {
        userData.address = {
          street: address.street || "",
          house: address.house || "",
          village: address.village || "",
          commune: address.commune || "",
          district: address.district || "",
          province: address.province || "",
        };
      } else if (typeof address === "string") {
        try {
          userData.address = JSON.parse(address);
        } catch (e) {
          userData.address = {};
        }
      }
    }

    if (password) {
      userData.password = await bcrypt.hash(password, 10);
    } else {
      throw new Error("Password is required");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      throw new Error("Email already exists");
    }

    if (permission_id) {
      const perm = await Permission.findById(permission_id);
      if (!perm) {
        throw new Error("Invalid permission role selected");
      }
      userData.role = perm.name;
    }

    const user = await User.create(userData);

    const userWithPermissions = await User.findById(user._id).populate("permission_id");
    const obj = userWithPermissions.toJSON();
    obj.permission = obj.permission_id;
    delete obj.permission_id;

    return obj;
  }

  async update(id, data) {
    const user = await User.findById(id);
    if (!user) throw new Error("Not found");
    const allowedFields = [
      "email", "password", "role", "first_name", "last_name", "phone",
      "address", "profile", "permission_id", "status", "user_type",
      "company_name", "company_registration_no", "request_purpose",
      "expected_order_volume", "order_frequency", "product_categories",
      "id_card_or_business_license", "shop_photo", "location_lat",
      "location_lng", "agree_terms", "note_from_customer",
    ];
    const updateData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        if (key === "address" && typeof data.address === "object" && !Array.isArray(data.address)) {
          updateData.address = {
            street: data.address.street || "",
            house: data.address.house || "",
            village: data.address.village || "",
            commune: data.address.commune || "",
            district: data.address.district || "",
            province: data.address.province || "",
          };
        } else {
          updateData[key] = data[key];
        }
      }
    }
    const previousStatus = user.status;

    if (updateData.email && updateData.email !== user.email) {
      const emailTaken = await User.findOne({ email: updateData.email, _id: { $ne: id } });
      if (emailTaken) {
        throw new Error("Email already in use by another user.");
      }
    }

    Object.assign(user, updateData);
    await user.save();

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

    const userWithPermissions = await User.findById(user._id).populate("permission_id");
    const obj = userWithPermissions.toJSON();
    obj.permission = obj.permission_id;
    delete obj.permission_id;

    return obj;
  }

  async remove(id) {
    const user = await User.findById(id);
    if (!user) throw new Error("Not found");
    await User.findByIdAndDelete(id);
    return true;
  }

  async resetPassword(id, password) {
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    const user = await User.findById(id);
    if (!user) {
      throw new Error("User not found");
    }
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    return true;
  }

  async updateProfile(userId, data) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const allowedFields = [
      "first_name", "last_name", "phone", "address", "profile", "email", "password"
    ];

    const updateData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        if (key === "password") {
          if (data.password && data.password.length >= 6) {
            updateData.password = await bcrypt.hash(data.password, 10);
          }
        } else if (key === "email") {
          const newEmail = data.email;
          if (newEmail && newEmail !== user.email) {
            const existing = await User.findOne({ email: newEmail });
            if (existing) {
              throw new Error("Email already exists");
            }
            updateData.email = newEmail;
          }
        } else if (key === "address" && typeof data.address === "object" && !Array.isArray(data.address)) {
          updateData.address = {
            street: data.address.street || "",
            house: data.address.house || "",
            village: data.address.village || "",
            commune: data.address.commune || "",
            district: data.address.district || "",
            province: data.address.province || "",
          };
        } else {
          updateData[key] = data[key];
        }
      }
    }

    Object.assign(user, updateData);
    await user.save();

    const updatedUser = user.toJSON();
    delete updatedUser.password;

    return updatedUser;
  }

  async getCustomers() {
    return await User.find({ user_type: "external", status: "active" })
      .select("_id first_name last_name email phone")
      .sort({ first_name: 1 });
  }
}

module.exports = new UserService();
