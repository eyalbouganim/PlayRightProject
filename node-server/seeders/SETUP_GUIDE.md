# Complete Setup Guide: Default Songs System

## 🎯 Overview

You now have a **seeding system** for default songs that's production-ready and modern. Here's what you can do:

### Current Setup
- ✅ **Seeding Script**: Automatically loads default songs into database
- ✅ **User Uploads**: Always set to `default: false, performance: true`
- ✅ **Database Schema**: Added `performance` and `default` fields
- ✅ **API Filtering**: Get songs by mode (`?mode=performance` or `?mode=learn`)

### Future Enhancement (When Needed)
- 🔄 **Admin Panel**: Build later for dynamic management

---

## 📋 Quick Start

### 1. Test the System (Right Now!)

```bash
cd /home/eyalb1380/PlayRightProject/node-server

# Run the seeder (includes one example song)
npm run seed
```

You should see:
```
✅ Seeded "Simple C Major Scale" (Learning mode)
📊 Seeding Summary:
   ✅ Successfully seeded: 1
```

### 2. Verify in Your Database

```bash
# Connect to PostgreSQL
psql -U eyalb1380 -d playright_db

# Query default songs
SELECT id, title, artist, performance, "default", user_id FROM songs WHERE "default" = true;
```

You should see the C Major Scale song with `default: true` and `user_id: null`.

---

## 🎵 Adding Your Own Default Songs

### Step 1: Get Your MusicXML Files

Place your MusicXML files in the appropriate folder:

```bash
# For Learning Mode songs (simple, practice pieces)
/home/eyalb1380/PlayRightProject/node-server/seeders/default-songs/learn/
  ├── your-song-1.musicxml
  ├── your-song-2.musicxml
  └── ...

# For Performance Mode songs (full pieces with grading)
/home/eyalb1380/PlayRightProject/node-server/seeders/default-songs/performance/
  ├── your-song-3.musicxml
  ├── your-song-4.musicxml
  └── ...
```

### Step 2: Edit the Seeder Configuration

Open: `/home/eyalb1380/PlayRightProject/node-server/seeders/seedDefaultSongs.js`

Add your songs to the `defaultSongs` array:

```javascript
const defaultSongs = [
    {
        title: 'Simple C Major Scale',
        artist: 'PlayRight',
        performance: false,  // false = Learning Mode
        default: true,
        musicXmlPath: 'default-songs/learn/example-simple-scale.musicxml'
    },
    {
        title: 'Twinkle Twinkle Little Star',
        artist: 'Traditional',
        performance: false,  // Learning Mode
        default: true,
        musicXmlPath: 'default-songs/learn/twinkle-twinkle.musicxml'
    },
    {
        title: 'Beethoven Symphony No. 5',
        artist: 'Ludwig van Beethoven',
        performance: true,   // true = Performance Mode
        default: true,
        musicXmlPath: 'default-songs/performance/beethoven-5th.musicxml'
    }
];
```

### Step 3: Run the Seeder

```bash
# Add new songs (won't touch existing ones)
npm run seed

# Or force re-seed all (deletes and re-creates all default songs)
npm run seed:force
```

---

## 🔄 When to Use Each Command

### `npm run seed` (Normal Mode)
- ✅ Adds new default songs
- ✅ Skips songs that already exist
- ✅ Safe to run multiple times
- **Use this most of the time**

### `npm run seed:force` (Force Mode)
- ⚠️ Deletes ALL existing default songs
- ⚠️ Re-creates them from scratch
- **Use only when:**
  - You updated a song's MusicXML content
  - You want to reset all default songs
  - You're testing/debugging

---

## 🌐 API Usage for Frontend

### Get All Accessible Songs (Default + User's Private)
```javascript
fetch('http://localhost:3001/api/songs', {
    headers: { 'Authorization': `Bearer ${token}` }
})
```

Returns: All default songs + user's own songs

### Filter by Mode

