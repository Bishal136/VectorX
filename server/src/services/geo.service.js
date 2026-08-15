// vectorx-backend/src/services/geo.service.js

// Validate coordinates
const validateCoordinates = (longitude, latitude) => {
  if (longitude === undefined || latitude === undefined) {
    return false;
  }
  
  const lng = parseFloat(longitude);
  const lat = parseFloat(latitude);
  
  if (isNaN(lng) || isNaN(lat)) {
    return false;
  }
  
  // Longitude must be between -180 and 180
  // Latitude must be between -90 and 90
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
};

// Calculate distance between two coordinates (in km)
const calculateDistance = (coords1, coords2) => {
  // Validate coordinates
  if (!coords1 || !coords2 || 
      !validateCoordinates(coords1[0], coords1[1]) || 
      !validateCoordinates(coords2[0], coords2[1])) {
    return null;
  }

  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;
  
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

// Build $geoNear aggregation stage
const buildGeoNearStage = (longitude, latitude, distanceField = 'distance') => {
  if (!validateCoordinates(longitude, latitude)) {
    return null;
  }

  return {
    $geoNear: {
      near: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      distanceField: distanceField,
      spherical: true,
      key: 'location'
    }
  };
};

// Get products sorted by distance
const getSortedProducts = async (Product, { lat, lng, filters = {}, page = 1, limit = 20 }) => {
  const hasValidCoords = validateCoordinates(lng, lat);
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let result;
  let fallbackUsed = false;

  if (hasValidCoords) {
    // Use $geoNear with pre-filter via `query` option
    const geoNearStage = {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        distanceField: 'distance',
        spherical: true,
        key: 'location',
        query: filters  // Pre-filter before distance calculation
      }
    };

    const pipeline = [
      geoNearStage,
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    const countPipeline = [
      geoNearStage,
      { $count: 'total' }
    ];

    const [products, countResult] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate(countPipeline)
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    result = {
      products,
      total,
      sortedBy: 'distance',
      fallbackUsed: false
    };
  } else {
    // Fallback: sort by rating/popularity
    const [products, total] = await Promise.all([
      Product.find(filters)
        .sort({ 'rating.average': -1, 'rating.count': -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(filters)
    ]);

    result = {
      products,
      total,
      sortedBy: 'popularity',
      fallbackUsed: true
    };
  }

  return result;
};

module.exports = {
  validateCoordinates,
  calculateDistance,
  buildGeoNearStage,
  getSortedProducts
};