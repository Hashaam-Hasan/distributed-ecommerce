require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Service URLs (set via environment variables for each deployment) ─────────
const PRODUCT_SERVICE  = process.env.PRODUCT_SERVICE_URL  || 'http://localhost:3002';
const PAYMENT_SERVICE  = process.env.PAYMENT_SERVICE_URL  || 'http://localhost:3004';

// ─── DB Connection ────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Order Service: MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// ─── Schema ───────────────────────────────────────────────────────────────────
const OrderItemSchema = new mongoose.Schema({
  productId:   String,
  productName: String,
  quantity:    Number,
  unitPrice:   Number,
  subtotal:    Number,
});

const OrderSchema = new mongoose.Schema({
  userId:               { type: String, required: true },
  userName:             { type: String },
  items:                [OrderItemSchema],
  totalAmount:          Number,
  status:               { type: String, default: 'pending', enum: ['pending', 'paid', 'failed', 'cancelled'] },
  paymentTransactionId: { type: String, default: null },
  shippingAddress:      { type: String, default: 'Default Address' },
  createdAt:            { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', OrderSchema);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) =>
  res.json({ status: 'UP', service: 'Order Service', timestamp: new Date() })
);

// Create a new order — orchestrates Product & Payment services
app.post('/orders', async (req, res) => {
  const { userId, userName, items, shippingAddress } = req.body;
  // items: [{ productId, quantity }]

  if (!userId || !items || items.length === 0)
    return res.status(400).json({ error: 'userId and items are required' });

  let order;
  try {
    // 1. Fetch product details from Product Service
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { data: product } = await axios.get(
        `${PRODUCT_SERVICE}/products/${item.productId}`
      );
      const subtotal = product.price * item.quantity;
      orderItems.push({
        productId:   product._id,
        productName: product.name,
        quantity:    item.quantity,
        unitPrice:   product.price,
        subtotal,
      });
      totalAmount += subtotal;
    }

    // 2. Create order record with status "pending"
    order = await Order.create({
      userId,
      userName,
      items: orderItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      status: 'pending',
      shippingAddress,
    });

    // 3. Call Payment Service
    const { data: payment } = await axios.post(`${PAYMENT_SERVICE}/process`, {
      orderId: order._id,
      amount:  order.totalAmount,
      userId,
    });

    // 4. Deduct stock via Product Service
    for (const item of items) {
      await axios.put(`${PRODUCT_SERVICE}/products/${item.productId}/stock`, {
        quantity: item.quantity,
      });
    }

    // 5. Mark order as paid
    order.status = 'paid';
    order.paymentTransactionId = payment.transactionId;
    await order.save();

    res.status(201).json({ order, payment });
  } catch (err) {
    // Payment failed
    if (err.response?.status === 402) {
      if (order) {
        order.status = 'failed';
        await order.save();
      }
      return res.status(402).json({
        error:   'Payment failed',
        details: err.response.data,
        order,
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get all orders for a specific user
app.get('/orders/user/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all orders (admin view)
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single order
app.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch {
    res.status(404).json({ error: 'Order not found' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3003;
app.listen(PORT, () =>
  console.log(`✅ Order Service running on port ${PORT}`)
);
