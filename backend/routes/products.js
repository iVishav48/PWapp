const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/products - Get all products with pagination, search, and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured,
      inStock,
    } = req.query;

    const query = { isActive: true };
    
    // Category filter
    if (category) {
      const categoryDoc = await Category.findOne({ 
        $or: [
          { slug: category },
          { _id: category }
        ]
      });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      }
    }

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.$and = query.$and || [];
      if (minPrice) {
        query.$and.push({ finalPrice: { $gte: parseFloat(minPrice) } });
      }
      if (maxPrice) {
        query.$and.push({ finalPrice: { $lte: parseFloat(maxPrice) } });
      }
    }

    // Featured filter
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Stock filter
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Sort options
    const sortOptions = {};
    const validSortFields = ['name', 'price', 'createdAt', 'averageRating', 'stock'];
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalCount,
        itemsPerPage: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      meta: {
        search: search || null,
        category: category || null,
        filters: {
          minPrice: minPrice || null,
          maxPrice: maxPrice || null,
          featured: featured === 'true',
          inStock: inStock === 'true',
        },
        sort: {
          by: sortBy,
          order: sortOrder,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/products/:id - Get single product by ID or slug
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug
    let product = await Product.findOne({
      $or: [
        { _id: id },
        { slug: id }
      ],
      isActive: true
    }).populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ 
      message: 'Error fetching product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/products - Create new product (admin only)
router.post('/', 
  requireAdmin,
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be 1-2000 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').isMongoId().withMessage('Valid category ID is required'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  ],
  async (req, res) => {
    try {
      // Check if user is admin (you'll need to implement role-based auth)
      // For now, we'll skip admin check but you should add it
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const productData = req.body;
      
      // Validate category exists
      const category = await Category.findById(productData.category);
      if (!category) {
        return res.status(400).json({ message: 'Category not found' });
      }

      const product = new Product(productData);
      await product.save();

      res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ 
        message: 'Error creating product',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// PUT /api/products/:id - Update product (admin only)
router.put('/:id',
  requireAdmin,
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be 1-2000 characters'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('category', 'name slug');

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ 
        message: 'Error updating product',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      message: 'Error deleting product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/products/search/suggestions - Get search suggestions
router.get('/search/suggestions', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await Product.find({
      $text: { $search: q },
      isActive: true
    })
    .select('name slug')
    .limit(parseInt(limit))
    .lean();

    res.json({ suggestions });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    res.status(500).json({ 
      message: 'Error fetching search suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/products/validate-stock - Validate stock for multiple products
router.post('/validate-stock', async (req, res) => {
  try {
    const { productIds } = req.body;
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'Product IDs array is required' });
    }

    // Find all products and return their stock levels
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true
    }).select('_id stock name');

    // Create a stock data object with product ID as key
    const stockData = {};
    products.forEach(product => {
      stockData[product._id.toString()] = {
        stock: product.stock,
        name: product.name
      };
    });

    // Add missing products with 0 stock
    productIds.forEach(id => {
      if (!stockData[id]) {
        stockData[id] = {
          stock: 0,
          name: 'Product not found'
        };
      }
    });

    res.json(stockData);
  } catch (error) {
    console.error('Error validating stock:', error);
    res.status(500).json({ 
      message: 'Error validating stock',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;