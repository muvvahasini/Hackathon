const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/greenfarm');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Sample products data
const sampleProducts = [
    {
        name: 'Fresh Organic Tomatoes',
        description: 'Sweet and juicy organic tomatoes, freshly harvested from our sustainable farm. Perfect for salads, sauces, and sandwiches.',
        category: 'vegetables',
        subcategory: 'tomatoes',
        price: {
            amount: 3.50,
            unit: 'lb'
        },
        quantity: {
            available: 50,
            unit: 'lb'
        },
        images: [
            {
                url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
                caption: 'Fresh organic tomatoes',
                isPrimary: true
            }
        ],
        certifications: ['organic', 'local'],
        growingMethod: 'organic',
        seasonality: 'summer',
        isAvailable: true,
        isFeatured: true,
        minimumOrder: 1,
        maximumOrder: 20,
        deliveryOptions: {
            pickup: true,
            delivery: true,
            deliveryRadius: 25,
            deliveryFee: 5.00
        },
        tags: ['organic', 'fresh', 'local', 'sustainable'],
        rating: {
            average: 4.5,
            count: 12
        }
    },
    {
        name: 'Sweet Corn',
        description: 'Golden sweet corn, picked at peak freshness. Great for grilling, boiling, or adding to your favorite recipes.',
        category: 'vegetables',
        subcategory: 'corn',
        price: {
            amount: 2.00,
            unit: 'piece'
        },
        quantity: {
            available: 100,
            unit: 'piece'
        },
        images: [
            {
                url: 'https://images.unsplash.com/photo-1601593768797-9e5c5c3c0c0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
                caption: 'Fresh sweet corn',
                isPrimary: true
            }
        ],
        certifications: ['local'],
        growingMethod: 'traditional',
        seasonality: 'summer',
        isAvailable: true,
        isFeatured: false,
        minimumOrder: 6,
        maximumOrder: 50,
        deliveryOptions: {
            pickup: true,
            delivery: false
        },
        tags: ['sweet', 'fresh', 'local'],
        rating: {
            average: 4.2,
            count: 8
        }
    },
    {
        name: 'Organic Strawberries',
        description: 'Plump, red organic strawberries bursting with flavor. Perfect for desserts, smoothies, or eating fresh.',
        category: 'fruits',
        subcategory: 'berries',
        price: {
            amount: 4.50,
            unit: 'lb'
        },
        quantity: {
            available: 30,
            unit: 'lb'
        },
        images: [
            {
                url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
                caption: 'Organic strawberries',
                isPrimary: true
            }
        ],
        certifications: ['organic', 'local'],
        growingMethod: 'organic',
        seasonality: 'spring',
        isAvailable: true,
        isFeatured: true,
        minimumOrder: 1,
        maximumOrder: 15,
        deliveryOptions: {
            pickup: true,
            delivery: true,
            deliveryRadius: 20,
            deliveryFee: 3.00
        },
        tags: ['organic', 'sweet', 'fresh', 'local'],
        rating: {
            average: 4.8,
            count: 15
        }
    },
    {
        name: 'Fresh Basil',
        description: 'Aromatic fresh basil, perfect for Italian dishes, pesto, or garnishing your favorite meals.',
        category: 'herbs',
        subcategory: 'basil',
        price: {
            amount: 2.50,
            unit: 'bunch'
        },
        quantity: {
            available: 25,
            unit: 'bunch'
        },
        images: [
            {
                url: 'https://images.unsplash.com/photo-1618377382884-c6c0d21534e9?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
                caption: 'Fresh basil',
                isPrimary: true
            }
        ],
        certifications: ['organic'],
        growingMethod: 'organic',
        seasonality: 'year-round',
        isAvailable: true,
        isFeatured: false,
        minimumOrder: 1,
        maximumOrder: 20,
        deliveryOptions: {
            pickup: true,
            delivery: true,
            deliveryRadius: 15,
            deliveryFee: 2.00
        },
        tags: ['herbs', 'organic', 'fresh'],
        rating: {
            average: 4.3,
            count: 6
        }
    },
    {
        name: 'Farm Fresh Eggs',
        description: 'Large, brown eggs from free-range chickens. Rich in flavor and perfect for any recipe.',
        category: 'eggs',
        subcategory: 'chicken-eggs',
        price: {
            amount: 5.00,
            unit: 'dozen'
        },
        quantity: {
            available: 40,
            unit: 'dozen'
        },
        images: [
            {
                url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
                caption: 'Farm fresh eggs',
                isPrimary: true
            }
        ],
        certifications: ['local'],
        growingMethod: 'traditional',
        seasonality: 'year-round',
        isAvailable: true,
        isFeatured: true,
        minimumOrder: 1,
        maximumOrder: 10,
        deliveryOptions: {
            pickup: true,
            delivery: true,
            deliveryRadius: 30,
            deliveryFee: 4.00
        },
        tags: ['fresh', 'local', 'free-range'],
        rating: {
            average: 4.6,
            count: 18
        }
    }
];

// Seed function
const seedProducts = async () => {
    try {
        // Find a farmer user to assign products to
        const farmer = await User.findOne({ role: 'farmer' });

        if (!farmer) {
            console.log('No farmer found. Creating a sample farmer...');
            const sampleFarmer = new User({
                username: 'samplefarmer',
                email: 'farmer@greenfarm.com',
                password: 'Farmer123!',
                firstName: 'John',
                lastName: 'Farmer',
                role: 'farmer',
                phone: '+1234567890',
                bio: 'Experienced organic farmer with 10+ years of sustainable farming practices.',
                location: {
                    address: '123 Farm Road',
                    city: 'Farmville',
                    state: 'CA',
                    zipCode: '90210',
                    coordinates: { lat: 34.0522, lng: -118.2437 }
                }
            });
            await sampleFarmer.save();
            console.log('Sample farmer created');
        }

        const farmerUser = farmer || await User.findOne({ role: 'farmer' });

        // Clear existing products
        await Product.deleteMany({});
        console.log('Cleared existing products');

        // Add farmer ID to all products
        const productsWithFarmer = sampleProducts.map(product => ({
            ...product,
            farmer: farmerUser._id
        }));

        // Insert sample products
        const insertedProducts = await Product.insertMany(productsWithFarmer);
        console.log(`Successfully seeded ${insertedProducts.length} products`);

        // Display the created products
        insertedProducts.forEach(product => {
            console.log(`- ${product.name} ($${product.price.amount}/${product.price.unit})`);
        });

    } catch (error) {
        console.error('Error seeding products:', error);
    } finally {
        mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the seed function
connectDB().then(() => {
    seedProducts();
}); 