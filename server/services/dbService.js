const connectDB = require('../config/db');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const Timetable = require('../models/Timetable');

const defaultResources = [
    { name: 'MC005', type: 'CLASSROOM', capacity: 60, features: 'Projector, ICT Enabled' },
    { name: 'MC213', type: 'CLASSROOM', capacity: 60, features: 'Projector, Wifi' },
    { name: 'MC210', type: 'CLASSROOM', capacity: 60, features: 'Projector, Wifi' },
    { name: 'LAB1', type: 'LAB', capacity: 30, features: 'High-end PCs, AC' },
    { name: 'LAB2', type: 'LAB', capacity: 30, features: 'High-end PCs, AC' },
    { name: 'LAB3', type: 'LAB', capacity: 30, features: 'High-end PCs, AC' },
    { name: 'LAB4', type: 'LAB', capacity: 30, features: 'High-end PCs, AC' },
    { name: 'IOT LAB', type: 'LAB', capacity: 25, features: 'Microcontrollers, Sensors, High-Speed Internet' },
    { name: 'MCA SEMINAR HALL', type: 'HALL', capacity: 150, features: 'Audio-Visual System, Stage, AC' }
];

const initDb = async (retries = 5) => {
    while (retries > 0) {
        try {
            await connectDB();

            // Seed default Admin accounts if not present
            const adminHash = '$2a$10$xMIZrtGIWnYefMeewDd72OIThbLH7a.DkVGlLBSvZwO2kyTKXi4D2'; // bcrypt hash for 'admin123'
            const adminUsers = ['admin', 'admin123'];

            for (const username of adminUsers) {
                const existing = await User.findOne({ username });
                if (!existing) {
                    await User.create({
                        username,
                        password_hash: adminHash,
                        full_name: username === 'admin' ? 'Administrator' : 'Admin User',
                        role: 'admin'
                    });
                    console.log(`Default admin account '${username}' created.`);
                } else {
                    existing.password_hash = adminHash;
                    await existing.save();
                }
            }

            // Seed default Resources if not present
            for (const res of defaultResources) {
                await Resource.findOneAndUpdate(
                    { name: res.name },
                    { $set: res },
                    { upsert: true, new: true }
                );
            }
            console.log('Database initialized with default campus resources.');
            return;
        } catch (err) {
            retries -= 1;
            console.error(`Error initializing database (${5 - retries}/5):`, err.message);
            if (retries === 0) {
                console.error('Final attempt failed. Exiting...');
                process.exit(1);
            }
            console.log('Retrying in 5 seconds...');
            await new Promise(res => setTimeout(res, 5000));
        }
    }
};

module.exports = { initDb, User, Resource, Booking, Timetable };
