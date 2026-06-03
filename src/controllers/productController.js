const productService = require("../services/productService");
const { validationResult } = require("express-validator");
const csv = require("csv-parser");
const { Readable } = require("stream");

exports.getAll = async (req, res) => {
  try {
    const result = await productService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      search: req.query.search,
      category: req.query.category,
      supplier: req.query.supplier,
      status: req.query.status
    });
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const product = await productService.getOne(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    const product = await productService.create(req.body, req.user?._id);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    res.json({ success: true, data: product });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await productService.remove(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.importProducts = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No CSV file uploaded." });
  }

  const results = [];
  const stream = Readable.from(req.file.buffer);

  stream
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        let importedCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const [index, row] of results.entries()) {
          try {
            const productData = {
              code: row.code || undefined,
              name: row.name,
              price: Number(row.price) || 0,
              cost_price: Number(row.cost_price) || 0,
              min_stock_level: Number(row.min_stock_level) || 10,
              description: row.description || "",
              status: row.status || "active"
            };

            if (!productData.name) {
              throw new Error("Product name is required.");
            }

            await productService.create(productData, req.user?._id);
            importedCount++;
          } catch (err) {
            errorCount++;
            errors.push(`Row ${index + 2}: ${err.message}`);
          }
        }

        res.json({
          success: true,
          message: `Import complete. Successfully imported: ${importedCount}, Failed: ${errorCount}.`,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    })
    .on('error', (err) => {
      res.status(500).json({ success: false, error: "Failed to parse CSV: " + err.message });
    });
};
