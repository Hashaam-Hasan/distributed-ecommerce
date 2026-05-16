import { useState, useEffect, useCallback } from 'react';

// ─── Service URLs from environment variables ──────────────────────────────────
const USER_SVC    = import.meta.env.VITE_USER_SERVICE    || 'http://localhost:3001';
const PRODUCT_SVC = import.meta.env.VITE_PRODUCT_SERVICE || 'http://localhost:3002';
const ORDER_SVC   = import.meta.env.VITE_ORDER_SERVICE   || 'http://localhost:3003';

// ─── Category emoji map ───────────────────────────────────────────────────────
const categoryEmoji = { Electronics: '💻', Sports: '⚽', Kitchen: '☕', Home: '🏠', General: '📦' };

// ─── Helper: API fetch wrapper ────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { data, status: res.status });
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode]     = useState('login'); // 'login' | 'register'
  const [form, setForm]     = useState({ name: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!form.email || !form.password) return setError('Email and password are required');
    if (mode === 'register' && !form.name) return setError('Name is required');
    setLoading(true);
    try {
      if (mode === 'register') {
        await apiFetch(`${USER_SVC}/register`, { method: 'POST', body: JSON.stringify(form) });
        setMode('login');
        setError('');
        alert('Registered! Please log in.');
      } else {
        const data = await apiFetch(`${USER_SVC}/login`, { method: 'POST', body: JSON.stringify({ email: form.email, password: form.password }) });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user, data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">🛒</div>
        <h1 className="auth-title">DistroShop</h1>
        <p className="auth-sub">Distributed E-Commerce Platform</p>

        {error && <div className="alert alert-error">{error}</div>}

        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Ali Hassan" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading}>
          {loading ? <span className="spinner" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
        </button>
        <div className="auth-toggle">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </div>
        <div style={{ marginTop: 16, padding: '10px', background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', color: '#64748b' }}>
          <strong>Demo:</strong> Register a new account to get started
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE STATUS BAR
// ─────────────────────────────────────────────────────────────────────────────
function ServiceStatusBar() {
  const [statuses, setStatuses] = useState({ user: 'checking', product: 'checking', order: 'checking' });

  useEffect(() => {
    const check = async () => {
      const checkService = async (url) => {
        try { await fetch(`${url}/health`); return 'up'; } catch { return 'down'; }
      };
      const [user, product, order] = await Promise.all([
        checkService(USER_SVC), checkService(PRODUCT_SVC), checkService(ORDER_SVC)
      ]);
      setStatuses({ user, product, order });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { name: 'User Service',    key: 'user' },
    { name: 'Product Service', key: 'product' },
    { name: 'Order Service',   key: 'order' },
  ];

  return (
    <div className="status-bar">
      <span style={{ fontWeight: 600, color: '#475569' }}>Services:</span>
      {services.map(s => (
        <span key={s.key}>
          <span className={`status-dot ${statuses[s.key]}`} />
          {s.name} <span style={{ color: statuses[s.key] === 'up' ? '#16a34a' : statuses[s.key] === 'down' ? '#dc2626' : '#92400e' }}>
            {statuses[s.key] === 'checking' ? '...' : statuses[s.key].toUpperCase()}
          </span>
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function ProductsPage({ cart, setCart }) {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('');
  const [categories, setCategories] = useState([]);
  const [flash, setFlash]         = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [prods, cats] = await Promise.all([
          apiFetch(`${PRODUCT_SVC}/products`),
          apiFetch(`${PRODUCT_SVC}/categories`),
        ]);
        setProducts(prods);
        setCategories(cats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = products.filter(p =>
    (!category || p.category === category) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) return prev.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    setFlash(`${product.name} added to cart!`);
    setTimeout(() => setFlash(''), 2000);
  };

  return (
    <div className="container">
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>🛍️ Shop</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="Search products..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
          <select className="form-input" value={category} onChange={e => setCategory(e.target.value)} style={{ width: 160 }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {flash && <div className="alert alert-success">✅ {flash}</div>}

      {loading ? (
        <div className="loading">⏳ Loading products from Product Service...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🔍</div>No products found</div>
      ) : (
        <div className="product-grid">
          {filtered.map(product => (
            <div key={product._id} className="product-card">
              <div className="product-img">
                {categoryEmoji[product.category] || '📦'}
              </div>
              <div className="product-body">
                <span className="category-tag">{product.category}</span>
                <div className="product-name">{product.name}</div>
                <div className="product-desc">{product.description}</div>
                <div className="product-meta">
                  <span className="product-price">${product.price.toFixed(2)}</span>
                  <span className="product-stock">{product.stock > 0 ? `${product.stock} in stock` : '❌ Out of stock'}</span>
                </div>
                <button className="btn btn-primary btn-sm btn-full"
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}>
                  {product.stock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CART PAGE
// ─────────────────────────────────────────────────────────────────────────────
function CartPage({ cart, setCart, user, onOrderPlaced }) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [address, setAddress]   = useState('123 Main St, Karachi, Pakistan');

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
                        .filter(i => i.qty > 0));
  };
  const removeItem = (id) => setCart(prev => prev.filter(i => i._id !== id));
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiFetch(`${ORDER_SVC}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          shippingAddress: address,
          items: cart.map(i => ({ productId: i._id, quantity: i.qty })),
        }),
      });
      setResult({ success: true, data });
      setCart([]);
      onOrderPlaced();
    } catch (err) {
      setResult({ success: false, error: err.message, details: err.data });
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !result) {
    return (
      <div className="container">
        <h1 className="page-title">🛒 Cart</h1>
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <p>Your cart is empty</p>
          <p className="text-muted mt-2">Go to Shop to add products</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">🛒 Cart</h1>

      {result && (
        result.success ? (
          <div className="alert alert-success">
            ✅ <strong>Order placed successfully!</strong> Transaction ID: {result.data.payment?.transactionId}<br />
            Your order #{result.data.order?._id?.slice(-8)} is confirmed.
          </div>
        ) : (
          <div className="alert alert-error">
            ❌ <strong>Order failed:</strong> {result.error}
          </div>
        )
      )}

      {cart.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <div className="card">
            <p className="section-title">Items ({cart.length})</p>
            {cart.map(item => (
              <div key={item._id} className="cart-item">
                <div>
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">${item.price.toFixed(2)} each</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => updateQty(item._id, -1)}>−</button>
                    <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item._id, +1)}>+</button>
                  </div>
                  <span style={{ fontWeight: 700, minWidth: 70, textAlign: 'right' }}>${(item.price * item.qty).toFixed(2)}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => removeItem(item._id)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <p className="section-title">Order Summary</p>
              {cart.map(i => (
                <div key={i._id} className="summary-row">
                  <span>{i.name} ×{i.qty}</span>
                  <span>${(i.price * i.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="summary-row summary-total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="card">
              <p className="section-title">Shipping Address</p>
              <textarea className="form-input" rows={3} value={address}
                onChange={e => setAddress(e.target.value)} style={{ resize: 'vertical' }} />
              <div className="mt-4">
                <button className="btn btn-success btn-full" onClick={placeOrder} disabled={loading}>
                  {loading ? <><span className="spinner" /> Processing Payment...</> : `💳 Place Order · $${total.toFixed(2)}`}
                </button>
              </div>
              <p className="text-muted mt-2" style={{ fontSize: '0.75rem', textAlign: 'center' }}>
                🔒 Payment processed via Payment Service
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function OrdersPage({ user, refresh }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`${ORDER_SVC}/orders/user/${user.id}`);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders, refresh]);

  return (
    <div className="container">
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>📦 My Orders</h1>
        <button className="btn btn-outline btn-sm" onClick={fetchOrders}>🔄 Refresh</button>
      </div>

      {loading ? (
        <div className="loading">⏳ Fetching orders from Order Service...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p>No orders yet</p>
          <p className="text-muted mt-2">Go shopping to place your first order!</p>
        </div>
      ) : (
        orders.map(order => (
          <div key={order._id} className="order-card">
            <div className="order-header">
              <div>
                <div className="order-id">Order #{order._id.slice(-12).toUpperCase()}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                  {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>
              <span className={`status-badge status-${order.status}`}>{order.status}</span>
            </div>
            <div style={{ marginBottom: 10 }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ fontSize: '0.875rem', padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.productName} ×{item.quantity}</span>
                  <span style={{ color: '#64748b' }}>${item.subtotal?.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <hr className="divider" />
            <div className="flex-between">
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {order.paymentTransactionId ? `TXN: ${order.paymentTransactionId}` : 'No transaction'}
              </span>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total: ${order.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE INFO PAGE
// ─────────────────────────────────────────────────────────────────────────────
function AboutPage() {
  const services = [
    { icon: '👤', name: 'User Service', port: '3001', db: 'users_db', role: 'Handles registration, login, and JWT authentication. Issues tokens used across services.' },
    { icon: '📦', name: 'Product Service', port: '3002', db: 'products_db', role: 'Manages product catalog, inventory, and stock updates. Provides product data to Order Service.' },
    { icon: '🧾', name: 'Order Service', port: '3003', db: 'orders_db', role: 'Orchestrates order creation. Calls Product Service for details, Payment Service for payment, then updates stock.' },
    { icon: '💳', name: 'Payment Service', port: '3004', db: 'In-memory (simulation)', role: 'Simulates payment gateway. Returns transaction ID on success or rejection message on failure.' },
  ];
  return (
    <div className="container">
      <h1 className="page-title">🏛️ System Architecture</h1>
      <div className="card" style={{ marginBottom: 20 }}>
        <p className="section-title">Architectural Style</p>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
          This system uses a <strong>Microservices Architecture</strong> with REST-based inter-service communication.
          Each service is independently deployable, has its own database (polyglot persistence), and communicates
          via HTTP APIs. The Order Service acts as an <strong>orchestrator</strong> that calls other services.
        </p>
      </div>
      <div className="product-grid">
        {services.map(s => (
          <div key={s.name} className="card">
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
            <div style={{ fontSize: '0.75rem', marginBottom: 8 }}>
              <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 99, fontFamily: 'monospace' }}>:{s.port}</span>
              {'  '}
              <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem' }}>DB: {s.db}</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>{s.role}</p>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <p className="section-title">Sustainability Analysis</p>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#374151' }}>
          <strong>✅ Energy Efficiency:</strong> Microservices allow scaling only the components under load, reducing idle resource consumption compared to a monolithic system.<br /><br />
          <strong>✅ Cloud Resource Optimization:</strong> Services are deployed on Render.com free tier, which uses shared, energy-efficient infrastructure with automatic sleep on inactivity.<br /><br />
          <strong>✅ Database Efficiency:</strong> MongoDB Atlas on shared clusters reduces per-application energy overhead.<br /><br />
          <strong>⚠️ Carbon Footprint:</strong> Network communication between distributed services adds overhead. Collocating services in the same data center region minimizes this.<br /><br />
          <strong>✅ Scalability for Sustainability:</strong> Horizontal scaling means more requests per watt, improving environmental efficiency at scale.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [token, setToken]       = useState(() => localStorage.getItem('token') || '');
  const [page, setPage]         = useState('shop');
  const [cart, setCart]         = useState([]);
  const [orderRefresh, setOrderRefresh] = useState(0);

  const handleLogin = (u, t) => { setUser(u); setToken(t); setPage('shop'); };
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null); setToken(''); setCart([]);
  };
  const onOrderPlaced = () => { setOrderRefresh(r => r + 1); setPage('orders'); };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      <nav className="navbar">
        <span className="navbar-brand">🛒 DistroShop</span>
        <div className="navbar-right">
          <button className={`nav-btn ${page === 'shop' ? 'active' : ''}`} onClick={() => setPage('shop')}>Shop</button>
          <button className={`nav-btn ${page === 'cart' ? 'active' : ''}`} onClick={() => setPage('cart')}>
            Cart {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </button>
          <button className={`nav-btn ${page === 'orders' ? 'active' : ''}`} onClick={() => setPage('orders')}>Orders</button>
          <button className={`nav-btn ${page === 'about' ? 'active' : ''}`} onClick={() => setPage('about')}>Architecture</button>
          <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>👋 {user.name}</span>
          <button className="nav-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <ServiceStatusBar />

      {page === 'shop'   && <ProductsPage cart={cart} setCart={setCart} />}
      {page === 'cart'   && <CartPage cart={cart} setCart={setCart} user={user} onOrderPlaced={onOrderPlaced} />}
      {page === 'orders' && <OrdersPage user={user} refresh={orderRefresh} />}
      {page === 'about'  && <AboutPage />}
    </>
  );
}
