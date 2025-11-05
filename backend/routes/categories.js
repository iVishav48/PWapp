const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/categories - Get all categories
router.get('/', async (req, res) => {
  try {
    const { parent = null, includeInactive = false } = req.query;
    
    const query = {};
    if (!includeInactive || includeInactive === 'false') {
      query.isActive = true;
    }
    
    if (parent !== null) {
      query.parentCategory = parent === 'null' ? null : parent;
    }

    const categories = await Category.find(query)
      .populate('parentCategory', 'name slug')
      .populate('subcategories', 'name slug description image')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/categories/:id - Get single category by ID or slug
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug
    let category = await Category.findOne({
      $or: [
        { _id: id },
        { slug: id }
      ],
      isActive: true
    }).populate('parentCategory', 'name slug');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Get subcategories
    const subcategories = await Category.find({ 
      parentCategory: category._id, 
      isActive: true 
    }).select('name slug description image').lean();

    res.json({
      ...category.toObject(),
      subcategories,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ 
      message: 'Error fetching category',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/categories/:id/products - Get products in category
router.get('/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      featured,
      inStock,
    } = req.query;

    // Find category by ID or slug
    const category = await Category.findOne({
      $or: [
        { _id: id },
        { slug: id }
      ],
      isActive: true
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Get all subcategory IDs (including the category itself)
    const subcategoryIds = await Category.find({
      $or: [
        { _id: category._id },
        { parentCategory: category._id }
      ],
      isActive: true
    }).distinct('_id');

    // Build product query
    const productQuery = {
      category: { $in: subcategoryIds },
      isActive: true,
    };

    // Apply additional filters
    if (minPrice || maxPrice) {
      productQuery.$and = productQuery.$and || [];
      if (minPrice) {
        productQuery.$and.push({ finalPrice: { $gte: parseFloat(minPrice) } });
      }
      if (maxPrice) {
        productQuery.$and.push({ finalPrice: { $lte: parseFloat(maxPrice) } });
      }
    }

    if (featured === 'true') {
      productQuery.isFeatured = true;
    }

    if (inStock === 'true') {
      productQuery.stock = { $gt: 0 };
    }

    // Sort options
    const sortOptions = {};
    const validSortFields = ['name', 'price', 'createdAt', 'averageRating', 'stock'];
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(productQuery)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await Product.countDocuments(productQuery);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
      },
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalCount,
        itemsPerPage: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching category products:', error);
    res.status(500).json({ 
      message: 'Error fetching category products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/categories - Create new category (admin only)
router.post('/',
  requireAdmin,
  [
    body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name must be 1-50 characters'),
    body('description').optional().trim().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const categoryData = req.body;
      
      // Validate parent category if provided
      if (categoryData.parentCategory) {
        const parentCategory = await Category.findById(categoryData.parentCategory);
        if (!parentCategory) {
          return res.status(400).json({ message: 'Parent category not found' });
        }
      }

      const category = new Category(categoryData);
      await category.save();

      res.status(201).json(category);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ 
        message: 'Error creating category',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// PUT /api/categories/:id - Update category (admin only)
router.put('/:id',
  requireAdmin,
  [
    body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Name must be 1-50 characters'),
    body('description').optional().trim().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const category = await Category.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('parentCategory', 'name slug');

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json(category);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ 
        message: 'Error updating category',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// DELETE /api/categories/:id - Delete category (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // Check if category has products
    const Product = require('../models/Product');
    const hasProducts = await Product.exists({ category: req.params.id });
    
    if (hasProducts) {
      return res.status(400).json({ 
        message: 'Cannot delete category with existing products' 
      });
    }

    // Check if category has subcategories
    const hasSubcategories = await Category.exists({ parentCategory: req.params.id });
    
    if (hasSubcategories) {
      return res.status(400).json({ 
        message: 'Cannot delete category with subcategories' 
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ 
      message: 'Error deleting category',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;