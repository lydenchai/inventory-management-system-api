require("dotenv").config({ path: "../.env" });
const bcrypt = require("bcryptjs");
const { sequelize } = require("../src/models");
const {
  User,
  Product,
  Stock,
  Category,
  Supplier,
  Permission,
  OrderRequest,
  OrderRequestItem,
  Notification,
  ActivityLog,
  ApproveRequest,
  Sale,
  SaleItem,
  Expense,
} = require("../src/models/associations");

async function seed() {
  // Disable foreign key checks, drop and recreate all tables
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  await sequelize.sync({ force: true }); // Drops and recreates tables
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

  // Seed categories
  const categories = await Category.bulkCreate([
    {
      name: "Electronics",
      description: "Electronic devices and gadgets",
      status: "active",
    },
    {
      name: "Stationery",
      description: "Office and school supplies",
      status: "active",
    },
    {
      name: "Furniture",
      description: "Home and office furniture",
      status: "active",
    },
    {
      name: "Food & Beverage",
      description: "Groceries and drinks",
      status: "active",
    },
    {
      name: "Clothing",
      description: "Apparel and accessories",
      status: "active",
    },
    {
      name: "Health & Beauty",
      description: "Personal care products",
      status: "active",
    },
    {
      name: "Sports & Outdoors",
      description: "Sporting goods and outdoor gear",
      status: "active",
    },
    {
      name: "Automotive",
      description: "Car parts and accessories",
      status: "active",
    },
    {
      name: "Toys & Games",
      description: "Children's toys and games",
      status: "active",
    },
    {
      name: "Books & Media",
      description: "Books, music, and movies",
      status: "active",
    },
    {
      name: "Office Supplies",
      description: "Supplies for office use",
      status: "active",
    },
    {
      name: "Cleaning Supplies",
      description: "Products for cleaning and maintenance",
      status: "active",
    },
    {
      name: "Pet Supplies",
      description: "Products for pets",
      status: "active",
    },
    {
      name: "Garden & Outdoor",
      description: "Gardening tools and outdoor equipment",
      status: "active",
    },
    {
      name: "Baby Products",
      description: "Products for babies and toddlers",
      status: "active",
    },
    {
      name: "Hardware",
      description: "Tools and hardware supplies",
      status: "active",
    },
    {
      name: "Software",
      description: "Computer software and licenses",
      status: "active",
    },
    {
      name: "Music Instruments",
      description: "Instruments and accessories",
      status: "active",
    },
    {
      name: "Art Supplies",
      description: "Materials for artists",
      status: "active",
    },
    {
      name: "Travel & Luggage",
      description: "Travel bags and accessories",
      status: "active",
    },
    {
      name: "Jewelry",
      description: "Fashion jewelry and accessories",
      status: "active",
    },
    {
      name: "Watches",
      description: "Wristwatches and accessories",
      status: "active",
    },
    { name: "Footwear", description: "Shoes and footwear", status: "active" },
    {
      name: "Accessories",
      description: "Fashion accessories",
      status: "active",
    },
    {
      name: "Gadgets",
      description: "Unique gadgets and tech",
      status: "active",
    },
    {
      name: "Collectibles",
      description: "Collectible items and memorabilia",
      status: "active",
    },
    {
      name: "Musical Instruments",
      description: "Instruments and music gear",
      status: "active",
    },
    {
      name: "Industrial Supplies",
      description: "Supplies for industrial use",
      status: "active",
    },
    {
      name: "Medical Supplies",
      description: "Healthcare products and equipment",
      status: "active",
    },
  ]);

  // Seed suppliers
  const suppliers = await Supplier.bulkCreate([
    {
      company_name: "TechVision Electronics Co., Ltd.",
      location: "Phnom Penh",
      contact_person: "Sovann Chea",
      contact_position: "General Manager",
      contact_email: "sovann.chea@techvision.com.kh",
      contact_phone: "023 456 789",
      address: {
        street: "Monivong Blvd",
        house: "45",
        village: "Phsar Daeum Thkov",
        commune: "Tonle Bassac",
        district: "Chamkar Mon",
        province: "Phnom Penh",
      },
      payment_term: "Net 30",
      status: "Active",
    },
    {
      company_name: "Angkor Stationery & Office Supplies",
      location: "Siem Reap",
      contact_person: "Bopha Lim",
      contact_position: "Sales Director",
      contact_email: "bopha@angkoroffice.com",
      contact_phone: "063 761 234",
      address: {
        street: "Sivutha Blvd",
        house: "112",
        village: "Svay Thom",
        commune: "Svay Dangkum",
        district: "Siem Reap",
        province: "Siem Reap",
      },
      payment_term: "Net 60",
      status: "Active",
    },
    {
      company_name: "Cambodian Business Hub Co., Ltd.",
      location: "Phnom Penh",
      contact_person: "Dara Uch",
      contact_position: "Procurement Director",
      contact_email: "dara.uch@cambohub.com.kh",
      contact_phone: "012 334 556",
      address: {
        street: "Norodom Blvd",
        house: "230",
        village: "Boeung Keng Kang I",
        commune: "Boeung Keng Kang",
        district: "Chamkar Mon",
        province: "Phnom Penh",
      },
      payment_term: "Net 45",
      status: "Active",
    },
    {
      company_name: "Mekong Furniture & Interiors",
      location: "Battambang",
      contact_person: "Rathana Kong",
      contact_position: "Sales Manager",
      contact_email: "rathana@mekongfurniture.com",
      contact_phone: "053 952 410",
      address: {
        street: "Street 2",
        house: "78",
        village: "Svay Por",
        commune: "Svay Por",
        district: "Battambang",
        province: "Battambang",
      },
      payment_term: "Net 30",
      status: "Active",
    },
    {
      company_name: "SmartTech Distribution Pte Ltd",
      location: "Phnom Penh",
      contact_person: "Chanthy Phen",
      contact_position: "Key Account Executive",
      contact_email: "chanthy@smartdist.com",
      contact_phone: "078 445 667",
      address: {
        street: "Russian Blvd",
        house: "15B",
        village: "Tuol Sangke",
        commune: "Tuol Sangke",
        district: "Russei Keo",
        province: "Phnom Penh",
      },
      payment_term: "Net 60",
      status: "Active",
    },
    {
      company_name: "PaperLink Office Products",
      location: "Siem Reap",
      contact_person: "Vibol Heng",
      contact_position: "Procurement Officer",
      contact_email: "vibol.heng@paperlink.net",
      contact_phone: "063 964 123",
      address: {
        street: "Airport Rd",
        house: "340",
        village: "Kouk Chak",
        commune: "Kouk Chak",
        district: "Siem Reap",
        province: "Siem Reap",
      },
      payment_term: "Net 45",
      status: "Active",
    },
    {
      company_name: "Lotus Beauty & Wellness Imports",
      location: "Phnom Penh",
      contact_person: "Sreymom Keo",
      contact_position: "Sales Director",
      contact_email: "sreymom@lotusbeauty.com.kh",
      contact_phone: "017 556 778",
      address: {
        street: "Toul Kork Ave",
        house: "88",
        village: "Phsar Depou I",
        commune: "Toul Kork",
        district: "Toul Kork",
        province: "Phnom Penh",
      },
      payment_term: "Net 30",
      status: "Active",
    },
    {
      company_name: "Khmer Sport & Apparel Co.",
      location: "Battambang",
      contact_person: "Piseth Nop",
      contact_position: "Regional Sales Manager",
      contact_email: "piseth@khmersport.com",
      contact_phone: "053 730 289",
      address: {
        street: "Street 3",
        house: "54",
        village: "Kampong Seima",
        commune: "Svay Por",
        district: "Battambang",
        province: "Battambang",
      },
      payment_term: "Net 60",
      status: "Active",
    },
    {
      company_name: "Premier Auto Parts Import",
      location: "Phnom Penh",
      contact_person: "Makara Hout",
      contact_position: "Procurement Manager",
      contact_email: "makara@premierauto.com.kh",
      contact_phone: "011 889 001",
      address: {
        street: "National Rd 5",
        house: "201",
        village: "Chroy Changvar",
        commune: "Chroy Changvar",
        district: "Chroy Changvar",
        province: "Phnom Penh",
      },
      payment_term: "Net 45",
      status: "Active",
    },
    {
      company_name: "Phnom Penh Book Centre",
      location: "Phnom Penh",
      contact_person: "Leakhena Srun",
      contact_position: "Sales Executive",
      contact_email: "leakhena@ppbookcentre.com",
      contact_phone: "023 210 456",
      address: {
        street: "Sothearos Blvd",
        house: "32",
        village: "Chaktomouk",
        commune: "Chey Chumneah",
        district: "Doun Penh",
        province: "Phnom Penh",
      },
      payment_term: "Net 30",
      status: "Active",
    },
    {
      company_name: "Golden Thread Fashion Wholesale",
      location: "Phnom Penh",
      contact_person: "Sopheak Tan",
      contact_position: "Sales Manager",
      contact_email: "sopheak@goldenthread.com.kh",
      contact_phone: "016 001 234",
      address: {
        street: "Street 182",
        house: "7A",
        village: "Phsar Thmey I",
        commune: "Phsar Thmey",
        district: "Doun Penh",
        province: "Phnom Penh",
      },
      payment_term: "Net 30",
      status: "Active",
    },
  ]);

  // Seed permissions FIRST

  const adminPermission = await Permission.create({
    name: "Admin",
    description: "Manage everything",
    permissions: [
      // Dashboard
      "view_dashboard",
      // Categories
      "view_category",
      "create_category",
      "update_category",
      "delete_category",
      // Products
      "view_product",
      "create_product",
      "update_product",
      "delete_product",
      // Suppliers
      "view_supplier",
      "create_supplier",
      "update_supplier",
      "delete_supplier",
      // Stocks
      "view_stock",
      "create_stock",
      "update_stock",
      "delete_stock",
      // Order Requests (Purchase)
      "view_order_request",
      "create_order_request",
      "update_order_request",
      "delete_order_request",
      // Approvals
      "view_approve_request",
      "update_approve_request",
      // Confirm Delivery
      "view_confirm_delivery",
      "update_confirm_delivery",
      // Sales
      "view_sale",
      "create_sale",
      "update_sale",
      "delete_sale",
      // Expenses
      "view_expense",
      "create_expense",
      "update_expense",
      "delete_expense",
      // Order History
      "view_order_history",
      // Reports & Logs
      "view_order_stats",
      "view_activity_log",
      "view_report",
      "view_inventory_summary",
      // Permissions
      "view_permission",
      "create_permission",
      "update_permission",
      "delete_permission",
      // Users
      "view_user",
      "create_user",
      "update_user",
      "delete_user",
    ],
  });

  const staffPermission = await Permission.create({
    name: "Staff",
    description: "Limited access",
    permissions: [
      // Dashboard
      "view_dashboard",
      // Master Data (read-only)
      "view_category",
      "create_category",
      "update_category",
      "delete_category",
      // Products
      "view_product",
      "create_product",
      "update_product",
      "delete_product",
      // Suppliers
      "view_supplier",
      "create_supplier",
      "update_supplier",
      "delete_supplier",
      // Stock (read-only)
      "view_stock",
      "create_stock",
      "update_stock",
      "delete_stock",
      // Purchasing
      "view_order_request",
      "create_order_request",
      "update_order_request",
      "delete_order_request",
      "post_order_request",
      // Approvals
      "view_approve_request",
      "update_approve_request",
      // Confirm Delivery
      "view_confirm_delivery",
      "update_confirm_delivery",
      // Sales
      "view_sale",
      "create_sale",
      "update_sale",
      "delete_sale",
      // Expenses
      "view_expense",
      "create_expense",
      "update_expense",
      "delete_expense",
      // Order History
      "view_order_history",
      // Reports & Logs
      "view_report",
      "view_inventory_summary",
      "view_order_stats",
      "view_activity_log",
    ],
  });

  const customerPermission = await Permission.create({
    name: "Customer",
    description: "Customer access",
    permissions: [
      // Dashboard
      "view_dashboard",
      // Master Data (read-only)
      "view_product",
      "view_category",
      "view_supplier",
      // Purchasing
      "view_order_request",
      "create_order_request",
      // History
      "view_order_history",
    ],
  });

  const managerPermission = await Permission.create({
    name: "Manager",
    description: "Broad management access",
    permissions: [
      "view_dashboard",
      "view_category", "create_category", "update_category",
      "view_product", "create_product", "update_product",
      "view_supplier", "create_supplier", "update_supplier",
      "view_stock", "create_stock", "update_stock",
      "view_order_request", "create_order_request", "update_order_request",
      "view_approve_request", "update_approve_request",
      "view_confirm_delivery", "update_confirm_delivery",
      "view_sale", "create_sale", "update_sale",
      "view_expense", "create_expense", "update_expense",
      "view_order_history",
      "view_report", "view_inventory_summary", "view_order_stats", "view_activity_log",
    ],
  });

  const stockkeeperPermission = await Permission.create({
    name: "Stockkeeper",
    description: "Inventory and stock management",
    permissions: [
      "view_dashboard",
      "view_category",
      "view_product",
      "view_supplier",
      "view_stock", "create_stock", "update_stock",
      "view_order_request",
      "view_confirm_delivery", "update_confirm_delivery",
      "view_inventory_summary",
    ],
  });

  const financePermission = await Permission.create({
    name: "Finance",
    description: "Sales, expenses and financial reports",
    permissions: [
      "view_dashboard",
      "view_sale", "create_sale", "update_sale",
      "view_expense", "create_expense", "update_expense",
      "view_report", "view_order_stats",
    ],
  });

  // Now seed users
  const password = await bcrypt.hash("admin123", 10);
  const adminUser = await User.create({
    _id: "5f8d04f3b54764421b7156c0",
    email: "admin@example.com",
    password,
    role: "admin",
    first_name: "Lyden",
    last_name: "Chai",
    phone: "012 345 678",
    address: {
      street: "Norodom Blvd",
      house: "88",
      village: "Boeung Keng Kang I",
      commune: "Boeung Keng Kang",
      district: "Chamkar Mon",
      province: "Phnom Penh",
    },
    profile: "https://avatars.githubusercontent.com/u/122275653?v=4",
    permission_id: adminPermission._id,
    user_type: "internal",
  });

  const staffUser = await User.create({
    _id: "5f8d04f3b54764421b7156c1",
    email: "staff@example.com",
    password,
    role: "staff",
    first_name: "Lina",
    last_name: "Chea",
    phone: "096 765 432",
    address: {
      street: "Street 271",
      house: "17",
      village: "Tuol Svay Prey I",
      commune: "Tuol Svay Prey",
      district: "Chamkar Mon",
      province: "Phnom Penh",
    },
    profile: null,
    permission_id: staffPermission._id,
    user_type: "internal",
  });

  const customerPassword = await bcrypt.hash("customer123", 10);
  const customerUser = await User.create({
    _id: "5f8d04f3b54764421b7156c2",
    email: "customer@example.com",
    password: customerPassword,
    role: "customer",
    first_name: "Rithy",
    last_name: "Prak",
    phone: "011 223 445",
    address: {
      street: "Kampuchea Krom Blvd",
      house: "52A",
      village: "Phsar Daeum Kov",
      commune: "Phsar Depou II",
      district: "Toul Kork",
      province: "Phnom Penh",
    },
    profile: null,
    permission_id: customerPermission._id,
    user_type: "external",
  });

  const managerUser = await User.create({
    _id: "5f8d04f3b54764421b7156c3",
    email: "manager@example.com",
    password,
    role: "manager",
    first_name: "Veasna",
    last_name: "Chorn",
    phone: "015 998 776",
    address: {
      street: "Veng Sreng Blvd",
      house: "102",
      village: "Choam Chao I",
      commune: "Choam Chao",
      district: "Pou Senchey",
      province: "Phnom Penh",
    },
    profile: null,
    permission_id: managerPermission._id,
    user_type: "internal",
  });

  const stockkeeperUser = await User.create({
    _id: "5f8d04f3b54764421b7156c4",
    email: "stockkeeper@example.com",
    password,
    role: "stockkeeper",
    first_name: "Chorpor",
    last_name: "Chhem",
    phone: "088 112 233",
    address: {
      street: "Russian Blvd",
      house: "45",
      village: "Phsar Daeum Kor",
      commune: "Phsar Depou III",
      district: "Toul Kork",
      province: "Phnom Penh",
    },
    profile: null,
    permission_id: stockkeeperPermission._id,
    user_type: "internal",
  });

  const financeUser = await User.create({
    _id: "5f8d04f3b54764421b7156c5",
    email: "finance@example.com",
    password,
    role: "finance",
    first_name: "Sithet",
    last_name: "Thy",
    phone: "012 990 088",
    address: {
      street: "Charles de Gaulle Blvd",
      house: "234",
      village: "Veal Vong",
      commune: "Veal Vong",
      district: "7 Makara",
      province: "Phnom Penh",
    },
    profile: null,
    permission_id: financePermission._id,
    user_type: "internal",
  });

  // seed products
  const products = await Product.bulkCreate([
    {
      code: "P001",
      name: "Laptop",
      description: "15-inch laptop",
      price: 1200,
      stock: 5,
      image:
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
      category_id: categories[0]._id,
      supplier_id: suppliers[0]._id,
    },
    {
      code: "P002",
      name: "Desk Chair",
      description: "Ergonomic chair",
      price: 150,
      stock: 5,
      image:
        "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400",
      category_id: categories[2]._id,
      supplier_id: suppliers[1]._id,
    },
    {
      code: "P003",
      name: "Notebook",
      description: "A4 ruled",
      price: 2,
      stock: 30,
      image:
        "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400",
      category_id: categories[1]._id,
      supplier_id: suppliers[1]._id,
    },
    {
      code: "P004",
      name: "Monitor",
      description: "24-inch LED monitor",
      price: 250,
      stock: 25,
      image:
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400",
      category_id: categories[0]._id,
      supplier_id: suppliers[0]._id,
    },
    {
      code: "P005",
      name: "Pen Set",
      description: "Set of 10 pens",
      price: 5,
      stock: 100,
      image:
        "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400",
      category_id: categories[1]._id,
      supplier_id: suppliers[1]._id,
    },
    {
      code: "P006",
      name: "Office Desk",
      description: "Wooden office desk",
      price: 300,
      stock: 12,
      image:
        "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400",
      category_id: categories[2]._id,
      supplier_id: suppliers[3]._id,
    },
    {
      code: "P007",
      name: "Smartphone",
      description: "Latest model smartphone",
      price: 800,
      stock: 15,
      image:
        "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400",
      category_id: categories[0]._id,
      supplier_id: suppliers[4]._id,
    },
    {
      code: "P008",
      name: "Stapler",
      description: "Standard office stapler",
      price: 10,
      stock: 20,
      image:
        "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400",
      category_id: categories[1]._id,
      supplier_id: suppliers[5]._id,
    },
    {
      code: "P009",
      name: "Headphones",
      description: "Noise-cancelling headphones",
      price: 150,
      stock: 10,
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      category_id: categories[0]._id,
      supplier_id: suppliers[4]._id,
    },
    {
      code: "P010",
      name: "Whiteboard",
      description: "Magnetic whiteboard",
      price: 100,
      stock: 10,
      image:
        "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400",
      category_id: categories[2]._id,
      supplier_id: suppliers[3]._id,
    },
    {
      code: "P011",
      name: "Coffee Maker",
      description: "Automatic coffee maker",
      price: 80,
      stock: 3,
      image:
        "https://images.unsplash.com/photo-1520970014086-2208d157c9e2?w=400",
      category_id: categories[3]._id,
      supplier_id: suppliers[6]._id,
    },
    {
      code: "P012",
      name: "Water Bottle",
      description: "Insulated water bottle",
      price: 25,
      stock: 30,
      image:
        "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400",
      category_id: categories[3]._id,
      supplier_id: suppliers[6]._id,
    },
    {
      code: "P013",
      name: "Backpack",
      description: "Laptop backpack",
      price: 60,
      stock: 20,
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
      category_id: categories[4]._id,
      supplier_id: suppliers[7]._id,
    },
    {
      code: "P014",
      name: "Sunglasses",
      description: "Polarized sunglasses",
      price: 120,
      stock: 10,
      image:
        "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400",
      category_id: categories[4]._id,
      supplier_id: suppliers[7]._id,
    },
    {
      code: "P015",
      name: "Running Shoes",
      description: "Comfortable running shoes",
      price: 90,
      stock: 10,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
      category_id: categories[4]._id,
      supplier_id: suppliers[7]._id,
    },
    {
      code: "P016",
      name: "Shampoo",
      description: "Hair care shampoo",
      price: 15,
      stock: 20,
      image:
        "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400",
      category_id: categories[5]._id,
      supplier_id: suppliers[6]._id,
    },
    {
      code: "P017",
      name: "Conditioner",
      description: "Hair care conditioner",
      price: 15,
      stock: 20,
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400",
      category_id: categories[5]._id,
      supplier_id: suppliers[6]._id,
    },
    {
      code: "P018",
      name: "T-shirt",
      description: "Cotton t-shirt",
      price: 20,
      stock: 20,
      image:
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
      category_id: categories[4]._id,
      supplier_id: suppliers[7]._id,
    },
    {
      code: "P019",
      name: "Jeans",
      description: "Denim jeans",
      price: 40,
      stock: 20,
      image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
      category_id: categories[4]._id,
      supplier_id: suppliers[7]._id,
    },
    {
      code: "P020",
      name: "Jacket",
      description: "Winter jacket",
      price: 100,
      stock: 20,
      image:
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400",
      category_id: categories[4]._id,
      supplier_id: suppliers[7]._id,
    },
  ]);

  // seed stocks
  const stocks = await Stock.bulkCreate([
    // Laptop (P001) - Stock: 10
    {
      product_id: products[0]._id,
      user_id: adminUser._id,
      batch_number: "B-LAP-001",
      reason: "Purchase",
      type: "in",
      quantity: 12, // Bought 12
      location: "Main Warehouse",
      completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      notes: "Initial purchase",
      balance: 12,
    },
    {
      product_id: products[0]._id,
      user_id: staffUser._id,
      batch_number: "B-LAP-001",
      reason: "Sale",
      type: "out",
      quantity: 2, // Sold 2, Remaining: 10 (Matches Product stock)
      location: "Showroom",
      completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: "Customer sale",
      balance: 10,
    },

    // Desk Chair (P002) - Stock: 20
    {
      product_id: products[1]._id,
      user_id: adminUser._id,
      batch_number: "B-CHR-001",
      reason: "Purchase",
      type: "in",
      quantity: 20,
      location: "Main Warehouse",
      completed_at: new Date(),
      notes: "Initial stock",
      balance: 20,
    },

    // Notebook (P003) - Stock: 100
    {
      product_id: products[2]._id,
      user_id: adminUser._id,
      batch_number: "B-NB-001",
      reason: "Purchase",
      type: "in",
      quantity: 100,
      location: "Main Warehouse",
      completed_at: new Date(),
      notes: "Bulk purchase",
      balance: 100,
    },

    // Monitor (P004) - Stock: 15
    {
      product_id: products[3]._id,
      user_id: adminUser._id,
      batch_number: "B-MON-001",
      reason: "Purchase",
      type: "in",
      quantity: 15,
      location: "Main Warehouse",
      completed_at: new Date(),
      notes: "Initial stock",
      balance: 15,
    },

    // Smartphone (P007) - Stock: 25
    {
      product_id: products[6]._id,
      user_id: adminUser._id,
      batch_number: "B-PHN-001",
      reason: "Purchase",
      type: "in",
      quantity: 30,
      location: "Main Warehouse",
      completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      notes: "New shipment",
      balance: 30,
    },
    {
      product_id: products[6]._id,
      user_id: staffUser._id,
      batch_number: "B-PHN-001",
      reason: "Damage",
      type: "out",
      quantity: 5, // Damaged 5, Remaining: 25
      location: "Main Warehouse",
      completed_at: new Date(),
      notes: "Damaged during transport",
      balance: 25,
    },
  ]);

  // Update Product stock levels based on transactions
  for (const stock of stocks) {
    const product = products.find((p) => p._id === stock.product_id);
    if (product) {
      if (stock.type === "in") {
        product.stock += stock.quantity;
      } else {
        product.stock -= stock.quantity;
      }
    }
  }

  // Save updated product stocks
  for (const product of products) {
    if (product.stock !== 0) {
      // Optimize: only update if changed
      await Product.update(
        { stock: product.stock },
        { where: { _id: product._id } },
      );
    }
  }

  // Seed Order Requests with various statuses
  const orderRequests = [];

  // 1. Pending Order (Customer) - laptops for new office setup
  orderRequests.push(
    await OrderRequest.create({
      quantity: 3,
      status: "pending",
      requested_date: new Date(),
      notes:
        "Requesting 3 units of Dell laptops for new staff onboarding next week.",
      customer_remark: "Please prioritize — training starts Monday.",
      delivery_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      requester_id: customerUser._id,
      supplier_id: suppliers[0]._id, // TechVision Electronics
    }),
  );

  // 2. Pending Order (Staff) - restocking office stationery
  orderRequests.push(
    await OrderRequest.create({
      quantity: 50,
      status: "pending",
      requested_date: new Date(),
      notes:
        "Monthly stationery restock: A4 paper reams, ballpoint pens, sticky notes, and file folders.",
      delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      requester_id: staffUser._id,
      supplier_id: suppliers[1]._id, // Angkor Stationery
    }),
  );

  // 3. Approved Order (Ready for Delivery) - monitors for the design team
  const approvedOrder = await OrderRequest.create({
    quantity: 6,
    status: "approved",
    requested_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    notes:
      "27-inch 4K monitors for the creative design team — 2 units per desk x3 designers.",
    delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    requester_id: staffUser._id,
    supplier_id: suppliers[4]._id, // SmartTech Distribution
    approved_by: adminUser._id,
    approved_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    notified: true,
  });
  orderRequests.push(approvedOrder);

  await ApproveRequest.create({
    order_request_id: approvedOrder._id,
    status: "approved",
    admin_remarks:
      "Budget approved. Coordinate delivery slot with warehouse team before noon.",
    approved_by: adminUser._id,
    approved_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  // 4. Rejected Order - personal item expense
  const rejectedOrder = await OrderRequest.create({
    quantity: 1,
    status: "rejected",
    requested_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    notes:
      "Requesting premium noise-cancelling headphones for personal use during work hours.",
    requester_id: staffUser._id,
    supplier_id: suppliers[4]._id,
    rejection_reason:
      "Item is classified as personal equipment and does not qualify for company procurement.",
    notified: true,
  });
  orderRequests.push(rejectedOrder);

  await ApproveRequest.create({
    order_request_id: rejectedOrder._id,
    status: "rejected",
    rejection_reason:
      "Item is classified as personal equipment and does not qualify for company procurement.",
    admin_remarks:
      "Please submit requests for business-critical equipment only. Refer to procurement policy §3.2.",
    approved_by: adminUser._id,
    approved_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  });

  // 5. Completed Order - ergonomic furniture for office renovation
  const completedOrder = await OrderRequest.create({
    quantity: 10,
    status: "completed",
    requested_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    notes:
      "10 ergonomic desk chairs for the newly renovated open-plan office on floor 2.",
    requester_id: adminUser._id,
    supplier_id: suppliers[3]._id, // Mekong Furniture
    approved_by: adminUser._id,
    approved_date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    notified: true,
    confirmed_by: adminUser._id,
    confirmed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  });
  orderRequests.push(completedOrder);

  await ApproveRequest.create({
    order_request_id: completedOrder._id,
    status: "approved",
    admin_remarks:
      "Approved as part of the Q1 office renovation budget allocation.",
    approved_by: adminUser._id,
    approved_date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
  });

  // 6. Completed Order - promotional materials for Cambodia Trade Fair
  const completedOrder2 = await OrderRequest.create({
    quantity: 200,
    status: "completed",
    requested_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    notes:
      "Branded T-shirts, pens, and notebooks for the annual Cambodia Trade Fair booth.",
    requester_id: staffUser._id,
    supplier_id: suppliers[2]._id, // Cambodian Business Hub
    approved_by: adminUser._id,
    approved_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    notified: true,
    confirmed_by: staffUser._id,
    confirmed_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
  });
  orderRequests.push(completedOrder2);

  await ApproveRequest.create({
    order_request_id: completedOrder2._id,
    status: "approved",
    admin_remarks:
      "Marketing event approved. Ensure branded items are quality-checked prior to the event.",
    approved_by: adminUser._id,
    approved_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  });

  // Seed OrderRequestItems
  for (const order of orderRequests) {
    // Add 1-3 random items per order
    const numItems = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numItems; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      try {
        await OrderRequestItem.create({
          order_request_id: order._id,
          product_id: product._id,
          quantity: Math.floor(Math.random() * 10) + 1,
          unit_price: product.price,
          subtotal: product.price * (Math.floor(Math.random() * 10) + 1),
        });
      } catch (e) {
        // Ignore duplicate key errors if we pick the same product
      }
    }
  }

  // Seed Sales
  const sales = [];
  for (let i = 0; i < 50; i++) {
    const saleDate = new Date(
      Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000,
    );
    const sale = await Sale.create({
      customer_id: Math.random() > 0.5 ? customerUser._id : null, // Some walk-in, some registered
      payment_method: ["Cash", "Credit Card", "Bank Transfer"][
        Math.floor(Math.random() * 3)
      ],
      status: "completed",
      completed_at: saleDate,
      createdAt: saleDate,
      updatedAt: saleDate,
    });
    sales.push(sale);

    // Add items to sale
    const numItems = Math.floor(Math.random() * 5) + 1;
    let totalAmount = 0;
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 5) + 1;
      const subtotal = product.price * qty;
      await SaleItem.create({
        sale_id: sale._id,
        product_id: product._id,
        quantity: qty,
        price: product.price,
        cost_price: product.price * 0.7, // 30% margin
        discount: 0,
        subtotal: subtotal,
      });
      totalAmount += subtotal;
    }
    await sale.update({
      total_amount: totalAmount,
      grand_total: totalAmount,
      payment_status: "paid",
    });
  }

  // Seed Expenses with realistic descriptions
  const expenseData = [
    {
      description: "Monthly warehouse rent — Phnom Penh main facility",
      amount: 3200.0,
      category: "Rent",
    },
    {
      description: "Electricity bill — EDC Invoice #2025-0612 (June)",
      amount: 420.5,
      category: "Utilities",
    },
    {
      description:
        "Monthly salary payout — Warehouse & logistics staff (8 employees)",
      amount: 8500.0,
      category: "Salary",
    },
    {
      description: "Bulk restock of A4 copy paper — 50 reams @ $4.20 each",
      amount: 210.0,
      category: "Inventory",
    },
    {
      description: "Facebook & Google Ads — June product promotion campaign",
      amount: 650.0,
      category: "Marketing",
    },
    {
      description: "Delivery van fuel reimbursement — May routes",
      amount: 185.0,
      category: "Transport",
    },
    {
      description: "Water & internet utility bill — Office (May)",
      amount: 96.0,
      category: "Utilities",
    },
    {
      description: "Office cleaning service contract — Monthly fee",
      amount: 120.0,
      category: "Other",
    },
    {
      description: "Staff overtime allowance — Inventory audit week",
      amount: 340.0,
      category: "Salary",
    },
    {
      description: "Inkjet printer cartridges x6 — HP 664 Black & Color",
      amount: 78.0,
      category: "Inventory",
    },
    {
      description: "Annual warehouse rent renewal — Siem Reap secondary unit",
      amount: 18000.0,
      category: "Rent",
    },
    {
      description: "Annual fire insurance premium — Warehouse assets",
      amount: 960.0,
      category: "Other",
    },
    {
      description: "Tarpaulin & cardboard packaging — Q2 restock batch",
      amount: 310.0,
      category: "Inventory",
    },
    {
      description: "Road toll & transport fee — Delivery run to Siem Reap",
      amount: 55.0,
      category: "Transport",
    },
    {
      description: "Instagram influencer campaign — New product launch",
      amount: 1200.0,
      category: "Marketing",
    },
    {
      description: "Motodop delivery fees — Local Phnom Penh orders (June)",
      amount: 140.0,
      category: "Transport",
    },
    {
      description: "Laptop battery replacement — Dell Latitude (IT dept)",
      amount: 89.0,
      category: "Other",
    },
    {
      description: "Staff health insurance premium — Q2 2025",
      amount: 2400.0,
      category: "Salary",
    },
    {
      description: "Office phone & landline subscription — June",
      amount: 48.0,
      category: "Utilities",
    },
    {
      description: "Accounting software subscription — QuickBooks (Annual)",
      amount: 540.0,
      category: "Other",
    },
    {
      description: "Plastic storage bins x20 for stockroom reorganization",
      amount: 160.0,
      category: "Inventory",
    },
    {
      description: "Newspaper advertisement — Khmer Times (Sunday edition)",
      amount: 220.0,
      category: "Marketing",
    },
    {
      description: "Generator fuel for power backup — 3-day network outage",
      amount: 115.0,
      category: "Utilities",
    },
    {
      description: "Business registration renewal — Ministry of Commerce",
      amount: 350.0,
      category: "Other",
    },
    {
      description: "Security guard service — Night shift, May 2025",
      amount: 480.0,
      category: "Salary",
    },
    {
      description: "Postal & courier charges — Document shipments (June)",
      amount: 62.0,
      category: "Transport",
    },
    {
      description: "Promotional flyer printing — 5000 units for trade fair",
      amount: 390.0,
      category: "Marketing",
    },
    {
      description:
        "Air conditioning maintenance & coolant refill — Office unit",
      amount: 145.0,
      category: "Other",
    },
    {
      description: "Part-time bookkeeper fee — End of quarter reconciliation",
      amount: 200.0,
      category: "Salary",
    },
    {
      description: "Barcode scanner replacement — Warehouse receiving desk",
      amount: 135.0,
      category: "Other",
    },
  ];
  for (let i = 0; i < expenseData.length; i++) {
    const daysAgo = Math.floor(i * 3) + Math.floor(Math.random() * 3);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await Expense.create({
      description: expenseData[i].description,
      amount: expenseData[i].amount,
      category: expenseData[i].category,
      date: date,
      user_id: i % 3 === 0 ? staffUser._id : adminUser._id,
      status: "active",
      createdAt: date,
    });
  }

  // Notifications
  await Promise.all([
    Notification.create({
      user_id: adminUser._id,
      type: "order_request",
      message:
        "Rithy Prak submitted a new purchase order request for 3x laptops from TechVision Electronics.",
      entity_type: "OrderRequest",
      entity_id: orderRequests[0]._id,
      read: false,
    }),
    Notification.create({
      user_id: staffUser._id,
      type: "approve_request",
      message:
        "Your order request for 6x monitors has been approved by Sokha Chan. Delivery expected in 2 days.",
      entity_type: "OrderRequest",
      entity_id: approvedOrder._id,
      read: false,
    }),
    Notification.create({
      user_id: staffUser._id,
      type: "order_request",
      message:
        "Your stationery restock request is pending review. Expected response within 24 hours.",
      entity_type: "OrderRequest",
      entity_id: orderRequests[1]._id,
      read: true,
    }),
    Notification.create({
      user_id: staffUser._id,
      type: "approve_request",
      message:
        "Your headphones request was rejected — personal equipment not covered by procurement policy §3.2.",
      entity_type: "OrderRequest",
      entity_id: rejectedOrder._id,
      read: false,
    }),
  ]);

  // Activity Logs
  await Promise.all([
    ActivityLog.create({
      user_id: customerUser._id,
      action: "create_order_request",
      details:
        "Rithy Prak submitted purchase order request for 3x laptops (TechVision Electronics)",
      entity_type: "OrderRequest",
      entity_id: orderRequests[0]._id,
    }),
    ActivityLog.create({
      user_id: adminUser._id,
      action: "approve_order_request",
      details:
        "Sokha Chan approved order request for 6x monitors for the design team",
      entity_type: "OrderRequest",
      entity_id: approvedOrder._id,
    }),
    ActivityLog.create({
      user_id: adminUser._id,
      action: "reject_order_request",
      details:
        "Sokha Chan rejected headphones request from Sreypich Mao — policy §3.2 violation",
      entity_type: "OrderRequest",
      entity_id: rejectedOrder._id,
    }),
    ActivityLog.create({
      user_id: adminUser._id,
      action: "confirm_delivery",
      details:
        "Sokha Chan confirmed delivery of 10x ergonomic chairs from Mekong Furniture",
      entity_type: "OrderRequest",
      entity_id: completedOrder._id,
    }),
    ActivityLog.create({
      user_id: staffUser._id,
      action: "confirm_delivery",
      details:
        "Sreypich Mao confirmed receipt of promotional materials for Cambodia Trade Fair",
      entity_type: "OrderRequest",
      entity_id: completedOrder2._id,
    }),
    ActivityLog.create({
      user_id: staffUser._id,
      action: "create_sale",
      details: "Sreypich Mao recorded a new point-of-sale transaction",
      entity_type: "Sale",
      entity_id: null,
    }),
  ]);

  console.log("Database seeded!");
  process.exit();
}

seed();
