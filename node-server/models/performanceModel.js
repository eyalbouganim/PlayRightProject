const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database.js');
const User = require('./userModel.js');
const Song = require('./songModel.js');

class Performance extends Model {}

Performance.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    song_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'songs',
            key: 'id'
        }
    },
    overall_score: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    pitch_accuracy: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    timing_accuracy: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    detected_notes: {
        type: DataTypes.JSONB, // Store the array of detected notes from the performance
        allowNull: true
    },
    analysis_details: {
        type: DataTypes.JSONB, // Store the detailed comparison results
        allowNull: true
    },
    audio_file_path: {
        type: DataTypes.STRING,
        allowNull: true // Path to the saved audio file
    }
}, {
    sequelize,
    modelName: 'Performance',
    tableName: 'performances',
    timestamps: true // Adds createdAt and updatedAt
});

// --- Associations ---

// A Performance belongs to one User
Performance.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Performance, { foreignKey: 'user_id' });

// A Performance is for one Song
Performance.belongsTo(Song, { foreignKey: 'song_id', as: 'song' });
Song.hasMany(Performance, { foreignKey: 'song_id' });


module.exports = Performance;