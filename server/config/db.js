const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Ensure public DNS resolvers (8.8.8.8, 1.1.1.1) are available for Atlas SRV lookups on Windows
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}


const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_cms';
        const conn = await mongoose.connect(mongoURI);
        console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        throw err;
    }
};

module.exports = connectDB;
