<div align="center">

# 🎵 PlayRight

**Intelligent Music Practice Platform with Real-Time Performance Analysis**

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

*Transform your music practice with AI-powered feedback and interactive sheet music*

[Features](#-features) • [Demo](#-screenshots) • [Technology](#-technology-stack) • [Getting Started](#-getting-started) • [Documentation](#-documentation)

</div>

---

## 📖 About

**PlayRight** is an advanced web application that revolutionizes music practice by providing instant, intelligent feedback on your performance. Using cutting-edge audio analysis and AI technology, PlayRight helps musicians of all levels improve their pitch accuracy, timing precision, and overall musicality.

Whether you're learning scales, practicing challenging pieces, or preparing for performances, PlayRight gives you the insights and feedback you need to practice more effectively and improve faster.

---

## 🎯 Key Highlights

- 🎼 **Interactive Sheet Music** - Practice with real-time note highlighting and cursor tracking
- 🎤 **Accurate Audio Analysis** - Advanced A2SA (Audio-to-Score Alignment) engine for precise note detection
- 🤖 **AI-Powered Feedback** - Personalized performance insights powered by Gemini 2.5 Flash
- 📊 **Detailed Analytics** - Track your progress with comprehensive performance statistics
- 🎯 **Dual Practice Modes** - Performance mode with grading or Learn mode for stress-free practice
- 📚 **Song Library** - Built-in default songs and support for custom MusicXML uploads
- 🔒 **Secure & Personal** - JWT authentication with user-specific data and progress tracking

---

## ✨ Features

### 🎼 Practice Modes

#### **Performance Mode**
- Record your performance with countdown timer
- Real-time metronome with adjustable tempo and volume
- Detailed grading system analyzing pitch and timing
- Visual feedback with color-coded note quality (Perfect/Good/Imprecise/Missed)
- Playback your recording to review performance

#### **Learn Mode**
- Practice at your own pace without time pressure
- No grading or scoring - focus on learning
- Interactive sheet music that follows your playing
- Ideal for beginners and learning new pieces

### 📊 Performance Analysis

- **Comprehensive Scoring**: Overall grade based on pitch accuracy (70%) and timing accuracy (30%)
- **Visual Note Graph**: Color-coded timeline showing every note played with quality indicators
- **Timing Analysis**: Identifies notes played too early or too late with millisecond precision
- **AI Feedback**: Intelligent, personalized tips based on your specific mistakes:
  - Identifies patterns in your playing (rushing, hesitation, missed notes)
  - Provides actionable practice recommendations
  - Encourages progress and highlights achievements

### 📈 Statistics Dashboard

- Track performance history across all songs
- Filter by song, score range, and date
- View trends in pitch and timing accuracy
- Access AI feedback for any past performance
- Identify your strengths and areas for improvement

### 🎵 Music Library

- **Default Songs**: Curated collection of scales and exercises across different keys and ranges
- **Custom Uploads**: Support for MusicXML format files
- **Smart Organization**: Separate libraries for Performance and Learn modes
- **Song Management**: Upload, organize, and manage your personal song collection

### 🎨 Modern User Interface

- Clean, professional design with Material-UI components
- Responsive layout for desktop and tablet devices
- Intuitive navigation with global menu bar
- Smooth animations and transitions
- Production-level polish and attention to detail

---

## 📸 Screenshots

<!-- Add your screenshots here -->

### Home Dashboard
*[Screenshot placeholder: Main dashboard with navigation and welcome screen]*

### Performance Mode
*[Screenshot placeholder: Recording interface with sheet music display]*

### Analysis Results
*[Screenshot placeholder: Performance analysis dialog with note graph and AI feedback]*

### Statistics Dashboard
*[Screenshot placeholder: Performance history table with filters and metrics]*

### Learn Mode
*[Screenshot placeholder: Practice interface without grading]*

---

## 🚀 Technology Stack

PlayRight leverages modern technologies to deliver a robust, scalable, and performant application.

### Frontend (`my-app`)
- **React 18** - Component-based UI framework
- **Material-UI v5** - Comprehensive React UI library
- **React Router v6** - Client-side routing
- **OpenSheetMusicDisplay** - Professional sheet music rendering
- **Web Audio API** - Audio recording and processing

### Backend (`node-server`)
- **Node.js 18+** - JavaScript runtime
- **Express.js** - Web application framework
- **PostgreSQL** - Relational database
- **Sequelize** - Modern ORM for SQL databases
- **JWT** - Secure authentication tokens
- **Multer** - File upload handling
- **Winston** - Professional logging

### AI & Analysis (`brain-server`)
- **Python 3.9+** - Analysis engine runtime
- **A2SA (Audio-to-Score Alignment)** - Custom audio analysis algorithm
- **music21** - Music notation and analysis toolkit
- **pretty_midi** - MIDI file processing
- **Google Vertex AI** - Gemini 2.5 Flash for AI feedback generation
- **NumPy** - Numerical computing

### DevOps & Tools
- **Git** - Version control
- **npm** - Package management
- **ESLint** - Code quality
- **dotenv** - Environment configuration

---

## 📂 Project Structure

```
PlayRightProject/
├── my-app/                          # React Frontend
│   ├── public/                      # Static assets
│   └── src/
│       ├── Pages/                   # Page components
│       │   ├── Recording/           # Performance mode
│       │   ├── Learn/               # Learn mode
│       │   ├── Statistics/          # Analytics dashboard
│       │   ├── TopMenu/             # Navigation bar
│       │   └── ...
│       ├── hooks/                   # Custom React hooks
│       ├── utils/                   # Utility functions
│       └── App.js                   # Root component
│
├── node-server/                     # Node.js Backend
│   ├── controllers/                 # Request handlers
│   │   ├── A2SAController.js       # Audio analysis endpoint
│   │   ├── performancesController.js
│   │   ├── songController.js
│   │   └── userController.js
│   ├── models/                      # Database models
│   │   ├── performanceModel.js
│   │   ├── songModel.js
│   │   └── userModel.js
│   ├── routes/                      # API routes
│   ├── services/                    # Business logic
│   │   ├── aiFeedbackService.js    # Gemini AI integration
│   │   └── performancesService.js
│   ├── middleware/                  # Custom middleware
│   ├── utils/                       # Helper utilities
│   ├── seeders/                     # Database seeders
│   │   └── default-songs/           # MusicXML files
│   └── server.js                    # Entry point
│
└── brain-server/                    # Python Analysis Engine
    ├── A2SA/                        # Audio-to-Score Alignment
    │   └── python/
    │       └── align_eife.py        # Core alignment algorithm
    ├── venv/                        # Python virtual environment
    └── requirements.txt             # Python dependencies
```

---

## 🏁 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.x or higher) - [Download](https://nodejs.org/)
- **npm** (v9.x or higher) - Comes with Node.js
- **Python** (v3.9 or higher) - [Download](https://www.python.org/)
- **pip** (v21.x or higher) - Comes with Python
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/eyalbouganim/PlayRightProject.git
cd PlayRightProject
```

#### 2. Set Up PostgreSQL Database
```bash
# Create a new database
createdb playright_db

# Or using psql
psql -U postgres
CREATE DATABASE playright_db;
\q
```

#### 3. Configure Backend (`node-server`)
```bash
cd node-server
npm install
```

Create a `.env` file in the `node-server` directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=playright_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server Port
PORT=3001

# Google Cloud AI (for AI feedback)
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-central1
```

Run database migrations and seed default songs:
```bash
npm start
# The server will automatically sync models and seed default songs on first run
```

#### 4. Set Up Analysis Engine (`brain-server`)
```bash
cd ../brain-server

# Create and activate virtual environment
python3 -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 5. Configure Frontend (`my-app`)
```bash
cd ../my-app
npm install
```

---

## 🎮 Running the Application

### Development Mode

You need to run both the backend and frontend servers:

#### Terminal 1 - Backend Server
```bash
cd node-server
npm start
# Server runs on http://localhost:3001
```

#### Terminal 2 - Frontend Server
```bash
cd my-app
npm start
# Application opens at http://localhost:3002
```

### First-Time Setup

1. Open your browser and navigate to `http://localhost:3002`
2. Click "Sign Up" to create a new account
3. After registration, log in with your credentials
4. You're ready to start practicing!

### Default Songs

The application comes with pre-loaded practice songs:
- Low C Major Scale
- High C Major Scale
- Low B Major Scale
- High E Minor Scale
- And more!

---

## 📚 Documentation

### API Endpoints

#### Authentication
- `POST /api/users/register` - Create new user account
- `POST /api/users/login` - Authenticate user
- `GET /api/users/profile` - Get user profile (requires auth)
- `PUT /api/users/change-password` - Update password (requires auth)

#### Songs
- `GET /api/songs` - Get all songs (supports `?mode=performance` or `?mode=learn`)
- `GET /api/songs/:id` - Get specific song with MusicXML
- `POST /api/songs/upload` - Upload new MusicXML file (requires auth)
- `DELETE /api/songs/:id` - Delete user's song (requires auth)

#### Performance Analysis
- `POST /api/a2sa/align` - Submit recording for analysis (requires auth)
- `GET /api/performances/stats/user` - Get user's performance history (requires auth)
- `GET /api/performances/:id/feedback` - Get AI feedback for specific performance (requires auth)

### Database Schema

#### Users
- `id` (Primary Key)
- `email` (Unique)
- `password_hash`
- `first_name`
- `last_name`
- `createdAt`, `updatedAt`

#### Songs
- `id` (Primary Key)
- `title`
- `artist`
- `musicXml` (TEXT)
- `performance` (Boolean - mode flag)
- `default` (Boolean - system vs user song)
- `user_id` (Foreign Key, nullable)
- `createdAt`, `updatedAt`

#### Performances
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `song_id` (Foreign Key)
- `overall_score` (INTEGER 0-100)
- `pitch_accuracy` (INTEGER 0-100)
- `timing_accuracy` (INTEGER 0-100)
- `detected_notes` (JSONB - full alignment data)
- `analysis_details` (TEXT)
- `audio_file_path` (TEXT)
- `createdAt`, `updatedAt`

---

## 🛠️ Development

### Code Style

- **Frontend**: ESLint with React best practices
- **Backend**: Node.js conventions, async/await patterns
- **Python**: PEP 8 style guide

### Git Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git add .
git commit -m "feat: add new feature"

# Push to your branch
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

### Commit Message Convention

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` file for more information.

---

## 👨‍💻 Authors

**Eyal Bouganim**
- GitHub: [@eyalbouganim](https://github.com/eyalbouganim)
- Email: eyalbouganim@example.com

---

## 🙏 Acknowledgments

- [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/) - Sheet music rendering
- [Material-UI](https://mui.com/) - React UI framework
- [music21](http://web.mit.edu/music21/) - Music analysis toolkit
- [Google Vertex AI](https://cloud.google.com/vertex-ai) - AI feedback generation
- All contributors and testers who helped improve PlayRight

---

## 🔮 Future Roadmap

- [ ] Mobile application (iOS/Android)
- [ ] Real-time collaborative practice sessions
- [ ] Expanded instrument support (guitar, woodwinds, brass)
- [ ] Video lessons and tutorials integration
- [ ] Practice challenges and achievements system
- [ ] Social features - share performances with friends
- [ ] Advanced analytics with machine learning insights
- [ ] MIDI keyboard support
- [ ] Export performance reports (PDF)
- [ ] Integration with music notation software

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/eyalbouganim/PlayRightProject/issues) page
2. Create a new issue with detailed information
3. Reach out via email: support@playright.com

---

<div align="center">

**Made with ❤️ for musicians everywhere**

⭐ Star this repository if you find it helpful!

</div>
