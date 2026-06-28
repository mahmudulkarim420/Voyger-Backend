# VOYAGE — Backend Implementation Blueprint

> Generated from a full analysis of the Next.js frontend codebase.
> The frontend currently uses **mock data + `setTimeout` fake latency** with **zero real API calls**.
> This document defines the complete backend contract to be built from scratch.

**Stack recommendation:** Node.js + Express (or Next.js Route Handlers) + MongoDB (Mongoose) + JWT auth.
**Currency:** BDT (৳) — all monetary values stored as integers (paisa-free, whole Taka) or decimals with 2 places.
**Cart persistence:** Currently `localStorage` (key `voyage_cart`). Backend should optionally sync cart for authenticated users.

---

## Table of Contents

1. [API Endpoints & HTTP Methods](#1-api-endpoints--http-methods)
2. [Request Payloads & Response Structures](#2-request-payloads--response-structures)
3. [Database Schema & Relations](#3-database-schema--relations)
4. [Authentication & Role-Based Access Control](#4-authentication--role-based-access-control)
5. [Validation & Edge Cases](#5-validation--edge-cases)

---

## 1. API Endpoints & HTTP Methods

Base URL: `/api/v1`

### 1.1 Authentication

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/auth/register` | Public | Register a new user (fullName, email, password) |
| 2 | `POST` | `/auth/login` | Public | Login with email + password, returns JWT + user |
| 3 | `POST` | `/auth/logout` | Authenticated | Invalidate session / clear refresh token |
| 4 | `POST` | `/auth/refresh` | Refresh Token | Exchange refresh token for new access token |
| 5 | `GET` | `/auth/me` | Authenticated | Get current authenticated user profile |
| 6 | `POST` | `/auth/forgot-password` | Public | Send password reset email |
| 7 | `POST` | `/auth/reset-password` | Public | Reset password with token |
| 8 | `PATCH` | `/auth/password` | Authenticated | Change password (old → new) |

### 1.2 Users & Profile

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 9 | `GET` | `/users/me` | Authenticated | Get current user's profile (name, email, phone) |
| 10 | `PATCH` | `/users/me` | Authenticated | Update name, phone (email is **not** editable per UI) |
| 11 | `GET` | `/users/me/addresses` | Authenticated | List saved addresses |
| 12 | `POST` | `/users/me/addresses` | Authenticated | Add a new address |
| 13 | `PATCH` | `/users/me/addresses/:id` | Authenticated | Update an address |
| 14 | `DELETE` | `/users/me/addresses/:id` | Authenticated | Delete an address |
| 15 | `GET` | `/users/me/orders` | Authenticated | List current user's orders (alias of orders filtered by user) |
| 16 | `GET` | `/users/me/wishlist` | Authenticated | List wishlist product IDs |
| 17 | `POST` | `/users/me/wishlist` | Authenticated | Add product to wishlist |
| 18 | `DELETE` | `/users/me/wishlist/:productId` | Authenticated | Remove product from wishlist |

### 1.3 Products

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 19 | `GET` | `/products` | Public | List products with filters: `search`, `category`, `sort`, `page`, `limit` |
| 20 | `GET` | `/products/:id` | Public | Get single product by id (includes related/similar) |
| 21 | `GET` | `/products/featured` | Public | Get featured products (isFeatured = true) |
| 22 | `GET` | `/products/new-arrivals` | Public | Get newest products (createdAt desc) |
| 23 | `POST` | `/products` | Admin | Create a product |
| 24 | `PATCH` | `/products/:id` | Admin | Update a product |
| 25 | `DELETE` | `/products/:id` | Admin | Delete a product |
| 26 | `POST` | `/products/:id/images` | Admin | Upload product images (multipart) |

### 1.4 Categories

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 27 | `GET` | `/categories` | Public | List all categories (with parent/child hierarchy) |
| 28 | `GET` | `/categories/:slug` | Public | Get a category by slug + its products |
| 29 | `POST` | `/categories` | Admin | Create a category |
| 30 | `PATCH` | `/categories/:id` | Admin | Update a category |
| 31 | `DELETE` | `/categories/:id` | Admin | Delete a category (guard if products exist) |

### 1.5 Cart (server-side sync for authenticated users)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 32 | `GET` | `/cart` | Authenticated | Get current user's synced cart |
| 33 | `POST` | `/cart/items` | Authenticated | Add item to cart (productId, size, quantity) |
| 34 | `PATCH` | `/cart/items/:productId` | Authenticated | Update quantity (keyed by productId + size) |
| 35 | `DELETE` | `/cart/items/:productId` | Authenticated | Remove item (keyed by productId + size) |
| 36 | `DELETE` | `/cart` | Authenticated | Clear cart |

> **Note:** Cart is identified by `productId + selectedSize` combination. The `:productId` route param should accept a composite key or the size passed as query param `?size=M`.

### 1.6 Orders

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 37 | `POST` | `/orders` | Authenticated | Place an order from cart (checkout) |
| 38 | `GET` | `/orders` | Authenticated | List current user's orders |
| 39 | `GET` | `/orders/:id` | Authenticated | Get order details (owner or admin) |
| 40 | `PATCH` | `/orders/:id/status` | Admin | Update order status |
| 41 | `GET` | `/orders/:id/track` | Public | Track order by id + email (guest lookup) |
| 42 | `POST` | `/orders/:id/cancel` | Authenticated | Cancel a pending order |

### 1.7 Payments

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 43 | `POST` | `/payments/sslcommerz/init` | Authenticated | Initialize SSLCOMMERZ session, returns gateway URL |
| 44 | `POST` | `/payments/sslcommerz/success` | Public (webhook) | SSLCOMMERZ success callback |
| 45 | `POST` | `/payments/sslcommerz/fail` | Public (webhook) | SSLCOMMERZ failure callback |
| 46 | `POST` | `/payments/sslcommerz/cancel` | Public (webhook) | SSLCOMMERZ cancel callback |
| 47 | `POST` | `/payments/sslcommerz/ipn` | Public (webhook) | SSLCOMMERZ IPN (instant payment notification) |

### 1.8 Shipping

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 48 | `GET` | `/shipping/methods` | Public | List shipping zones + prices (in-dhaka, sub-dhaka, outside-dhaka) |
| 49 | `POST` | `/shipping/calculate` | Public | Calculate shipping for a cart + address |

### 1.9 Search

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 50 | `GET` | `/search?q=` | Public | Full-text search across products (name, description, category) |
| 51 | `GET` | `/search/suggestions?q=` | Public | Autocomplete suggestions (used by Navbar/MobileNav live search) |
| 52 | `GET` | `/search/trending` | Public | Trending search terms (used by MobileNav `trendingSearches`) |

### 1.10 Newsletter

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 53 | `POST` | `/newsletter/subscribe` | Public | Subscribe email to newsletter |
| 54 | `DELETE` | `/newsletter/unsubscribe` | Public | Unsubscribe via email + token |

### 1.11 Reviews

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 55 | `GET` | `/products/:id/reviews` | Public | List reviews for a product |
| 56 | `POST` | `/products/:id/reviews` | Authenticated | Add a review (rating, comment) — must have purchased |
| 57 | `DELETE` | `/reviews/:id` | Authenticated (owner) / Admin | Delete a review |

### 1.12 Admin / Dashboard

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 58 | `GET` | `/admin/stats` | Admin | Dashboard stats: total revenue, sales count, subscriptions, active users |
| 59 | `GET` | `/admin/orders` | Admin | List all orders (with filters) |
| 60 | `GET` | `/admin/users` | Admin | List all users |
| 61 | `PATCH` | `/admin/users/:id/role` | Admin | Change user role (USER ↔ ADMIN) |
| 62 | `GET` | `/admin/products` | Admin | List all products (admin view, includes out-of-stock) |
| 63 | `GET` | `/admin/revenue` | Admin | Revenue analytics (daily/weekly/monthly) |

### 1.13 Content / CMS (static pages)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 64 | `GET` | `/content/faq` | Public | List FAQ entries |
| 65 | `GET` | `/content/stores` | Public | List physical store locations |
| 66 | `GET` | `/content/pages/:slug` | Public | Get static page content (about, contact, policies) |
| 67 | `PATCH` | `/content/pages/:slug` | Admin | Update static page content |

---

## 2. Request Payloads & Response Structures

### 2.1 Standard Envelope

All responses use a consistent envelope:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": { },
  "meta": { "page": 1, "limit": 12, "total": 30, "totalPages": 3 }
}
```

Error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### 2.2 Auth

#### POST `/auth/register`
**Request:**
```json
{
  "fullName": "Rahim Ahmed",
  "email": "rahim@example.com",
  "password": "SecurePass123!"
}
```
**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "usr_abc123",
      "fullName": "Rahim Ahmed",
      "email": "rahim@example.com",
      "role": "USER",
      "phone": null,
      "createdAt": "2026-06-27T17:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### POST `/auth/login`
**Request:**
```json
{
  "email": "rahim@example.com",
  "password": "SecurePass123!"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "usr_abc123",
      "fullName": "Rahim Ahmed",
      "email": "rahim@example.com",
      "role": "USER",
      "phone": "+8801712345678"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### GET `/auth/me`
**Headers:** `Authorization: Bearer <accessToken>`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "fullName": "Rahim Ahmed",
    "email": "rahim@example.com",
    "role": "USER",
    "phone": "+8801712345678",
    "avatar": null
  }
}
```

### 2.3 Products

#### GET `/products?search=&category=&sort=&page=&limit=`
**Query params:**
- `search` (string) — text search
- `category` (ProductCategorySlug) — filter by category slug
- `sort` — `newest` | `price-low` | `price-high` | `name-asc`
- `page` (number, default 1)
- `limit` (number, default 12 — matches `ITEMS_PER_PAGE`)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "vc-433",
      "name": "Classic Oxford Shirt",
      "description": "Premium cotton oxford shirt...",
      "price": 1490,
      "oldPrice": 1990,
      "images": ["/images/vc-433.jpg.jpeg"],
      "category": "shirt",
      "stock": 25,
      "sizes": ["M", "L", "XL"],
      "isFeatured": true,
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-20T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 30, "totalPages": 3 }
}
```

#### GET `/products/:id`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "vc-433",
    "name": "Classic Oxford Shirt",
    "description": "...",
    "price": 1490,
    "oldPrice": 1990,
    "images": ["/images/vc-433.jpg.jpeg", "/images/vc-433_1.jpg.jpeg"],
    "category": "shirt",
    "stock": 25,
    "sizes": ["M", "L", "XL"],
    "isFeatured": true,
    "createdAt": "2026-06-01T10:00:00.000Z",
    "related": [ { "id": "vc-434", "name": "...", "price": 1290, "images": ["..."] } ],
    "similar": [ { "id": "vc-435", "name": "...", "price": 1690, "images": ["..."] } ]
  }
}
```

#### POST `/products` (Admin)
**Request:**
```json
{
  "name": "Classic Oxford Shirt",
  "description": "Premium cotton oxford shirt",
  "price": 1490,
  "oldPrice": 1990,
  "images": ["/images/vc-433.jpg.jpeg"],
  "category": "shirt",
  "stock": 25,
  "sizes": ["M", "L", "XL"],
  "isFeatured": true
}
```

### 2.4 Categories

#### GET `/categories`
**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "shirt",
      "name": "Shirts",
      "slug": "shirt",
      "href": "/shop/shirt",
      "image": "/images/solid-shirtssss.jpg.jpeg",
      "parentId": null,
      "featured": true,
      "children": [
        { "id": "casual-shirt", "name": "Casual Shirts", "slug": "casual-shirt", "parentId": "shirt" },
        { "id": "checked-shirt", "name": "Checked Shirts", "slug": "checked-shirt", "parentId": "shirt" }
      ]
    }
  ]
}
```

### 2.5 Cart

#### POST `/cart/items`
**Request:**
```json
{
  "productId": "vc-433",
  "size": "L",
  "quantity": 2
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": "vc-433",
        "name": "Classic Oxford Shirt",
        "price": 1490,
        "image": "/images/vc-433.jpg.jpeg",
        "size": "L",
        "quantity": 2,
        "stock": 25
      }
    ],
    "cartTotal": 2980,
    "cartCount": 2
  }
}
```

#### PATCH `/cart/items/:productId?size=L`
**Request:**
```json
{ "quantity": 3 }
```

### 2.6 Orders

#### POST `/orders` (Checkout)
**Request:**
```json
{
  "items": [
    { "productId": "vc-433", "size": "L", "quantity": 2 }
  ],
  "shipping": {
    "method": "in-dhaka",
    "address": {
      "firstName": "Rahim",
      "lastName": "Ahmed",
      "country": "Bangladesh",
      "address": "House 12, Road 5, Dhanmondi",
      "city": "Dhaka",
      "postalCode": "1209",
      "phone": "+8801712345678"
    }
  },
  "billing": {
    "sameAsShipping": true
  },
  "paymentMethod": "sslcommerz",
  "notes": "Please deliver after 5 PM"
}
```
**Response (201):**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "id": "ORD-7721-X92",
    "status": "Processing",
    "items": [
      { "name": "Classic Oxford Shirt", "image": "/images/vc-433.jpg.jpeg", "size": "L", "quantity": 2, "price": 1490 }
    ],
    "subtotal": 2980,
    "shippingCost": 70,
    "total": 3050,
    "date": "2026-06-27T17:00:00.000Z",
    "paymentMethod": "sslcommerz",
    "paymentStatus": "PENDING",
    "gatewayUrl": "https://sslcommerz.com/payment/..."
  }
}
```

