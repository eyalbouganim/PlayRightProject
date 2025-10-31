# PlayRight 🎵

**PlayRight** is a modern web application designed to help musicians practice their instruments more effectively. By providing real-time feedback on pitch and timing, it transforms standard practice sessions into interactive, goal-oriented exercises.

 <!-- Placeholder: Replace with a screenshot of your app -->

---

## ✨ Core Features

- **Real-Time Note Detection**: Utilizes the user's microphone to detect played notes in real-time.
- **Interactive Sheet Music**: Upload your own MusicXML files or practice with default songs. The application displays the sheet music and highlights the current note.
- **Live Performance Feedback**: Compares your playing against the sheet music, providing instant visual feedback on whether you played the correct or incorrect note.
- **Performance Analysis**: After a session, receive a detailed analysis of your performance, including pitch accuracy, timing accuracy, and an overall score.
- **User Authentication**: Secure user registration and login system using JWT (JSON Web Tokens).
- **Personalized Experience**: All practice sessions and uploaded songs are tied to your user account.
- **User Profile Management**: View your profile information and securely change your password.
- **Modern UI/UX**: A beautiful, responsive, and intuitive interface built with Material-UI, featuring a light blue gradient theme and "frosted glass" elements.

---

## 🚀 Technology Stack

PlayRight is a full-stack application built with a modern, decoupled architecture.

### Frontend (`my-app`)

- **Framework**: React
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router
- **Sheet Music Rendering**: OpenSheetMusicDisplay
- **State Management**: React Hooks (useState, useEffect, useContext)

### Backend (`node-server`)

- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-Time Communication**: WebSockets for audio streaming.
- **Database**: PostgreSQL
- **ORM**: Sequelize for database interaction and modeling.
- **Authentication**: JSON Web Tokens (JWT)

### Analysis Engine (`brain-server`)

- **Language**: Python
- **Core Task**: Handles the heavy lifting of audio processing and performance analysis.
- **Communication**: The Node.js backend spawns the Python scripts as child processes to perform analysis.

---

## 📂 Project Structure

The monorepo is organized into three main parts:

```
PlayRightProject/
├── my-app/            # The React frontend application
├── node-server/       # The Node.js/Express backend server
└── brain-server/      # The Python audio analysis engine
```

---

## 🏁 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js & npm
- Python & pip
- PostgreSQL

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/PlayRightProject.git
    cd PlayRightProject
    ```

2.  **Set up the Backend (`node-server`):**
    ```sh
    cd node-server
    npm install
    ```
    - Create a `.env` file based on `.env.example` (if applicable) and configure your database connection and JWT secret.
    - Run database migrations/sync:
    ```sh
    node server.js 
    ``` 
    (The server will sync models on startup)

3.  **Set up the Analysis Engine (`brain-server`):**
    ```sh
    cd ../brain-server
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    pip install -r requirements.txt
    ```

4.  **Set up the Frontend (`my-app`):**
    ```sh
    cd ../my-app
    npm install
    ```

### Running the Application

1.  Start the backend server from the `node-server` directory:
    ```sh
    npm start
    ```
2.  Start the frontend development server from the `my-app` directory:
    ```sh
    npm start
    ```

Open http://localhost:3002 (or your configured port) to view the application in your browser.
