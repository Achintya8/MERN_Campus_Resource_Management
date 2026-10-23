const app = require('./app');
const { initDb } = require('./services/dbService');
require('dotenv').config();

const port = process.env.PORT || 3000;

// Initialize Database connection and auto-seed defaults
initDb().then(() => {
    app.listen(port, () => {
        console.log(`MERN Backend server running at http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Failed to initialize MongoDB database:', err);
    process.exit(1);
});
