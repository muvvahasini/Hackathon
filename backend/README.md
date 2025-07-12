# GreenFarm Backend API

A comprehensive backend API for the GreenFarm sustainable farming community platform, built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Management**: Registration, authentication, and profile management for farmers and buyers
- **Product Management**: Farm product listings with detailed information and search capabilities
- **Order System**: Complete order lifecycle management with status tracking
- **Review System**: User feedback and rating system with verification
- **Real-time Messaging**: In-app messaging between buyers and farmers using Socket.io
- **Geospatial Search**: Location-based farm and product search
- **File Upload**: Image and file upload support for products and profiles
- **Security**: JWT authentication, rate limiting, and input validation

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **File Upload**: Multer

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/greenfarm
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user (farmer or buyer)

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "farmer",
  "phone": "+1234567890",
  "farmName": "Green Acres Farm",
  "farmDescription": "Organic vegetables and fruits",
  "location": {
    "address": "123 Farm Road",
    "city": "Farmville",
    "state": "CA",
    "zipCode": "12345",
    "coordinates": {
      "lat": 37.7749,
      "lng": -122.4194
    }
  }
}
```

#### POST `/api/auth/login`
Login user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### User Endpoints

#### GET `/api/users`
Get all users with filters

**Query Parameters:**
- `role`: Filter by role (farmer/buyer)
- `search`: Search by name, username, or farm name
- `location`: Filter by location (lat, lng, radius)
- `page`: Page number
- `limit`: Items per page

#### GET `/api/users/:id`
Get user profile by ID

#### PUT `/api/users/:id`
Update user profile

### Product Endpoints

#### GET `/api/products`
Get all products with filters

**Query Parameters:**
- `search`: Search products
- `category`: Filter by category
- `farmer`: Filter by farmer ID
- `minPrice/maxPrice`: Price range
- `certification`: Filter by certification
- `location`: Location-based search
- `page`: Page number
- `limit`: Items per page

#### POST `/api/products`
Create new product (farmers only)

**Request Body:**
```json
{
  "name": "Organic Tomatoes",
  "description": "Fresh organic tomatoes",
  "category": "vegetables",
  "price": {
    "amount": 3.99,
    "unit": "lb"
  },
  "quantity": {
    "available": 50,
    "unit": "lb"
  },
  "images": [
    {
      "url": "https://example.com/tomato.jpg",
      "caption": "Fresh tomatoes",
      "isPrimary": true
    }
  ],
  "certifications": ["organic", "local"],
  "growingMethod": "organic",
  "seasonality": "summer"
}
```

#### GET `/api/products/:id`
Get product details

#### PUT `/api/products/:id`
Update product (owner only)

#### DELETE `/api/products/:id`
Delete product (owner only)

### Order Endpoints

#### GET `/api/orders`
Get user orders

**Query Parameters:**
- `status`: Filter by order status
- `role`: Filter by user role (buyer/farmer)
- `page`: Page number
- `limit`: Items per page

#### POST `/api/orders`
Create new order (buyers only)

**Request Body:**
```json
{
  "items": [
    {
      "product": "product_id",
      "quantity": 5
    }
  ],
  "deliveryMethod": "pickup",
  "paymentMethod": "cash",
  "scheduledDate": "2024-01-15",
  "scheduledTime": "14:00",
  "notes": {
    "buyer": "Please pack carefully"
  }
}
```

#### PUT `/api/orders/:id/status`
Update order status (farmer only)

### Review Endpoints

#### GET `/api/reviews`
Get reviews with filters

#### POST `/api/reviews`
Create new review

**Request Body:**
```json
{
  "reviewedUser": "user_id",
  "order": "order_id",
  "rating": 5,
  "title": "Excellent quality",
  "comment": "Fresh and delicious produce",
  "categories": {
    "quality": 5,
    "communication": 4,
    "delivery": 5,
    "value": 4
  }
}
```

### Message Endpoints

#### GET `/api/messages/conversations`
Get user conversations

#### POST `/api/messages/conversations`
Create or find conversation

#### GET `/api/messages/conversations/:id/messages`
Get messages in conversation

#### POST `/api/messages/conversations/:id/messages`
Send message

**Request Body:**
```json
{
  "type": "text",
  "content": {
    "text": "Hello, I'm interested in your tomatoes"
  }
}
```

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Database Models

### User
- Basic profile information
- Role-based fields (farmer/buyer)
- Location data for geospatial queries
- Rating and verification status

### Product
- Product details and pricing
- Inventory management
- Image support
- Certification and growing methods
- Delivery options

### Order
- Order items and totals
- Status tracking
- Delivery/pickup information
- Payment details

### Review
- Rating and feedback
- Category-based ratings
- Verification system
- Helpful votes

### Message & Conversation
- Real-time messaging
- Conversation management
- Message types (text, image, file, order)
- Read receipts and notifications

## 🗄 Database Indexes

The application includes optimized indexes for:
- Geospatial queries on user and product locations
- User authentication and search
- Product search and filtering
- Order status and user queries
- Message and conversation queries

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet security headers
- Role-based access control

## 🚀 Deployment

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://your-mongodb-uri

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=https://your-frontend-domain.com

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### Production Deployment

1. Set `NODE_ENV=production`
2. Use a production MongoDB instance
3. Set strong JWT secret
4. Configure CORS for your frontend domain
5. Set up proper logging and monitoring

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 API Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    // Validation errors
  ]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository. 