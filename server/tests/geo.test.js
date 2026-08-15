
// run file  npx jest tests/geo.test.js
// npx jest tests/geo.test.js --watch
// tests/geo.test.js
const {
  validateCoordinates,
  calculateDistance,
  buildGeoNearStage,
  getSortedProducts
} = require('../src/services/geo.service');

// Mock Product model
const mockProduct = {
  aggregate: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
};

describe('Geo Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----- validateCoordinates -----
  describe('validateCoordinates', () => {
    test('should return true for valid coordinates', () => {
      expect(validateCoordinates(90.4125, 23.8103)).toBe(true);
      expect(validateCoordinates(-180, 90)).toBe(true);
      expect(validateCoordinates(180, -90)).toBe(true);
      expect(validateCoordinates(0, 0)).toBe(true);
    });

    test('should return false for invalid coordinate ranges', () => {
      expect(validateCoordinates(181, 0)).toBe(false);
      expect(validateCoordinates(-181, 0)).toBe(false);
      expect(validateCoordinates(0, 91)).toBe(false);
      expect(validateCoordinates(0, -91)).toBe(false);
    });

    test('should return false for non-numeric values', () => {
      expect(validateCoordinates('abc', 0)).toBe(false);
      expect(validateCoordinates(90, 'xyz')).toBe(false);
      expect(validateCoordinates(null, 0)).toBe(false);
      expect(validateCoordinates(undefined, 0)).toBe(false);
    });

    test('should return false for missing arguments', () => {
      expect(validateCoordinates(90)).toBe(false);
      expect(validateCoordinates()).toBe(false);
    });
  });

  // ----- calculateDistance -----
  describe('calculateDistance', () => {
    test('should calculate distance correctly for valid coordinates', () => {
      // Dhaka (90.4125, 23.8103) to Kolkata (88.3639, 22.5726) ~ 250 km
      const dist = calculateDistance([90.4125, 23.8103], [88.3639, 22.5726]);
      expect(dist).toBeCloseTo(250, -1); // within ~100 km, approximate
    });

    test('should return 0 for same coordinates', () => {
      const dist = calculateDistance([90.4125, 23.8103], [90.4125, 23.8103]);
      expect(dist).toBe(0);
    });

    test('should return null for invalid coordinates', () => {
      expect(calculateDistance([200, 0], [0, 0])).toBeNull();
      expect(calculateDistance([90, 0], [0, 200])).toBeNull();
      expect(calculateDistance(null, [0, 0])).toBeNull();
      expect(calculateDistance([90, 0], null)).toBeNull();
    });
  });

  // ----- buildGeoNearStage -----
  describe('buildGeoNearStage', () => {
    test('should return a valid $geoNear stage for valid coords', () => {
      const stage = buildGeoNearStage(90.4125, 23.8103, 'distanceKm');
      expect(stage).toEqual({
        $geoNear: {
          near: { type: 'Point', coordinates: [90.4125, 23.8103] },
          distanceField: 'distanceKm',
          spherical: true,
          key: 'location'
        }
      });
    });

    test('should use default distanceField if not provided', () => {
      const stage = buildGeoNearStage(90.4125, 23.8103);
      expect(stage.$geoNear.distanceField).toBe('distance');
    });

    test('should return null for invalid coords', () => {
      expect(buildGeoNearStage(200, 0)).toBeNull();
      expect(buildGeoNearStage(null, 0)).toBeNull();
    });
  });

  // ----- getSortedProducts -----
  describe('getSortedProducts', () => {
    const mockProducts = [
      { _id: '1', name: 'Product A', rating: { average: 4.5, count: 100 } },
      { _id: '2', name: 'Product B', rating: { average: 4.0, count: 50 } }
    ];

    test('should use $geoNear when valid coordinates are provided', async () => {
      const filters = { category: 'electronics' };
      mockProduct.aggregate
        .mockResolvedValueOnce(mockProducts) // first call for products
        .mockResolvedValueOnce([{ total: 2 }]); // second call for count

      const result = await getSortedProducts(mockProduct, {
        lat: 23.8103,
        lng: 90.4125,
        filters,
        page: 1,
        limit: 20
      });

      expect(mockProduct.aggregate).toHaveBeenCalledTimes(2);
      // Verify the geoNear stage includes filters in query
      expect(mockProduct.aggregate).toHaveBeenCalledWith([
        expect.objectContaining({
          $geoNear: expect.objectContaining({
            query: filters
          })
        }),
        { $skip: 0 },
        { $limit: 20 }
      ]);
      expect(result).toEqual({
        products: mockProducts,
        total: 2,
        sortedBy: 'distance',
        fallbackUsed: false
      });
    });

    test('should use fallback (popularity) when coordinates are invalid', async () => {
      const filters = { category: 'electronics' };
      mockProduct.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockProducts)
          })
        })
      });
      mockProduct.countDocuments.mockResolvedValue(2);

      const result = await getSortedProducts(mockProduct, {
        lat: null,
        lng: null,
        filters,
        page: 1,
        limit: 20
      });

      expect(mockProduct.find).toHaveBeenCalledWith(filters);
      expect(mockProduct.countDocuments).toHaveBeenCalledWith(filters);
      expect(result).toEqual({
        products: mockProducts,
        total: 2,
        sortedBy: 'popularity',
        fallbackUsed: true
      });
    });

    test('should handle pagination correctly with valid coords', async () => {
      mockProduct.aggregate
        .mockResolvedValueOnce(mockProducts)
        .mockResolvedValueOnce([{ total: 5 }]);

      await getSortedProducts(mockProduct, {
        lat: 23.8103,
        lng: 90.4125,
        page: 2,
        limit: 10
      });

      expect(mockProduct.aggregate).toHaveBeenCalledWith([
        expect.any(Object),
        { $skip: 10 },
        { $limit: 10 }
      ]);
    });

    test('should handle empty results', async () => {
      mockProduct.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      const result = await getSortedProducts(mockProduct, {
        lat: 23.8103,
        lng: 90.4125,
        page: 1,
        limit: 20
      });

      expect(result).toEqual({
        products: [],
        total: 0,
        sortedBy: 'distance',
        fallbackUsed: false
      });
    });
  });
});