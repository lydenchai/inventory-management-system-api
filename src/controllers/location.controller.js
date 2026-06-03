const { Location } = require('../models');

// Create a new location
exports.createLocation = async (req, res) => {
  try {
    const { name, address, status } = req.body;
    const location = new Location({ name, address, status });
    await location.save();
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Location already exists' });
    }
    res.status(500).json({ success: false, error: 'Error creating location', details: error.message });
  }
};

// Get all locations
exports.getLocations = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit === 0) limit = 10;
    const skip = limit === -1 ? 0 : (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { address: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    let dbQuery = Location.find(query).sort({ createdAt: -1 });
    if (limit !== -1) {
      dbQuery = dbQuery.skip(skip).limit(limit);
    }
    const locations = await dbQuery;
      
    const total = await Location.countDocuments(query);

    res.status(200).json({
      success: true,
      data: locations,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error fetching locations', details: error.message });
  }
};

// Update a location
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, status } = req.body;
    const location = await Location.findByIdAndUpdate(
      id,
      { name, address, status },
      { new: true, runValidators: true }
    );
    if (!location) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }
    res.status(200).json({ success: true, data: location });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Location already exists' });
    }
    res.status(500).json({ success: false, error: 'Error updating location', details: error.message });
  }
};

// Delete a location
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await Location.findByIdAndDelete(id);
    if (!location) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }
    res.status(200).json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error deleting location', details: error.message });
  }
};