#### GET `/orders`
**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ORD-7721-X92",
      "date": "2026-06-05T00:00:00.000Z",
      "status": "Delivered",
      "total": 3880,
      "items": [
        { "name": "Classic Oxford Shirt", "image": "/images/vc-433.jpg.jpeg", "size": "L", "quantity": 2 }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
}
```

### 2.7 Addresses

#### POST `/users/me/addresses`
**Request:**
```json
{
  "label": "Home",
  "street": "House 12, Road 5, Dhanmondi",
  "city": "Dhaka",
  "postalCode": "1209",
  "phone": "+8801712345678"
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "addr_001",
    "label": "Home",
    "street": "House 12, Road 5, Dhanmondi",
    "city": "Dhaka",
    "postalCode": "1209",
    "phone": "+8801712345678"
  }
}
```

### 2.8 Newsletter

#### POST `/newsletter/subscribe`
**Request:**
```json
{ "email": "subscriber@example.com" }
```
**Response (200):**
```json
{
  "success": true,
  "message": "Subscribed successfully"
}
```

### 2.9 Search

#### GET `/search?q=shirt`
**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "vc-433", "name": "Classic Oxford Shirt", "price": 1490, "images": ["..."], "category": "shirt" }
  ],
  "meta": { "total": 15 }
}
```

