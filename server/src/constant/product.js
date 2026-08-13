// vectorx-backend/src/constants/product.js
const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending', // Admin approval pending
  REJECTED: 'rejected'
};

const PRODUCT_SORT = {
  NEWEST: 'newest',
  PRICE_LOW_TO_HIGH: 'price_low_to_high',
  PRICE_HIGH_TO_LOW: 'price_high_to_low',
  POPULARITY: 'popularity',
  RATING: 'rating',
  DISTANCE: 'distance'
};

const HANDLING_TIMES = {
  ONE_TO_TWO_DAYS: '1-2 days',
  TWO_TO_THREE_DAYS: '2-3 days',
  THREE_TO_FIVE_DAYS: '3-5 days',
  FIVE_TO_SEVEN_DAYS: '5-7 days',
  SEVEN_TO_FOURTEEN_DAYS: '7-14 days'
};

const RETURN_POLICIES = {
  SEVEN_DAYS: '7 days',
  FIFTEEN_DAYS: '15 days',
  THIRTY_DAYS: '30 days',
  NO_RETURNS: 'No returns'
};

const PRODUCT_LIMITS = {
  MAX_IMAGES: 10,
  MAX_REVIEW_IMAGES: 5,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_TAGS: 10
};

module.exports = {
  PRODUCT_STATUS,
  PRODUCT_SORT,
  HANDLING_TIMES,
  RETURN_POLICIES,
  PRODUCT_LIMITS
};