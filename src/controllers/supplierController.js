const supplierService = require("../services/supplierService");
const { validationResult } = require("express-validator");
const csv = require("csv-parser");
const { Readable } = require("stream");

exports.getAll = async (req, res) => {
  try {
    const result = await supplierService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      search: req.query.search,
      status: req.query.status,
      location: req.query.location
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
    const supplier = await supplierService.getOne(req.params.id);
    res.json({ success: true, data: supplier });
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
    const supplier = await supplierService.create(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const supplier = await supplierService.update(req.params.id, req.body);
    res.json({ success: true, data: supplier });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await supplierService.remove(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    if (err.message.includes("Cannot delete")) {
      return res.status(409).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.importSuppliers = async (req, res) => {
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
            const supplierData = {
              company_name: row.company_name,
              contact_person: row.contact_person,
              email: row.email,
              phone: row.phone,
              address: row.address || "",
              status: row.status || "active"
            };

            if (!supplierData.company_name) {
              throw new Error("Company name is required.");
            }

            await supplierService.create(supplierData);
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