#### GET `/search/suggestions?q=ox`
**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "vc-433", "name": "Classic Oxford Shirt", "images": ["/images/vc-433.jpg.jpeg"], "price": 1490 }
  ]
}
```

### 2.10 Admin Stats

#### GET `/admin/stats`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 542300,
    "subscriptions": 1280,
    "sales": 342,
    "activeNow": 12
  }
}
```

### 2.11 Payments (SSLCOMMERZ)

#### POST `/payments/sslcommerz/init`
**Request:**
```json
{
  "orderId": "ORD-7721-X92",
  "amount": 3050,
  "currency": "BDT",
  "customer": {
    "name": "Rahim Ahmed",
    "email": "rahim@example.com",
    "phone": "+8801712345678"
  }
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "gatewayUrl": "https://sslcommerz.com/payment/session/abc123",
    "sessionId": "abc123"
  }
}
```

---

## 3. Database Schema & Relations

**Recommended:** MongoDB with Mongoose. Below are collections with fields, types, and relations.

### 3.1 Entity Relationship Overview

```
User 1───* Address
User 1───* Order 1───* OrderItem *───1 Product
User 1───* Review *───1 Product
User 1───* WishlistItem *───1 Product
User 1───1 Cart 1───* CartItem *───1 Product
Category 1───* Product
Category 1───* Category (self-referencing parent/child)
Product 1───* ProductImage
Order 1───1 Payment
```

