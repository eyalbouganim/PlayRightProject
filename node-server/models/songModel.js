const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database.js');
const User = require('./userModel.js'); // Import User model for association

class Song extends Model {}

Song.init({
    // Define the table columns (fields)
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    artist: {
        type: DataTypes.STRING,
        allowNull: true // Artist can be optional
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Can be null for system-provided songs
        references: {
            model: 'users', // This can be the model name or table name
            key: 'id'
        }
    },
    musicXml: {
        type: DataTypes.TEXT, // To store the MusicXML content
        allowNull: true // A song might exist without sheet music initially
    },
    performance: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true // Default to performance mode for backward compatibility
    },
    default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false // Default to private song (not a system-provided song)
    }
}, {
    sequelize,                 // Pass the connection instance
    modelName: 'Song',         // The name of the model in singular form
    tableName: 'songs',        // The name of the table in the database
    timestamps: true           // Automatically adds createdAt and updatedAt
});

// Define the association
// A User can create/upload many Songs
User.hasMany(Song, {
    foreignKey: 'user_id',
    as: 'createdSongs'
});
Song.belongsTo(User, {
    foreignKey: 'user_id'
});

module.exports = Song;
