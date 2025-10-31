const { DataTypes, Model } = require('sequelize'); // Use require
const sequelize = require('../config/database.js'); // Use require

class User extends Model {}

User.init({
    // Define the table columns (fields)
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true // Built-in validation for email format
        }
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    sequelize,                 // Pass the connection instance
    modelName: 'User',         // The name of the model in singular form
    tableName: 'users',        // The name of the table in the database
    timestamps: true           // Automatically adds createdAt and updatedAt
});

module.exports = User; // Use module.exports