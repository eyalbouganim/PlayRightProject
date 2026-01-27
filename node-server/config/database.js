const { Sequelize } = require('sequelize');

// Database configuration from environment variables
const dbName = process.env.DB_NAME || 'playright_db';
const dbUser = process.env.DB_USER || 'eyalb1380';
const dbPassword = process.env.DB_PASSWORD || '123456';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;

// Determine if we're connecting via Unix socket (Cloud SQL) or TCP
const isUnixSocket = dbHost.startsWith('/cloudsql/');

const sequelizeOptions = {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
};

if (isUnixSocket) {
    // Cloud SQL Unix socket connection
    sequelizeOptions.host = dbHost;
    sequelizeOptions.dialectOptions = {
        socketPath: dbHost
    };
} else {
    // Standard TCP connection (local development)
    sequelizeOptions.host = dbHost;
    sequelizeOptions.port = dbPort;
}

const sequelize = new Sequelize(dbName, dbUser, dbPassword, sequelizeOptions);

// Test the connection
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection to PostgreSQL has been established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
    }
})();

module.exports = sequelize;
