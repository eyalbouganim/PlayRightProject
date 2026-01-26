# 🚀 Quick Start Guide

## How to Run the Seeding System

### ✅ Step 1: Restart Your Server

The database schema needs to update with the new `performance` and `default` fields.

```bash
cd /home/eyalb1380/PlayRightProject/node-server

# Stop your server if it's running (Ctrl+C)
# Then restart it:
npm run dev
```

**Expected output:**
```
✔️ All models were synchronized successfully.
Server running on http://localhost:3001
```

This automatically adds the new columns to your `songs` table.

---

### ✅ Step 2: Add Your MusicXML Files

Place your MusicXML files in the appropriate folders:

```bash
# For Learning Mode songs (simple practice pieces)
seeders/default-songs/learn/
  ├── example-simple-scale.musicxml  (already included!)
  ├── your-song-1.musicxml
  └── your-song-2.musicxml

# For Performance Mode songs (full pieces with grading)
seeders/default-songs/performance/
  ├── your-song-3.musicxml
  └── your-song-4.musicxml
```

**Note:** One example song is already included for testing!

---

### ✅ Step 3: Run the Seeder

```bash
# In a new terminal (keep the server running)
cd /home/eyalb1380/PlayRightProject/node-server

# Run the seeder
npm run seed
```

**Expected output:**
```
🔍 Discovering MusicXML files...

Found 1 MusicXML file(s) in default-songs/learn
Found 0 MusicXML file(s) in default-songs/performance

📊 Discovery Summary:
   🎓 Learning Mode: 1 song(s)
   🎸 Performance Mode: 0 song(s)
   📁 Total: 1 song(s)

✅ Seeded "Simple C Major Scale" by PlayRight (Learning mode)

📊 Seeding Summary:
   ✅ Successfully seeded: 1
   ⏭️  Skipped (already exist): 0
   ❌ Errors: 0

🎵 Default songs seeding complete!
```

---

### ✅ Step 4: Verify in Database (Optional)

```bash
# Connect to PostgreSQL
psql -U eyalb1380 -d playright_db

# View all default songs
SELECT id, title, artist, performance, "default" FROM songs WHERE "default" = true;
```

**Expected result:**
```
 id |         title          | artist    | performance | default
----+------------------------+-----------+-------------+---------
  1 | Simple C Major Scale   | PlayRight | f           | t
```

---

### ✅ Step 5: Check from Node.js Script

```bash
# List all default songs in a nice format
npm run seed:list
```

**Expected output:**
```
📋 Fetching default songs from database...

📊 Found 1 default song(s):

🎓 LEARNING MODE:
   [1] Simple C Major Scale - PlayRight

✅ All default songs listed
```

---

## 🎯 Common Commands

### Seed New Songs (Safe)
Adds new songs, skips existing ones:
```bash
npm run seed
```

### Force Re-seed All
Deletes and recreates ALL default songs:
```bash
npm run seed:force
```
⚠️ **Warning:** This deletes existing default songs!

### List Default Songs
Shows what's currently in the database:
```bash
npm run seed:list
```

---

## 📝 Adding More Songs

### Method 1: Simple Copy-Paste
1. Copy your `.musicxml` file to the appropriate folder
2. Run `npm run seed`
3. Done! ✅

### Method 2: Organized with Metadata
For best results, ensure your MusicXML files contain:

```xml
<work>
    <work-title>Your Song Title</work-title>
</work>
<identification>
    <creator type="composer">Artist Name</creator>
</identification>
```

If not present, the seeder will use the filename as the title.

---

## 🔥 Example: Adding 3 New Songs

```bash
# 1. Copy your files
cp ~/my-songs/twinkle-twinkle.musicxml \
   /home/eyalb1380/PlayRightProject/node-server/seeders/default-songs/learn/

cp ~/my-songs/mary-little-lamb.musicxml \
   /home/eyalb1380/PlayRightProject/node-server/seeders/default-songs/learn/

cp ~/my-songs/ode-to-joy.musicxml \
   /home/eyalb1380/PlayRightProject/node-server/seeders/default-songs/performance/

# 2. Run seeder
npm run seed

# 3. Check result
npm run seed:list
```

**Output:**
```
📊 Found 3 default song(s):

🎓 LEARNING MODE:
   [1] Simple C Major Scale - PlayRight
   [2] Twinkle Twinkle Little Star - Traditional
   [3] Mary Had a Little Lamb - Traditional

🎸 PERFORMANCE MODE:
   [4] Ode to Joy - Ludwig van Beethoven
```

---

## ❓ FAQ

### Q: Do I need to edit any code?
**A:** No! Just drop `.musicxml` files in the folders and run `npm run seed`.

### Q: What if I already ran the seeder?
**A:** Running `npm run seed` again is safe. It will skip existing songs and only add new ones.

### Q: How do I update an existing song?
**A:** Run `npm run seed:force` to delete and re-create all default songs from the files.

### Q: Can users see default songs?
**A:** Yes! All users can see default songs. They cannot edit or delete them.

### Q: Can users upload their own songs?
**A:** Yes! User-uploaded songs are private (`default: false`) and only visible to them.

---

## 🎉 That's It!

You now have a fully automatic seeding system. Just drop MusicXML files in the folders and run `npm run seed`!

**Next Steps:**
1. Test with the included example song
2. Add your own MusicXML files
3. Build your React frontend to display the songs
4. Enjoy! 🎵