### 3.2 Collection Schemas

#### `users`
```javascript
{
  _id: ObjectId,
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, default: null },
  role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
  avatar: { type: String, default: null },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  refreshTokens: [{ token: String, createdAt: Date }],  // for rotation
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### `addresses`
```javascript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: "User", required: true, index: true },
  label: { type: String, default: "Home" },        // Home, Office, etc.
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  country: { type: String, default: "Bangladesh" },
  street: { type: String, required: true },          // address line
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  phone: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}
```

#### `categories`
```javascript
{
  _id: ObjectId,
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, enum: [
    "new-arrivals", "shirt", "casual-shirt", "checked-shirt", "solid-shirt",
    "cuban-shirt", "denim-shirt", "panjabi", "luxury-panjabi", "cotton-panjabi",
    "kabli", "pant", "formal-pant", "denim-pant", "pajama", "bootcut-pant",
    "jacket", "denim-jacket", "t-shirt", "casual-all", "sweater"
  ]},
  href: { type: String, required: true },
  image: { type: String, default: null },
  parentId: { type: ObjectId, ref: "Category", default: null },  // self-reference
  featured: { type: Boolean, default: false },
  order: { type: Number, default: 0 },   // display order
  createdAt: { type: Date, default: Date.now }
}
```

#### `products`
```javascript
{
  _id: ObjectId,
  name: { type: String, required: true, index: "text" },
  description: { type: String, required: true, index: "text" },
  price: { type: Number, required: true, min: 0 },          // BDT, integer
  oldPrice: { type: Number, default: null, min: 0 },         // for discounts
  images: [{ type: String }],                                 // URL array
  category: { type: String, ref: "Category", required: true },  // slug reference
  stock: { type: Number, required: true, min: 0, default: 0 },
  sizes: [{ type: String }],                                  // ["M","L","XL"] or ["30","32"]
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sku: { type: String, unique: true, sparse: true },
  rating: { type: Number, default: 0 },                       // avg rating cache
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: -1 },
  updatedAt: { type: Date, default: Date.now }
}
// Indexes: { category: 1, isFeatured: 1 }, { name: "text", description: "text" }, { price: 1 }
```

#### `carts`
```javascript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: "User", required: true, unique: true },
  items: [{
    productId: { type: ObjectId, ref: "Product", required: true },
    size: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    addedAt: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now }
}
// Compound uniqueness: items.productId + items.size (enforced in app logic)
```

#### `orders`
```javascript
{
  _id: ObjectId,
  orderNumber: { type: String, required: true, unique: true },  // "ORD-7721-X92"
  userId: { type: ObjectId, ref: "User", required: true, index: true },
  items: [{
    productId: { type: ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },          // snapshot at order time
    image: { type: String, required: true },         // snapshot
    size: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }           // unit price snapshot
  }],
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, required: true },
  total: { type: Number, required: true },
  shippingAddress: {
    firstName: String,
    lastName: String,
    country: String,
    address: String,
    city: String,
    postalCode: String,
    phone: String
  },
  billingAddress: { /* same shape, or null if sameAsShipping */ },
  shippingMethod: { type: String, enum: ["in-dhaka", "sub-dhaka", "outside-dhaka"] },
  paymentMethod: { type: String, enum: ["sslcommerz", "cod"], required: true },
  paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING" },
  status: { type: String, enum: ["Processing", "Shipped", "Delivered", "Cancelled", "Returned"], default: "Processing" },
  notes: { type: String, default: null },
  placedAt: { type: Date, default: Date.now, index: -1 },
  updatedAt: { type: Date, default: Date.now }
}
```

#### `payments`
```javascript
{
  _id: ObjectId,
  orderId: { type: ObjectId, ref: "Order", required: true, index: true },
  userId: { type: ObjectId, ref: "User", required: true },
  method: { type: String, enum: ["sslcommerz", "cod"], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "BDT" },
  status: { type: String, enum: ["INITIATED", "SUCCESS", "FAILED", "CANCELLED"], default: "INITIATED" },
  gatewayTransactionId: { type: String, default: null },
  gatewaySessionId: { type: String, default: null },
  gatewayResponse: { type: Object, default: null },   // raw SSLCOMMERZ response
  paidAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}
