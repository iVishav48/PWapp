const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sampleCategories = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Latest electronic devices and gadgets',
    image: '/images/categories/electronics.jpg',
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Clothing',
    slug: 'clothing',
    description: 'Fashion and apparel for all occasions',
    image: '/images/categories/clothing.jpg',
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Everything for your home and garden',
    image: '/images/categories/home-garden.jpg',
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'Sports',
    slug: 'sports',
    description: 'Sports equipment and outdoor gear',
    image: '/images/categories/sports.jpg',
    isActive: true,
    sortOrder: 4,
  },
  {
    name: 'Books',
    slug: 'books',
    description: 'Books for every interest and age',
    image: '/images/categories/books.jpg',
    isActive: true,
    sortOrder: 5,
  },
];

const sampleProducts = [
  {
    name: 'Wireless Headphones',
    slug: 'wireless-headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 99.99,
    originalPrice: 129.99,
    images: [
      '/images/products/headphones-1.jpg',
      '/images/products/headphones-2.jpg',
      '/images/products/headphones-3.jpg',
    ],
    stock: 50,
    sku: 'WH-001',
    brand: 'TechSound',
    tags: ['electronics', 'audio', 'wireless'],
    specifications: {
      'Battery Life': '30 hours',
      'Connectivity': 'Bluetooth 5.0',
      'Weight': '250g',
      'Noise Cancellation': 'Active',
    },
    isActive: true,
    isFeatured: true,
    weight: 0.25,
    dimensions: {
      length: 20,
      width: 15,
      height: 8,
    },
  },
  {
    name: 'Smart Watch',
    slug: 'smart-watch',
    description: 'Advanced smartwatch with health monitoring',
    price: 299.99,
    originalPrice: 349.99,
    images: [
      '/images/products/smartwatch-1.jpg',
      '/images/products/smartwatch-2.jpg',
    ],
    stock: 30,
    sku: 'SW-001',
    brand: 'FitTech',
    tags: ['electronics', 'wearable', 'fitness'],
    specifications: {
      'Display': '1.4 inch AMOLED',
      'Battery Life': '7 days',
      'Water Resistance': 'IP68',
      'Sensors': 'Heart Rate, GPS, Accelerometer',
    },
    isActive: true,
    isFeatured: true,
    weight: 0.05,
    dimensions: {
      length: 4.5,
      width: 3.8,
      height: 1.2,
    },
  },
  {
    name: 'Cotton T-Shirt',
    slug: 'cotton-tshirt',
    description: 'Comfortable 100% cotton t-shirt',
    price: 24.99,
    images: [
      '/images/products/tshirt-1.jpg',
      '/images/products/tshirt-2.jpg',
    ],
    stock: 100,
    sku: 'CT-001',
    brand: 'ComfortWear',
    tags: ['clothing', 'tshirt', 'cotton'],
    specifications: {
      'Material': '100% Cotton',
      'Fit': 'Regular',
      'Care': 'Machine wash cold',
      'Origin': 'Made in USA',
    },
    isActive: true,
    weight: 0.2,
    dimensions: {
      length: 28,
      width: 20,
      height: 1,
    },
  },
  {
    name: 'Yoga Mat',
    slug: 'yoga-mat',
    description: 'Premium non-slip yoga mat',
    price: 39.99,
    images: ['/images/products/yoga-mat.jpg'],
    stock: 75,
    sku: 'YM-001',
    brand: 'ZenFit',
    tags: ['sports', 'fitness', 'yoga'],
    specifications: {
      'Material': 'Natural rubber',
      'Thickness': '6mm',
      'Length': '183cm',
      'Width': '61cm',
    },
    isActive: true,
    weight: 1.5,
    dimensions: {
      length: 183,
      width: 61,
      height: 0.6,
    },
  },
  {
    name: 'Coffee Maker',
    slug: 'coffee-maker',
    description: 'Programmable coffee maker with thermal carafe',
    price: 149.99,
    images: ['/images/products/coffee-maker.jpg'],
    stock: 25,
    sku: 'CM-001',
    brand: 'BrewMaster',
    tags: ['home', 'kitchen', 'coffee'],
    specifications: {
      'Capacity': '12 cups',
      'Carafe': 'Thermal stainless steel',
      'Programmable': '24-hour timer',
      'Auto-shutoff': '2 hours',
    },
    isActive: true,
    weight: 2.5,
    dimensions: {
      length: 35,
      width: 25,
      height: 40,
    },
  },
  {
    name: 'Programming Book',
    slug: 'programming-book',
    description: 'Comprehensive guide to modern web development',
    price: 49.99,
    images: ['/images/products/programming-book.jpg'],
    stock: 200,
    sku: 'PB-001',
    brand: 'TechBooks',
    tags: ['books', 'programming', 'web'],
    specifications: {
      'Pages': '500',
      'Format': 'Paperback',
      'Language': 'English',
      'Publisher': 'Tech Press',
    },
    isActive: true,
    weight: 0.8,
    dimensions: {
      length: 23,
      width: 15,
      height: 3,
    },
  },
  {
    name: 'Running Shoes',
    slug: 'running-shoes',
    description: 'Lightweight running shoes with responsive cushioning',
    price: 129.99,
    images: [
      '/images/products/running-shoes-1.jpg',
      '/images/products/running-shoes-2.jpg',
    ],
    stock: 60,
    sku: 'RS-001',
    brand: 'SpeedRun',
    tags: ['sports', 'running', 'footwear'],
    specifications: {
      'Weight': '280g per shoe',
      'Drop': '8mm',
      'Upper': 'Breathable mesh',
      'Sole': 'Rubber outsole',
    },
    isActive: true,
    weight: 0.56,
    dimensions: {
      length: 30,
      width: 12,
      height: 10,
    },
  },
  {
    name: 'Desk Lamp',
    slug: 'desk-lamp',
    description: 'LED desk lamp with adjustable brightness',
    price: 79.99,
    images: ['/images/products/desk-lamp.jpg'],
    stock: 40,
    sku: 'DL-001',
    brand: 'BrightLight',
    tags: ['home', 'lighting', 'office'],
    specifications: {
      'LED Type': 'Full spectrum',
      'Power': '12W',
      'Color Temperature': '3000K-6500K',
      'USB Charging': 'Yes',
    },
    isActive: true,
    weight: 1.2,
    dimensions: {
      length: 45,
      width: 20,
      height: 55,
    },
  },
];

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'pwa-storefront',
    });
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('Existing data cleared');

    // Create categories
    console.log('Creating categories...');
    const createdCategories = await Category.insertMany(sampleCategories);
    console.log(`${createdCategories.length} categories created`);

    // Create products with category references
    console.log('Creating products...');
    const productsWithCategories = sampleProducts.map((product, index) => {
      const imagesArr = Array.isArray(product.images) ? product.images : [];
      const normalizedImages = imagesArr.map(img =>
        typeof img === 'string' ? { url: img, alt: product.name } : img
      );
      return {
        ...product,
        images: normalizedImages,
        category: createdCategories[index % createdCategories.length]._id,
      };
    });

    const createdProducts = await Product.insertMany(productsWithCategories);
    console.log(`${createdProducts.length} products created`);

    // Update categories with product references
    console.log('Updating categories with product references...');
    for (const category of createdCategories) {
      const categoryProducts = createdProducts.filter(
        product => product.category.toString() === category._id.toString()
      );
      category.products = categoryProducts.map(p => p._id);
      await category.save();
    }
    console.log('Categories updated with products');

    console.log('Database seeded successfully!');
    console.log(`Created ${createdCategories.length} categories and ${createdProducts.length} products`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run seeder if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;