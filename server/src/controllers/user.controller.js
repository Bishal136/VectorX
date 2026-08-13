// vectorx-backend/src/controllers/user.controller.js
const User = require('../models/User.model');
const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { validateCoordinates } = require('../services/geo.service');

// ==================== Profile Management ====================

// @desc    Get logged-in user's profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password -refreshTokens')
    .populate('wishlist', 'name price images rating');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: user
  });
});

// @desc    Update logged-in user's profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, addresses } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Update fields if provided
  if (name) user.name = name;
  if (email && email !== user.email) {
    // Check if email is already taken
    const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
    if (existingUser) {
      throw new ApiError(400, 'Email already in use');
    }
    user.email = email;
    // Mark as unverified until OTP verification
    user.isVerified = false;
  }
  if (phone && phone !== user.phone) {
    const existingUser = await User.findOne({ phone, _id: { $ne: user._id } });
    if (existingUser) {
      throw new ApiError(400, 'Phone number already in use');
    }
    user.phone = phone;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      location: user.location,
      addresses: user.addresses
    }
  });
});

// ==================== Location Management ====================

// @desc    Update user's location
// @route   PUT /api/users/location
// @access  Private
const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng, pincode, city, address } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Validate coordinates if provided
  if (lat !== undefined && lng !== undefined) {
    if (!validateCoordinates(lng, lat)) {
      throw new ApiError(400, 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90');
    }
    
    user.location.coordinates = [parseFloat(lng), parseFloat(lat)];
  }

  // Update pincode/city if provided
  if (pincode) user.pincode = pincode;
  if (city) user.city = city;
  if (address) user.address = address;

  await user.save();

  res.json({
    success: true,
    message: 'Location updated successfully',
    data: {
      location: user.location,
      pincode: user.pincode,
      city: user.city
    }
  });
});

// ==================== Address Management ====================

// @desc    Add a new address
// @route   POST /api/users/addresses
// @access  Private
const addAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, city, state, pincode, coordinates, isDefault } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Validate required fields
  if (!label || !line1 || !city || !pincode) {
    throw new ApiError(400, 'Label, line1, city, and pincode are required');
  }

  // Validate coordinates if provided
  if (coordinates) {
    if (!validateCoordinates(coordinates[0], coordinates[1])) {
      throw new ApiError(400, 'Invalid coordinates');
    }
  }

  // If this is the first address or isDefault is true, make it the default
  let shouldBeDefault = isDefault || user.addresses.length === 0;

  // Create new address
  const newAddress = {
    label,
    line1,
    line2: line2 || '',
    city,
    state: state || '',
    pincode,
    coordinates: coordinates || null,
    isDefault: shouldBeDefault
  };

  // If this address is default, unset others
  if (shouldBeDefault) {
    user.addresses.forEach(addr => addr.isDefault = false);
  }

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    data: user.addresses
  });
});

// @desc    Update an address
// @route   PUT /api/users/addresses/:addressId
// @access  Private
const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { label, line1, line2, city, state, pincode, coordinates } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  // Update fields if provided
  if (label) address.label = label;
  if (line1) address.line1 = line1;
  if (line2 !== undefined) address.line2 = line2;
  if (city) address.city = city;
  if (state !== undefined) address.state = state;
  if (pincode) address.pincode = pincode;
  if (coordinates) {
    if (!validateCoordinates(coordinates[0], coordinates[1])) {
      throw new ApiError(400, 'Invalid coordinates');
    }
    address.coordinates = coordinates;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Address updated successfully',
    data: user.addresses
  });
});

// @desc    Remove an address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
const removeAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  // If removing the default address, set another as default if available
  if (address.isDefault && user.addresses.length > 1) {
    const remainingAddresses = user.addresses.filter(a => a._id.toString() !== addressId);
    if (remainingAddresses.length > 0) {
      remainingAddresses[0].isDefault = true;
    }
  }

  user.addresses.pull(addressId);
  await user.save();

  res.json({
    success: true,
    message: 'Address removed successfully',
    data: user.addresses
  });
});

// @desc    Set an address as default
// @route   PUT /api/users/addresses/:addressId/default
// @access  Private
const setDefaultAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  // Unset all other addresses
  user.addresses.forEach(addr => addr.isDefault = false);
  address.isDefault = true;

  await user.save();

  res.json({
    success: true,
    message: 'Default address set successfully',
    data: user.addresses
  });
});

// ==================== Order Management ====================

// @desc    Get user's orders
// @route   GET /api/users/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build query
  const query = { userId: req.user.id };
  if (status) {
    query.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('items.productId', 'name price images')
      .populate('sellerId', 'shopName location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

// @desc    Get order details
// @route   GET /api/users/orders/:orderId
// @access  Private
const getOrderDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({
    _id: orderId,
    userId: req.user.id
  })
    .populate('items.productId', 'name price images description')
    .populate('sellerId', 'shopName location shopAddress')
    .populate('userId', 'name email phone');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.json({
    success: true,
    data: order
  });
});

