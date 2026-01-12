const fs = require('fs');
const path = require('path');
const Song = require('../models/songModel');
const logger = require('../utils/logger');

/**
 * Seeds default songs into the database
 * Automatically discovers all .musicxml files in:
 *   - default-songs/learn/ (for Learning Mode)
 *   - default-songs/performance/ (for Performance Mode)
 */

/**
 * Extracts the song title from MusicXML content
 */
const getTitleFromMusicXML = (xmlContent) => {
    // Try <work-title> first
    let match = xmlContent.match(/<work-title>(.*?)<\/work-title>/);
    if (match) return match[1];

    // Try <movement-title> as fallback
    match = xmlContent.match(/<movement-title>(.*?)<\/movement-title>/);
    if (match) return match[1];

    return null;
};

/**
 * Extracts the artist/creator from MusicXML content
 */
const getArtistFromMusicXML = (xmlContent) => {
    const match = xmlContent.match(/<creator type="composer">(.*?)<\/creator>/);
    return match ? match[1] : null;
};

/**
 * Discovers all MusicXML files in a directory
 * @param {string} folderPath - Relative path from seeders folder
 * @param {boolean} isPerformanceMode - true for performance, false for learning
 */
const discoverSongsInFolder = (folderPath, isPerformanceMode) => {
    const fullPath = path.join(__dirname, folderPath);

    if (!fs.existsSync(fullPath)) {
        logger.warn(`Folder not found: ${fullPath}`);
        return [];
    }

    const files = fs.readdirSync(fullPath);
    const musicXmlFiles = files.filter(file =>
        file.toLowerCase().endsWith('.musicxml') || file.toLowerCase().endsWith('.xml')
    );

    logger.info(`Found ${musicXmlFiles.length} MusicXML file(s) in ${folderPath}`);

    return musicXmlFiles.map(filename => {
        const filePath = path.join(fullPath, filename);
        const xmlContent = fs.readFileSync(filePath, 'utf8');

        // Extract metadata from MusicXML
        let title = getTitleFromMusicXML(xmlContent);
        let artist = getArtistFromMusicXML(xmlContent);

        // Fallback to filename if no title found
        if (!title) {
            title = path.parse(filename).name
                .replace(/-/g, ' ')
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        return {
            title,
            artist: artist || 'Unknown',
            performance: isPerformanceMode,
            default: true,
            musicXml: xmlContent,
            filename // Keep track of source file
        };
    });
};

/**
 * Discovers all default songs by scanning folders
 */
const discoverAllSongs = () => {
    logger.info('🔍 Discovering MusicXML files...\n');

    const learningSongs = discoverSongsInFolder('default-songs/learn', false);
    const performanceSongs = discoverSongsInFolder('default-songs/performance', true);

    const allSongs = [...learningSongs, ...performanceSongs];

    logger.info(`\n📊 Discovery Summary:`);
    logger.info(`   🎓 Learning Mode: ${learningSongs.length} song(s)`);
    logger.info(`   🎸 Performance Mode: ${performanceSongs.length} song(s)`);
    logger.info(`   📁 Total: ${allSongs.length} song(s)\n`);

    return allSongs;
};

/**
 * Seeds default songs into the database
 * @param {boolean} force - If true, delete existing default songs before seeding
 */
const seedDefaultSongs = async (force = false) => {
    try {
        logger.info('Starting default songs seeding...\n');

        // Discover all songs from folders
        const discoveredSongs = discoverAllSongs();

        if (discoveredSongs.length === 0) {
            logger.warn('⚠️  No MusicXML files found in default-songs folders');
            logger.info('💡 Add .musicxml files to:');
            logger.info('   - seeders/default-songs/learn/ (for Learning Mode)');
            logger.info('   - seeders/default-songs/performance/ (for Performance Mode)\n');
            return;
        }

        if (force) {
            // Delete all existing default songs
            const deletedCount = await Song.destroy({ where: { default: true } });
            logger.info(`🗑️  Deleted ${deletedCount} existing default songs\n`);
        }

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const songData of discoveredSongs) {
            try {
                // Check if song already exists (by title)
                const existingSong = await Song.findOne({
                    where: {
                        title: songData.title,
                        default: true
                    }
                });

                if (existingSong && !force) {
                    logger.info(`⏭️  Skipping "${songData.title}" - already exists`);
                    skipCount++;
                    continue;
                }

                // Create the song
                await Song.create({
                    title: songData.title,
                    artist: songData.artist,
                    performance: songData.performance,
                    default: songData.default,
                    musicXml: songData.musicXml,
                    user_id: null // Default songs don't belong to any user
                });

                logger.success(`✅ Seeded "${songData.title}"${songData.artist !== 'Unknown' ? ` by ${songData.artist}` : ''} (${songData.performance ? 'Performance' : 'Learning'} mode)`);
                successCount++;

            } catch (error) {
                logger.error(`❌ Error seeding "${songData.title}":`, error.message);
                errorCount++;
            }
        }

        logger.success(`\n📊 Seeding Summary:`);
        logger.info(`   ✅ Successfully seeded: ${successCount}`);
        logger.info(`   ⏭️  Skipped (already exist): ${skipCount}`);
        logger.info(`   ❌ Errors: ${errorCount}`);
        logger.success(`\n🎵 Default songs seeding complete!\n`);

    } catch (error) {
        logger.error('❌ Fatal error during seeding:', error);
        throw error;
    }
};

// If run directly (not imported)
if (require.main === module) {
    const sequelize = require('../config/database');

    // Check for --force flag
    const force = process.argv.includes('--force');

    if (force) {
        logger.warn('⚠️  Running with --force flag: existing default songs will be deleted');
    }

    sequelize.sync()
        .then(() => seedDefaultSongs(force))
        .then(() => {
            logger.success('Exiting...');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Seeding failed:', error);
            process.exit(1);
        });
}

module.exports = seedDefaultSongs;
