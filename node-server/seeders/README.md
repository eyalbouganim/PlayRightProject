# Database Seeders

This directory contains scripts for seeding initial data into the database.

## Default Songs Seeder

Seeds system-provided songs that are visible to all users.

### Directory Structure

```
seeders/
├── seedDefaultSongs.js          # Seeding script
├── default-songs/
│   ├── learn/                   # MusicXML files for Learning Mode
│   │   ├── twinkle-twinkle.musicxml
│   │   └── mary-little-lamb.musicxml
│   └── performance/             # MusicXML files for Performance Mode
│       ├── ode-to-joy.musicxml
│       └── canon-in-d.musicxml
└── README.md                    # This file
```

### Usage

#### Run the seeder (skip existing songs):
```bash
node seeders/seedDefaultSongs.js
```

#### Run with force (delete and re-seed all default songs):
```bash
node seeders/seedDefaultSongs.js --force
```

#### Add to package.json scripts:
```json
"scripts": {
  "seed": "node seeders/seedDefaultSongs.js",
  "seed:force": "node seeders/seedDefaultSongs.js --force"
}
```

Then run with:
```bash
npm run seed
npm run seed:force
```

### Adding New Default Songs

**It's automatic!** Just add your MusicXML files to the folders:

1. **For Learning Mode songs:**
   ```
   seeders/default-songs/learn/your-song.musicxml
   ```

2. **For Performance Mode songs:**
   ```
   seeders/default-songs/performance/your-song.musicxml
   ```

3. **Run the seeder:**
   ```bash
   npm run seed
   ```

The seeder will automatically:
- ✅ Discover all `.musicxml` files in both folders
- ✅ Extract title from `<work-title>` or `<movement-title>` tags
- ✅ Extract artist from `<creator type="composer">` tags
- ✅ Use filename as title if not found in XML
- ✅ Automatically set the correct mode based on folder

### Notes

- Default songs have `user_id: null` (not owned by any user)
- All users can see default songs
- Private user songs always have `default: false` and `performance: true`
- The seeder won't overwrite existing songs unless you use `--force`