```

#### `reviews`
```javascript
{
  _id: ObjectId,
  productId: { type: ObjectId, ref: "Product", required: true, index: true },
  userId: { type: ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  isVerifiedPurchase: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}
// Compound unique index: { productId: 1, userId: 1 } — one review per user per product
```

#### `wishlist`
```javascript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: "User", required: true, index: true },
  productId: { type: ObjectId, ref: "Product", required: true },
  createdAt: { type: Date, default: Date.now }
}
// Compound unique index: { userId: 1, productId: 1 }
```

#### `newsletter_subscribers`
```javascript
{
  _id: ObjectId,
  email: { type: String, required: true, unique: true, lowercase: true },
  isActive: { type: Boolean, default: true },
  unsubscribeToken: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now }
}
```

#### `faqs`
```javascript
{
  _id: ObjectId,
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, default: "general" },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}
```

#### `stores`
```javascript
{
  _id: ObjectId,
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  openHours: { type: String, required: true },
  mapUrl: { type: String, required: true },   // Google Maps embed URL
  isActive: { type: Boolean, default: true }
}
```

#### `shipping_methods`
```javascript
{
  _id: ObjectId,
  id: { type: String, required: true, unique: true, enum: ["in-dhaka", "sub-dhaka", "outside-dhaka"] },
  label: { type: String, required: true },     // "In Dhaka", "Sub Dhaka", "Outside Dhaka"
  price: { type: Number, required: true },      // 70, 100, 130
  isActive: { type: Boolean, default: true }
}
```

#### `search_logs` (for trending searches)
```javascript
{
  _id: ObjectId,
  term: { type: String, required: true },
  count: { type: Number, default: 1 },
  lastSearchedAt: { type: Date, default: Date.now }
}
```

---

## 4. Authentication & Role-Based Access Control

### 4.1 Authentication Strategy

- **JWT-based** with access + refresh token pair
- **Access token:** short-lived (15 min), stored in memory or httpOnly cookie
- **Refresh token:** long-lived (7 days), stored in httpOnly secure cookie, rotated on use
- **Password hashing:** bcrypt (cost factor 12)
- **Middleware:** `authenticate` middleware verifies JWT on protected routes
- **Role middleware:** `requireRole("ADMIN")` checks `user.role === "ADMIN"`

### 4.2 Access Control Matrix

| Route Group | Access Level | Auth Required | Role Required |
|-------------|--------------|:-------------:|:-------------:|
| `POST /auth/register` | Public | ❌ | — |
| `POST /auth/login` | Public | ❌ | — |
| `POST /auth/forgot-password` | Public | ❌ | — |
| `POST /auth/reset-password` | Public | ❌ | — |
| `GET /products` | Public | ❌ | — |
| `GET /products/:id` | Public | ❌ | — |
| `GET /categories` | Public | ❌ | — |
| `GET /search` | Public | ❌ | — |
| `GET /content/*` | Public | ❌ | — |
| `GET /shipping/methods` | Public | ❌ | — |
| `GET /products/:id/reviews` | Public | ❌ | — |
| `GET /auth/me` | Authenticated | ✅ | USER/ADMIN |
| `GET/PATCH /users/me` | Authenticated | ✅ | USER/ADMIN |
| `GET/POST/PATCH/DELETE /users/me/addresses` | Authenticated | ✅ | USER/ADMIN |
| `GET /users/me/orders` | Authenticated | ✅ | USER/ADMIN |
| `GET/POST/DELETE /users/me/wishlist` | Authenticated | ✅ | USER/ADMIN |
| `GET/POST/PATCH/DELETE /cart` | Authenticated | ✅ | USER/ADMIN |
| `POST /orders` | Authenticated | ✅ | USER/ADMIN |
| `GET /orders` (own) | Authenticated | ✅ | USER/ADMIN |
| `GET /orders/:id` | Authenticated | ✅ | Owner or ADMIN |
| `POST /orders/:id/cancel` | Authenticated | ✅ | Owner |
| `POST /products/:id/reviews` | Authenticated | ✅ | USER/ADMIN (must have purchased) |
| `DELETE /reviews/:id` | Authenticated | ✅ | Owner or ADMIN |
| `POST /payments/sslcommerz/init` | Authenticated | ✅ | USER/ADMIN |
| `POST /newsletter/subscribe` | Public | ❌ | — |
| `POST /products` | Admin | ✅ | ADMIN |
| `PATCH/DELETE /products/:id` | Admin | ✅ | ADMIN |
| `POST /products/:id/images` | Admin | ✅ | ADMIN |
| `POST/PATCH/DELETE /categories` | Admin | ✅ | ADMIN |
| `PATCH /orders/:id/status` | Admin | ✅ | ADMIN |
| `GET /admin/stats` | Admin | ✅ | ADMIN |
| `GET /admin/orders` | Admin | ✅ | ADMIN |
| `GET /admin/users` | Admin | ✅ | ADMIN |
| `PATCH /admin/users/:id/role` | Admin | ✅ | ADMIN |
| `GET /admin/revenue` | Admin | ✅ | ADMIN |
| `PATCH /content/pages/:slug` | Admin | ✅ | ADMIN |
| `POST /payments/sslcommerz/*` (webhooks) | Public (IP-verified) | ❌ | — |

### 4.3 Middleware Pseudocode

```javascript
// authenticate.js
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = await User.findById(decoded.userId).select("-passwordHash");
    if (!req.user) return res.status(401).json({ success: false, message: "User not found" });
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

// requireRole.js
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
}

// Usage:
router.post("/products", authenticate, requireRole("ADMIN"), createProduct);
router.get("/orders/:id", authenticate, getOrder);  // controller checks ownership
```

### 4.4 Ownership Checks

For resources like orders and addresses, the controller must verify the requesting user owns the resource:

```javascript
async function getOrder(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  if (order.userId.toString() !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Access denied" });
  }
  res.json({ success: true, data: order });
}
```

---

## 5. Validation & Edge Cases

### 5.1 Validation Rules

#### Auth Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `fullName` | Required, 2–50 chars, letters + spaces only | "Full name must be 2–50 characters" |
| `email` | Required, valid email format, unique | "Invalid email" / "Email already registered" |
| `password` | Required, min 8 chars, 1 uppercase, 1 lowercase, 1 number | "Password must be at least 8 characters with uppercase, lowercase, and a number" |
| `phone` | Optional, BD format `+8801XXXXXXXXX` or `01XXXXXXXXX` | "Invalid Bangladeshi phone number" |

#### Product Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `name` | Required, 2–200 chars | "Product name is required" |
| `description` | Required, min 10 chars | "Description must be at least 10 characters" |
| `price` | Required, number, min 1 (BDT integer) | "Price must be a positive number" |
| `oldPrice` | Optional, must be > price if provided | "Old price must be greater than current price" |
| `images` | Array, min 1 item, valid URL/path | "At least one image is required" |
| `category` | Required, must be valid ProductCategorySlug | "Invalid category" |
| `stock` | Required, integer, min 0 | "Stock must be 0 or greater" |
| `sizes` | Optional array of strings | — |

#### Order Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `items` | Required, non-empty array | "Cart is empty" |
| `items[].productId` | Must exist and be active | "Product not found: {id}" |
| `items[].size` | Must be in product.sizes if product has sizes | "Size {size} not available for {name}" |
| `items[].quantity` | Integer, min 1, ≤ product.stock | "Only {stock} units of {name} available" |
| `shipping.method` | Required, one of shipping zones | "Invalid shipping method" |
| `shipping.address.*` | All required fields present | "Shipping address is incomplete" |
| `paymentMethod` | Required, `sslcommerz` or `cod` | "Invalid payment method" |

#### Address Validation

| Field | Rule |
|-------|------|
| `firstName`, `lastName` | Required, 1–50 chars |
| `street` | Required, 5–200 chars |
| `city` | Required, 2–50 chars |
| `postalCode` | Required, BD postal code format (4 digits) |
| `phone` | Required, BD phone format |

### 5.2 Edge Cases to Handle

#### Cart & Inventory

| # | Edge Case | Handling |
|---|-----------|----------|
| 1 | Product goes out of stock while in cart | Return `stock: 0` in cart response; block checkout with message "Some items are no longer available" |
| 2 | Stock reduced below cart quantity | Return available stock; prompt user to update quantity |
| 3 | Adding same product + same size twice | Increment quantity instead of adding duplicate (matches frontend `addToCart` logic) |
| 4 | Adding same product + different size | Add as separate line item (keyed by `productId + size`) |
| 5 | Quantity updated to 0 | Remove item from cart |
| 6 | Cart total exceeds reasonable limit | Cap at 99 items per product |
| 7 | Guest cart merge on login | Merge localStorage cart with server cart; server cart takes precedence on conflict |

#### Checkout & Orders

| # | Edge Case | Handling |
|---|-----------|----------|
| 8 | Checkout with empty cart | Return 400: "Cannot place an order with an empty cart" |
| 9 | Price changed between cart add and checkout | Re-fetch live prices server-side; never trust client-sent prices |
| 10 | Concurrent orders depleting stock | Use atomic `findOneAndUpdate` with `$inc: { stock: -qty }` and condition `stock >= qty`; rollback on failure |
| 11 | SSLCOMMERZ payment timeout | Mark payment as FAILED after 10 min; allow retry |
| 12 | SSLCOMMERZ webhook arrives before redirect | Use idempotency key (orderNumber); process webhook only once |
| 13 | Duplicate order submission (double-click) | Idempotency token on checkout; reject duplicate within 5 min window |
| 14 | COD for high-value orders | Optional: disable COD above threshold (e.g., ৳50,000) |
| 15 | Shipping address outside Bangladesh | Reject; service is BD-only |
| 16 | Order cancellation after shipment | Only allow cancellation if status is "Processing" |

#### Authentication

| # | Edge Case | Handling |
|---|-----------|----------|
| 17 | Login with unverified email | Allow login but flag `isEmailVerified: false`; restrict checkout until verified |
| 18 | Too many login attempts | Rate limit: 5 attempts per 15 min per IP; lock account 30 min after 10 failures |
| 19 | Refresh token reuse (theft) | Detect reuse; invalidate entire token family; force re-login |
| 20 | Password reset token expiry | Token valid 1 hour only; single-use |
| 21 | Email already registered (register) | Return 409: "Email already registered" |
| 22 | Admin role escalation | Only existing ADMIN can promote; prevent self-promotion |

#### File Uploads (Product Images)

| # | Edge Case | Handling |
|---|-----------|----------|
| 23 | Invalid file type | Accept only `image/jpeg`, `image/png`, `image/webp`; reject others |
| 24 | File too large | Max 5 MB per image; reject with 413 |
| 25 | Malicious file | Validate magic bytes, not just extension; re-encode images |
| 26 | Too many images | Max 8 images per product |
| 27 | Upload fails mid-batch | Transactional: only persist product if all images uploaded |

#### Search

| # | Edge Case | Handling |
|---|-----------|----------|
| 28 | Empty query `?q=` | Return empty array, not error |
| 29 | Very long query | Truncate to 100 chars |
| 30 | No results | Return empty array with `meta.total: 0`; frontend shows "no results" state |
| 31 | Special characters in search | Escape regex / use text index; prevent ReDoS |

#### Pagination

| # | Edge Case | Handling |
|---|-----------|----------|
| 32 | Page beyond total | Return empty array with correct meta (not error) |
| 33 | Negative/huge page/limit | Clamp: page min 1, limit max 100 (default 12) |
| 34 | Invalid sort value | Default to "newest" |

#### General

| # | Edge Case | Handling |
|---|-----------|----------|
| 35 | MongoDB ObjectId format | Validate `:id` params match `/^[0-9a-fA-F]{24}$/`; return 400 "Invalid ID" |
| 36 | Rate limiting | Global: 100 req/min per IP; auth endpoints: stricter |
| 37 | CORS | Allow only frontend origin(s) from env |
| 38 | Unknown route | Return 404 with standard envelope |
| 39 | Server error | Never leak stack traces in production; return generic 500 message |
| 40 | Newsletter duplicate email | Return 200 with "Already subscribed" (don't expose existence) |

### 5.3 HTTP Status Code Reference

| Code | Usage |
|------|-------|
| `200 OK` | Successful GET, PATCH, DELETE |
| `201 Created` | Successful POST (create) |
| `204 No Content` | Successful DELETE (no body) |
| `400 Bad Request` | Validation error, malformed input |
| `401 Unauthorized` | Missing/invalid token |
| `403 Forbidden` | Valid token but insufficient permissions |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | Duplicate email, duplicate review |
| `422 Unprocessable Entity` | Validation passed but business rule failed (e.g., out of stock) |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected server error |

### 5.4 Environment Variables Required

```env
# Database
MONGODB_URI=mongodb://localhost:27017/voyage

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# SSLCOMMERZ
SSLCOMMERZ_STORE_ID=your-store-id
SSLCOMMERZ_STORE_PASSWORD=your-store-password
SSLCOMMERZ_API_BASE=https://sandbox.sslcommerz.com

# App
APP_BASE_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Email (for password reset / newsletter)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
```

---

## Summary

This blueprint defines **67 API endpoints** across 13 resource groups, **14 database collections**, a 3-tier access control model (Public / Authenticated / Admin), and **40 documented edge cases. The frontend currently has **zero real API calls** — all data is mock — so every endpoint here is new work.

**Recommended implementation order:**
1. Auth (register, login, me, JWT middleware) — unblocks all protected features
2. Products + Categories (read-only) — powers the storefront
3. Cart sync — connects localStorage to server
4. Orders + Checkout — the revenue path
5. Payments (SSLCOMMERZ integration) — completes checkout
6. Admin dashboard endpoints — management tools
7. Reviews, Wishlist, Newsletter, Search — secondary features
