const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const countryModel = require('./models/countryModel');
const countryRoutes = require('./routes/countryRoutes');
const statusController = require('./controllers/statusController');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/countries', countryRoutes);
app.get('/status', statusController.getStatus);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Country API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler - FIXED: Use proper route handling
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        available_endpoints: {
            'POST /countries/refresh': 'Refresh countries data',
            'GET /countries': 'Get all countries (with filters: region, currency, sort)',
            'GET /countries/:name': 'Get specific country',
            'DELETE /countries/:name': 'Delete country',
            'GET /countries/image': 'Get summary image',
            'GET /status': 'Get API status',
            'GET /health': 'Health check'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Initialize and start server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.log('Starting without database connection');
        }

        // Ensure countries table exists
        await countryModel.createTable();

        // Start server
        app.listen(PORT, () => {
            console.log(`Country API Server running on port ${PORT}`);
            console.log(`API Documentation: http://localhost:${PORT}/health`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nServer terminated');
    process.exit(0);
});

// Start the server
startServer();