const Supplier = require("../models/Supplier");
const Product = require("../models/Product");

class SupplierService {
  async getAll({ page = 1, limit = 10, search = "", status = "", location = "" }) {
    if (limit === -1) {
      limit = 1000;
      page = 1;
    }
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where.$or = [
        { company_name: { $regex: search, $options: "i" } },
        { contact_person: { $regex: search, $options: "i" } },
        { contact_email: { $regex: search, $options: "i" } },
        { contact_phone: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (location) {
      where.location = location;
    }
    const totalItems = await Supplier.countDocuments(where);
    const totalPages = Math.ceil(totalItems / limit);
    const suppliers = await Supplier.find(where)
      .limit(limit)
      .skip(offset)
      .sort({ _id: -1 });

    const suppliersMapped = await Promise.all(
      suppliers.map(async (supplier) => {
        const count = await Product.countDocuments({ supplier_id: supplier._id });
        let address = supplier.address;
        if (typeof address === "string") {
          try {
            address = JSON.parse(address);
          } catch {
            address = {};
          }
        }
        return {
          ...supplier.toJSON(),
          address: address || {},
          products_count: count,
        };
      }),
    );

    return {
      data: suppliersMapped,
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async getOne(id) {
    const supplier = await Supplier.findById(id);
    if (!supplier) throw new Error("Not found");
    const products = await Product.find({ supplier_id: supplier._id });
    const data = supplier.toJSON();
    data.products = products;
    return data;
  }

  async create(data) {
    return await Supplier.create(data);
  }

  async update(id, data) {
    const supplier = await Supplier.findById(id);
    if (!supplier) throw new Error("Not found");
    Object.assign(supplier, data);
    return await supplier.save();
  }

  async remove(id) {
    const supplier = await Supplier.findById(id);
    if (!supplier) throw new Error("Not found");
    
    const productCount = await Product.countDocuments({ supplier_id: id });
    if (productCount > 0) {
      throw new Error("Cannot delete this supplier because it is referenced by existing products.");
    }

    await Supplier.findByIdAndDelete(id);
    return true;
  }
}

module.exports = new SupplierService();
