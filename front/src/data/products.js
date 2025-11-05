// Sample product data
export const PRODUCTS = [
  {
    id: 1,
    name: "Premium Wireless Headphones",
    price: 299.99,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    category: "Electronics",
    shortDesc: "High-fidelity audio experience",
    description: "Immerse yourself in crystal-clear sound with active noise cancellation, 30-hour battery life, and premium comfort padding. These headphones feature advanced Bluetooth 5.0 connectivity and support for high-resolution audio codecs.",
    discount: 15,
    stock: 25
  },
  {
    id: 2,
    name: "Minimalist Leather Wallet",
    price: 79.99,
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80",
    category: "Accessories",
    shortDesc: "Handcrafted genuine leather",
    description: "Crafted from premium full-grain leather, this wallet combines timeless elegance with modern functionality. Features RFID blocking technology, 6 card slots, and a slim profile that fits comfortably in your pocket.",
    discount: 10,
    stock: 50
  },
  {
    id: 3,
    name: "Smart Fitness Watch",
    price: 399.99,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    category: "Electronics",
    shortDesc: "Track your health in style",
    description: "Advanced health monitoring with heart rate tracking, GPS, sleep analysis, and 50+ workout modes. Water-resistant up to 50m with a stunning AMOLED display and 7-day battery life.",
    discount: 20,
    stock: 15
  },
  {
    id: 4,
    name: "Designer Sunglasses",
    price: 189.99,
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80",
    category: "Accessories",
    shortDesc: "UV protection meets style",
    description: "Premium polarized lenses with 100% UV protection. Lightweight titanium frame with scratch-resistant coating. Includes premium case and cleaning cloth.",
    discount: 5,
    stock: 30
  },
  {
    id: 5,
    name: "Portable Bluetooth Speaker",
    price: 149.99,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80",
    category: "Electronics",
    shortDesc: "360° premium sound",
    description: "Powerful 360-degree sound with deep bass. IPX7 waterproof rating, 24-hour battery life, and seamless multi-device pairing. Perfect for any adventure.",
    discount: 12,
    stock: 40
  },
  {
    id: 6,
    name: "Classic Wristwatch",
    price: 499.99,
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&auto=format&fit=crop&q=80",
    category: "Accessories",
    shortDesc: "Timeless elegance",
    description: "Swiss-made automatic movement with sapphire crystal glass. Water-resistant stainless steel case with genuine leather strap. A statement of refined taste.",
    discount: 25,
    stock: 10
  },
  {
    id: 7,
    name: "Cozy Knitted Blanket",
    price: 59.99,
    image: "https://i.pinimg.com/1200x/78/c8/9e/78c89e1e9c37c846b278c1bec59346d0.jpg",
    category: "Home",
    shortDesc: "Ultra-soft knit comfort",
    description: "Elevate your living space with a premium, ultra-soft knit throw blanket. Perfect for couches and reading nooks. Machine-washable and breathable.",
    discount: 0,
    stock: 60
  },
  {
    id: 8,
    name: "Ceramic Dinnerware Set (16pc)",
    price: 129.99,
    image: "https://i.pinimg.com/736x/e7/20/14/e7201449db30a1fd92cca7ed05b757d0.jpg",
    category: "Home",
    shortDesc: "Modern matte finish",
    description: "Premium ceramic with a matte glaze for a contemporary table setting. Microwave and dishwasher safe.",
    discount: 8,
    stock: 35
  },
  {
    id: 9,
    name: "Classic Denim Jacket",
    price: 89.99,
    image: "https://i.pinimg.com/736x/2a/34/a3/2a34a3b9ae3d4f2e8c9771055f65434b.jpg",
    category: "Fashion",
    shortDesc: "Timeless wardrobe staple",
    description: "Durable denim with a tailored fit and reinforced seams. Pairs effortlessly with any outfit across seasons.",
    discount: 10,
    stock: 45
  },
  {
    id: 10,
    name: "Athleisure Sneakers",
    price: 119.99,
    image: "https://i.pinimg.com/1200x/a5/69/63/a5696357dd307a5ed6fbf9f91a40f54b.jpg",
    category: "Fashion",
    shortDesc: "Breathable and lightweight",
    description: "Performance-knit upper with responsive cushioning and excellent traction. Perfect for daily wear.",
    discount: 15,
    stock: 70
  },
  {
    id: 11,
    name: "Aromatic Soy Candle Set",
    price: 39.99,
    image: "https://i.pinimg.com/736x/14/12/a4/1412a457a8e8efd77008bce324e077d7.jpg",
    category: "Home",
    shortDesc: "Calming scents trio",
    description: "Hand-poured soy candles with cotton wicks. Scents: lavender, sandalwood, and citrus bergamot.",
    discount: 0,
    stock: 100
  },
  {
    id: 12,
    name: "Silk Scarf",
    price: 49.99,
    image: "https://i.pinimg.com/1200x/c1/47/7d/c1477d594449ae063b7486d2eaef52b9.jpg",
    category: "Fashion",
    shortDesc: "Luxurious touch",
    description: "100% mulberry silk with hand-rolled edges. Adds a statement finish to any look.",
    discount: 5,
    stock: 80
  },
  {
    id: 13,
    name: "Chef's Knife (8-inch)",
    price: 89.99,
    image: "https://i.pinimg.com/736x/23/7a/e3/237ae33b8a88dccc8c6510de7c173a9c.jpg",
    category: "Kitchen",
    shortDesc: "Precision forged steel",
    description: "High-carbon stainless steel blade with ergonomic handle for balance and control in everyday prep.",
    discount: 12,
    stock: 55
  },
  {
    id: 14,
    name: "Hydrating Face Serum",
    price: 34.99,
    image: "https://i.pinimg.com/1200x/9d/e0/88/9de088bdad3b707dc6dfa392716329cb.jpg",
    category: "Beauty",
    shortDesc: "Hyaluronic + vitamin B5",
    description: "Lightweight daily serum for a plump, dewy complexion. Fragrance-free and dermatologist tested.",
    discount: 0,
    stock: 120
  }
];

export const CATEGORIES = ["All", "Electronics", "Accessories", "Fashion", "Home", "Kitchen", "Beauty"];

