const Song = require('../models/songModel');
const logger = require('../utils/logger');
const sequelize = require('../config/database');

/**
 * Lists all default songs in the database
 * Useful for checking what's currently seeded
 */
const listDefaultSongs = async () => {
    try {
        logger.info('📋 Fetching default songs from database...\n');

        const defaultSongs = await Song.findAll({
            where: { default: true },
            attributes: ['id', 'title', 'artist', 'performance', 'default', 'createdAt'],
            order: [['performance', 'ASC'], ['title', 'ASC']]
        });

        if (defaultSongs.length === 0) {
            logger.warn('⚠️  No default songs found in database');
            logger.info('\n💡 Run "npm run seed" to add default songs\n');
            return;
        }

        // Group by mode
        const learningSongs = defaultSongs.filter(s => !s.performance);
        const performanceSongs = defaultSongs.filter(s => s.performance);

        logger.success(`📊 Found ${defaultSongs.length} default song(s):\n`);

        if (learningSongs.length > 0) {
            logger.info('🎓 LEARNING MODE:');
            learningSongs.forEach(song => {
                logger.info(`   [${song.id}] ${song.title}${song.artist ? ` - ${song.artist}` : ''}`);
            });
            logger.info('');
        }

        if (performanceSongs.length > 0) {
            logger.info('🎸 PERFORMANCE MODE:');
            performanceSongs.forEach(song => {
                logger.info(`   [${song.id}] ${song.title}${song.artist ? ` - ${song.artist}` : ''}`);
            });
            logger.info('');
        }

        logger.success('✅ All default songs listed\n');

    } catch (error) {
        logger.error('❌ Error fetching default songs:', error);
        throw error;
    }
};

// If run directly (not imported)
if (require.main === module) {
    sequelize.sync()
        .then(() => listDefaultSongs())
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            logger.error('Failed to list songs:', error);
            process.exit(1);
        });
}

module.exports = listDefaultSongs;
