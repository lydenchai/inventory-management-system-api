const Permission = require("../models/Permission");
const User = require("../models/User");

class PermissionService {
  async getAll({ page = 1, limit = 10, search }) {
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where.name = { $regex: search, $options: "i" };
    }
    const totalItems = await Permission.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);
    const permissions = await Permission.find(where)
      .limit(limit)
      .skip(offset)
      .sort({ _id: -1 });

    return {
      data: permissions,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async getOne(id) {
    const permission = await Permission.findById(id);
    if (!permission) throw new Error("Permission not found");
    return permission;
  }

  async create(data) {
    const { name } = data;
    if (!name || !name.trim()) {
      throw new Error("Role name is required.");
    }
    const existing = await Permission.findOne({
      name: { $regex: new RegExp("^" + name.trim() + "$", "i") },
    });
    if (existing) {
      throw new Error(`Role "${name}" already exists.`);
    }
    const permission = await Permission.create(data);
    return permission;
  }

  async update(id, data) {
    const permission = await Permission.findById(id);
    if (!permission) throw new Error("Permission not found");

    if (data.name && data.name.trim()) {
      const duplicate = await Permission.findOne({
        name: { $regex: new RegExp("^" + data.name.trim() + "$", "i") },
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new Error(`Role "${data.name}" already exists.`);
      }
    }

    let updateData = { ...data };
    if (updateData.permissions !== undefined) {
      if (typeof updateData.permissions === "string") {
        try {
          updateData.permissions = JSON.parse(updateData.permissions);
        } catch {
          updateData.permissions = [];
        }
      }
      if (!Array.isArray(updateData.permissions)) {
        updateData.permissions = [];
      }
    }
    Object.assign(permission, updateData);
    await permission.save();
    return permission;
  }

  async remove(id) {
    const permission = await Permission.findById(id);
    if (!permission) throw new Error("Permission not found");
    
    const userCount = await User.countDocuments({ permission_id: id });
    if (userCount > 0) {
      throw new Error("Cannot delete this permission because it is referenced by existing user records.");
    }

    await Permission.findByIdAndDelete(id);
    return true;
  }
}

module.exports = new PermissionService();