```javascript
// Get only Learning Mode songs
fetch('http://localhost:3001/api/songs?mode=learn', {
    headers: { 'Authorization': `Bearer ${token}` }
})

// Get only Performance Mode songs
fetch('http://localhost:3001/api/songs?mode=performance', {
    headers: { 'Authorization': `Bearer ${token}` }
})
```

### Response Format
```json
[
  {
    "id": 1,
    "title": "Simple C Major Scale",
    "artist": "PlayRight",
    "performance": false,
    "default": true,
    "createdAt": "2026-01-12T10:00:00.000Z"
  },
  {
    "id": 5,
    "title": "My Practice Song",
    "artist": null,
    "performance": true,
    "default": false,
    "createdAt": "2026-01-12T11:00:00.000Z"
  }
]
```

---

## 🔐 User Upload Behavior

When users upload their own songs:

```javascript
// Frontend upload (multipart/form-data)
const formData = new FormData();
formData.append('audioFile', musicXmlFile);
// Optional: specify mode (defaults to performance)
formData.append('performance', 'false'); // For learning mode

fetch('http://localhost:3001/api/songs/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
})
```

**Automatic Behavior:**
- `default: false` (always - users can't create default songs)
- `performance: true` (default, unless you pass `performance: false`)
- `user_id: <user's id>` (only they can see it)

---

## 🎓 Recommended Workflow

### Initial Setup (Now)
1. ✅ Restart your Node.js server (auto-updates database schema)
2. ✅ Run `npm run seed` (loads example song)
3. ✅ Test in your React app (should see the default song in library)

### Adding Songs (Ongoing)
1. Get MusicXML files for your default songs
2. Place them in `default-songs/learn/` or `default-songs/performance/`
3. Add entries to `seedDefaultSongs.js`
4. Run `npm run seed`
5. Test in your app

### Production Deployment
```bash
# On your production server
npm run seed  # After deploying code
```

---

## 🚀 Future: Admin Panel (Optional)

When you're ready to add an admin panel (later), you can:

### Backend: Add Admin Role
```javascript
// In userModel.js - add role field
role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
}

// In authMiddleware.js - add admin check
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
```

### Frontend: Admin Dashboard
- View all songs (default + user songs)
- Upload new default songs with UI
- Toggle `performance` mode
- Delete/edit default songs
- See usage statistics

### Benefits Over Seeding
- Non-technical admins can manage songs
- Dynamic updates without redeployment
- Better for frequent changes

### When to Build Admin Panel
- After MVP launch
- When you have multiple admins
- When default songs change frequently

---

## 📝 Summary

### ✅ What You Have Now
1. **Database fields** added (`performance`, `default`)
2. **Seeding system** with example song
3. **API filtering** by mode
4. **User uploads** correctly configured
5. **Production-ready** setup

### 🎯 What You Need to Do
1. **Restart server** (updates database schema)
2. **Run seeder**: `npm run seed`
3. **Add your songs** to `default-songs/` folders
4. **Update** `seedDefaultSongs.js` with song metadata
5. **Test** in React app

### 🔮 Future Enhancements
- Build admin panel when needed (later)
- Add more metadata (difficulty, genre, duration)
- Implement song ratings/favorites
- Add song preview/playback

---

## 🆘 Troubleshooting

### Seeder Error: "File not found"
- Check the `musicXmlPath` is correct
- Verify the file exists in `seeders/default-songs/`
- Path is relative to `seeders/` folder

### Song Not Showing in App
- Check if `default: true` in database
- Verify API call includes auth token
- Check frontend filters songs correctly

### Force Seed Not Working
- Ensure no foreign key constraints
- Check if performances reference the songs
- May need to delete performances first

---

## 📞 Need Help?

- Check logs: Server console shows seeding progress
- Database: `SELECT * FROM songs WHERE "default" = true;`
- API: Test with Postman/curl before frontend

---

**You're all set! Start with `npm run seed` and you'll have your first default song ready to go.**
