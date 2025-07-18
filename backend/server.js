const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');


// Load environment variables
dotenv.config();

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const farmsUploadsDir = path.join(uploadsDir, 'farms');
const cropsUploadsDir = path.join(uploadsDir, 'crops');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(farmsUploadsDir)) {
    fs.mkdirSync(farmsUploadsDir, { recursive: true });
}
if (!fs.existsSync(cropsUploadsDir)) {
    fs.mkdirSync(cropsUploadsDir, { recursive: true });
}

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const messageRoutes = require('./routes/messages');
const farmRoutes = require('./routes/farms');
const transactionRoutes = require('./routes/transactions');
const paypalRoutes = require('./routes/paypal');
const phonepeRoutes = require('./routes/phonepe');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { auth } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/greenfarm');

        console.log(`Connected to MongoDB: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Connect to database
connectDB();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their personal room
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
    });

    // Handle private messages
    socket.on('private_message', (data) => {
        io.to(`user_${data.recipientId}`).emit('new_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', auth, userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', auth, orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', auth, messageRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/phonepe', phonepeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'GreenFarm API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`GreenFarm server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 