const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Load env vars
dotenv.config();

const passport = require("./config/passport")

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const sellerRoutes = require('./routes/seller.routes');
const productRouter =require("./routes/product.routes");
const adminRouter = require('./routes/admin.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');



// Import middleware
const errorHandler = require('./middlewares/error.middleware');

// Initialize app
const app = express();

// Trust reverse proxy (Render, Railway, Heroku, Nginx, AWS, etc.) for HTTPS cookies and secure headers
app.set('trust proxy', 1);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session (required for passport)
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'vectorx-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL ,
  //  origin: "*",
  credentials: true
}));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sellers', sellerRoutes);
app.use("/api/admin",adminRouter);
app.use('/api/products',productRouter);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Error handler (should be last)
app.use(errorHandler);

module.exports = app;