// ==================== Wishlist Management ====================

// @desc    Get user's wishlist
// @route   GET /api/users/wishlist
// @access  Private
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('wishlist', 'name price images rating description location sellerId');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: user.wishlist
  });
});

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist/:productId
// @access  Private
const addWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check if already in wishlist
  if (user.wishlist.includes(productId)) {
    return res.status(400).json({
      success: false,
      message: 'Product already in wishlist'
    });
  }

  user.wishlist.push(productId);
  await user.save();

  // Populate the wishlist for response
  await user.populate('wishlist', 'name price images rating description');

  res.json({
    success: true,
    message: 'Product added to wishlist',
    data: user.wishlist
  });
});

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
const removeWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const index = user.wishlist.indexOf(productId);
  if (index === -1) {
    throw new ApiError(404, 'Product not in wishlist');
  }

  user.wishlist.splice(index, 1);
  await user.save();

  // Populate the wishlist for response
  await user.populate('wishlist', 'name price images rating description');

  res.json({
    success: true,
    message: 'Product removed from wishlist',
    data: user.wishlist
  });
});

// ==================== Cart Management ====================

// @desc    Get user's cart
// @route   GET /api/users/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user.id })
    .populate('items.productId', 'name price images stock location');

  if (!cart) {
    cart = await Cart.create({
      userId: req.user.id,
      items: [],
      total: 0
    });
  }

  res.json({
    success: true,
    data: cart
  });
});

// @desc    Add item to cart
// @route   POST /api/users/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    throw new ApiError(400, 'Product ID is required');
  }

  // Check product exists and is active
  const product = await Product.findOne({
    _id: productId,
    isActive: true
  });

  if (!product) {
    throw new ApiError(404, 'Product not found or inactive');
  }

  // Check stock
  if (product.stock < quantity) {
    throw new ApiError(400, `Only ${product.stock} items available`);
  }

  // Get or create cart
  let cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) {
    cart = await Cart.create({
      userId: req.user.id,
      items: [],
      total: 0
    });
  }

  // Check if product already in cart
  const existingItem = cart.items.find(item => 
    item.productId.toString() === productId
  );

  if (existingItem) {
    // Update quantity
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > product.stock) {
      throw new ApiError(400, `Only ${product.stock} items available`);
    }
    existingItem.quantity = newQuantity;
    existingItem.price = product.price; // Update price in case it changed
  } else {
    // Add new item
    cart.items.push({
      productId,
      quantity,
      price: product.price,
      sellerId: product.sellerId
    });
  }

  // Recalculate total
  cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  await cart.save();

  await cart.populate('items.productId', 'name price images stock');

  res.json({
    success: true,
    message: 'Item added to cart',
    data: cart
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/users/cart/:itemId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity < 0) {
    throw new ApiError(400, 'Valid quantity is required');
  }

  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const item = cart.items.id(itemId);
  if (!item) {
    throw new ApiError(404, 'Item not found in cart');
  }

  if (quantity === 0) {
    // Remove item if quantity is 0
    cart.items.pull(itemId);
  } else {
    // Check stock
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      throw new ApiError(404, 'Product no longer available');
    }
    if (product.stock < quantity) {
      throw new ApiError(400, `Only ${product.stock} items available`);
    }
    item.quantity = quantity;
  }

  // Recalculate total
  cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  await cart.save();

  await cart.populate('items.productId', 'name price images stock');

  res.json({
    success: true,
    message: 'Cart updated',
    data: cart
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/users/cart/:itemId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const item = cart.items.id(itemId);
  if (!item) {
    throw new ApiError(404, 'Item not found in cart');
  }

  cart.items.pull(itemId);
  
  // Recalculate total
  cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  await cart.save();

  await cart.populate('items.productId', 'name price images stock');

  res.json({
    success: true,
    message: 'Item removed from cart',
    data: cart
  });
});

// @desc    Clear cart
// @route   DELETE /api/users/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id });
  if (cart) {
    cart.items = [];
    cart.total = 0;
    await cart.save();
  }

  res.json({
    success: true,
    message: 'Cart cleared',
    data: { items: [], total: 0 }
  });
});

module.exports = {
  // Profile
  getProfile,
  updateProfile,
  
  // Location
  updateLocation,
  
  // Addresses
  addAddress,
  updateAddress,
  removeAddress,
  setDefaultAddress,
  
  // Orders
  getOrders,
  getOrderDetails,
  
  // Wishlist
  getWishlist,
  addWishlist,
  removeWishlist,
  
  // Cart
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};