const { Sequelize } = require('sequelize'); // Use require

const dbName = 'playright_db';
const dbUser = 'eyalb1380';
const dbPassword = '123456'; // Make sure you use dbPassword here
const dbHost = 'localhost';

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    dialect: 'postgres' // Tell Sequelize we're using PostgreSQL
});

// Test the connection
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection to PostgreSQL has been established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
    }
})();

module.exports = sequelize; // Use module.exports