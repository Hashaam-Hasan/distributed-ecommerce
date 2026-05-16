# 🛒 DistroShop — Distributed E-Commerce System
### CS-432 Distributed Computing | Term Project | BE Batch 2022

---

## 🏛️ Architecture Overview

This is a **Microservices-based distributed e-commerce platform** with 4 independent services:

| Service          | Port | Database         | Responsibility                          |
|-----------------|------|------------------|-----------------------------------------|
| User Service    | 3001 | MongoDB `users_db`    | Registration, Login, JWT Auth      |
| Product Service | 3002 | MongoDB `products_db` | Product catalog, inventory         |
| Order Service   | 3003 | MongoDB `orders_db`   | Order creation, orchestration      |
| Payment Service | 3004 | In-memory (simulation)| Payment gateway simulation         |
| Frontend        | 5173 | —                | React web app for users             |

**Communication:** REST HTTP APIs between services  
**Architectural Style:** Microservices + Orchestration (Order Service orchestrates others)

---

## 🚀 STEP-BY-STEP DEPLOYMENT GUIDE

### STEP 1 — Set Up MongoDB Atlas (Free, ~5 minutes)

1. Go to **https://cloud.mongodb.com** → Sign up free
2. Create a new **Free M0 cluster** (choose any region)
3. In "Database Access" → Add a database user (save username + password)
4. In "Network Access" → Add IP Address → **Allow from Anywhere** (0.0.0.0/0)
5. Click "Connect" → "Connect your application" → copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`
6. You will use this base string 3 times, with different DB names:
   - `users_db` → for User Service
   - `products_db` → for Product Service
   - `orders_db` → for Order Service

---

### STEP 2 — Push Code to GitHub (~5 minutes)

```bash
# From the project root folder (distributed-ecommerce/)
git init
git add .
git commit -m "Initial commit - Distributed E-Commerce"
git branch -M main

# Create a new repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/distributed-ecommerce.git
git push -u origin main
```

---

### STEP 3 — Deploy Backend Services on Render.com (Free, ~15 minutes)

Go to **https://render.com** → Sign up with GitHub

**Deploy each service as a separate "Web Service":**

#### 3a. Deploy User Service
- New → Web Service → Connect your GitHub repo
- **Root Directory:** `user-service`
- **Build Command:** `npm install`
- **Start Command:** `node index.js`
- **Environment Variables:**
  ```
  MONGO_URI = mongodb+srv://user:pass@cluster0.xxx.mongodb.net/users_db?retryWrites=true&w=majority
  JWT_SECRET = dc432_super_secret_key_2024
  PORT = 3001
  ```
- Click "Create Web Service"
- Copy the deployed URL (e.g., `https://user-service-xxxx.onrender.com`)

#### 3b. Deploy Product Service
- Same process, Root Directory: `product-service`
- **Environment Variables:**
  ```
  MONGO_URI = mongodb+srv://user:pass@cluster0.xxx.mongodb.net/products_db?retryWrites=true&w=majority
  ```
- Copy URL (e.g., `https://product-service-xxxx.onrender.com`)

#### 3c. Deploy Payment Service
- Root Directory: `payment-service`
- No environment variables needed
- Copy URL (e.g., `https://payment-service-xxxx.onrender.com`)

#### 3d. Deploy Order Service
- Root Directory: `order-service`
- **Environment Variables:**
  ```
  MONGO_URI = mongodb+srv://user:pass@cluster0.xxx.mongodb.net/orders_db?retryWrites=true&w=majority
  PRODUCT_SERVICE_URL = https://product-service-xxxx.onrender.com
  PAYMENT_SERVICE_URL = https://payment-service-xxxx.onrender.com
  ```

> ⚠️ **Free Render services sleep after 15 minutes of inactivity.** For demo, open all 4 health URLs first to wake them up:
> - `https://user-service-xxxx.onrender.com/health`
> - `https://product-service-xxxx.onrender.com/health`
> - etc.

---

### STEP 4 — Deploy Frontend on Vercel (Free, ~5 minutes)

1. Go to **https://vercel.com** → Sign up with GitHub
2. New Project → Import your GitHub repository
3. **Root Directory:** `frontend`
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. **Environment Variables:**
   ```
   VITE_USER_SERVICE    = https://user-service-xxxx.onrender.com
   VITE_PRODUCT_SERVICE = https://product-service-xxxx.onrender.com
   VITE_ORDER_SERVICE   = https://order-service-xxxx.onrender.com
   ```
7. Deploy! You'll get a URL like `https://distro-shop.vercel.app`

---

## 🐳 BONUS: Run Locally with Docker

```bash
# Copy env file and fill in your MongoDB Atlas URIs
cp docker-compose.yml .
# Edit docker-compose.yml to set your MONGO URIs

docker-compose up --build
```

All services start automatically. Frontend can be run separately:
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing the API (Without Frontend)

```bash
# Register a user
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ali","email":"ali@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@test.com","password":"password123"}'

# Get products
curl http://localhost:3002/products

# Check service health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

---

## 📋 API Reference

### User Service (Port 3001)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /health  | Service health check |
| POST   | /register | Register new user |
| POST   | /login   | Login, returns JWT token |
| POST   | /verify  | Verify JWT token |
| GET    | /users   | List all users |

### Product Service (Port 3002)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /health  | Service health check |
| GET    | /products | List all products |
| GET    | /products/:id | Get product by ID |
| POST   | /products | Create product |
| PUT    | /products/:id/stock | Update stock |
| GET    | /categories | List categories |

### Order Service (Port 3003)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /health  | Service health check |
| POST   | /orders  | Create order (orchestrates all) |
| GET    | /orders  | Get all orders |
| GET    | /orders/user/:userId | Get user's orders |
| GET    | /orders/:id | Get single order |

### Payment Service (Port 3004)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /health  | Service health check |
| POST   | /process | Process payment (simulation) |
| GET    | /transactions | Get all transactions |

---

## 🌱 Sustainability Analysis

- **Microservices = Efficient Scaling:** Only scale services under load, reducing energy waste
- **Cloud Infrastructure:** Render.com and Vercel use shared, energy-optimized servers
- **Sleep on Inactivity:** Free tier services sleep when idle, consuming zero resources
- **Network Optimization:** Services in same region minimize cross-datacenter traffic

---

## 👥 Team
- [Your Name Here]
- [Team Member 2]
- [Team Member 3]
- [Team Member 4]
