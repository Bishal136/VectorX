// vectorx-backend/src/models/Category.model.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    url: String,
    publicId: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  // Metadata for SEO and display
  seo: {
    title: String,
    description: String,
    keywords: [String]
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ parent: 1, isActive: 1 });
categorySchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Method to get full category path
categorySchema.methods.getPath = async function() {
  const path = [this.name];
  let current = this;
  
  while (current.parent) {
    current = await this.constructor.findById(current.parent);
    if (current) {
      path.unshift(current.name);
    }
  }
  
  return path;
};

// Static method to get category tree
categorySchema.statics.getTree = async function() {
  const categories = await this.find({ isActive: true }).sort({ sortOrder: 1 });
  const map = new Map();
  const roots = [];
  
  categories.forEach(cat => {
    map.set(cat._id.toString(), { ...cat.toObject(), children: [] });
  });
  
  categories.forEach(cat => {
    const node = map.get(cat._id.toString());
    if (cat.parent && map.has(cat.parent.toString())) {
      map.get(cat.parent.toString()).children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
};

module.exports = mongoose.model('Category', categorySchema);