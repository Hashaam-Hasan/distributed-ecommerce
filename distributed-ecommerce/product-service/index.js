require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ─── DB Connection ────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Product Service: MongoDB connected');
    seedProducts();
  })
  .catch((err) => console.error('MongoDB error:', err));

// ─── Schema ───────────────────────────────────────────────────────────────────
const ProductSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  price:       { type: Number, required: true },
  stock:       { type: Number, default: 100 },
  category:    { type: String, default: 'General' },
  imageUrl:    { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
});
const Product = mongoose.model('Product', ProductSchema);

// ─── Seed Data ────────────────────────────────────────────────────────────────
async function seedProducts() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      { name: 'Gaming Laptop',    description: 'High-performance gaming laptop with RTX 4060', price: 1299.99, stock: 30,  category: 'Electronics' },
      { name: 'Smartphone Pro',  description: 'Latest flagship smartphone with 200MP camera',  price: 799.99,  stock: 80,  category: 'Electronics' },
      { name: 'Wireless Headphones', description: 'Noise-cancelling Bluetooth headphones',     price: 199.99,  stock: 120, category: 'Electronics' },
      { name: 'Running Shoes',   description: 'Lightweight marathon running shoes',            price: 89.99,   stock: 200, category: 'Sports' },
      { name: 'Coffee Maker',    description: 'Automatic drip coffee maker 12-cup',           price: 59.99,   stock: 75,  category: 'Kitchen' },
      { name: 'Mechanical Keyboard', description: 'RGB mechanical gaming keyboard',           price: 129.99,  stock: 60,  category: 'Electronics' },
      { name: 'Yoga Mat',        description: 'Non-slip premium yoga mat',                    price: 34.99,   stock: 150, category: 'Sports' },
      { name: 'Desk Lamp',       description: 'LED adjustable desk lamp with USB charging',   price: 44.99,   stock: 90,  category: 'Home' },
    ]);
    console.log('✅ Products seeded');
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) =>
  res.json({ status: 'UP', service: 'Product Service', timestamp: new Date() })
);

// Get all products
app.get('/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search)   query.name = { $regex: search, $options: 'i' };
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch {
    res.status(404).json({ error: 'Product not found' });
  }
});

// Create product
app.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update stock (called by Order Service after successful order)
app.put('/products/:id/stock', async (req, res) => {
  try {
    const { quantity } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity)
      return res.status(400).json({ error: 'Insufficient stock', available: product.stock });

    product.stock -= quantity;
    await product.save();
    res.json({ message: 'Stock updated', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get categories
app.get('/categories', async (req, res) => {
  const categories = await Product.distinct('category');
  res.json(categories);
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3002;
app.listen(PORT, () =>
  console.log(`✅ Product Service running on port ${PORT}`)
);
