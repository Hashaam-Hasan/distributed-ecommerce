require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory transaction log (simulated - no DB needed for payment simulation)
const transactions = [];

// ─── Helper ───────────────────────────────────────────────────────────────────
function generateTransactionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `TXN-${Date.now()}-${rand}`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) =>
  res.json({ status: 'UP', service: 'Payment Service', timestamp: new Date() })
);

// Process a payment
app.post('/process', (req, res) => {
  const { orderId, amount, userId, paymentMethod = 'credit_card' } = req.body;

  if (!orderId || !amount || !userId) {
    return res.status(400).json({ error: 'orderId, amount, and userId are required' });
  }

  // Simulate processing delay (real systems call a payment gateway here)
  // Simulate 95% success rate
  const isSuccess = Math.random() > 0.05;

  const transactionId = generateTransactionId();
  const timestamp = new Date().toISOString();

  const record = {
    transactionId,
    orderId,
    userId,
    amount: parseFloat(amount.toFixed(2)),
    paymentMethod,
    status: isSuccess ? 'SUCCESS' : 'FAILED',
    processedAt: timestamp,
  };

  transactions.push(record);

  if (isSuccess) {
    return res.status(200).json({
      ...record,
      message: 'Payment processed successfully',
    });
  } else {
    return res.status(402).json({
      ...record,
      message: 'Payment declined. Simulated gateway rejection.',
    });
  }
});

// Get transaction history (all)
app.get('/transactions', (req, res) => {
  res.json(transactions);
});

// Get transaction by ID
app.get('/transactions/:id', (req, res) => {
  const txn = transactions.find((t) => t.transactionId === req.params.id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  res.json(txn);
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3004;
app.listen(PORT, () =>
  console.log(`✅ Payment Service running on port ${PORT}`)
);
