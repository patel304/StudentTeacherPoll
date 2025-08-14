
# Polling App - Frontend

## Overview
This project is a real-time polling system that allows teachers to create live polls and students to participate in them. The frontend is built with **React** (using Vite as the build tool). **Socket.IO** is used for real-time communication between the server and clients.

## Features
- **Teacher Features**:
  - Create polls with options and set a timer for voting.
  - View real-time results as students vote.
  - View poll history.
  - Kick students out of the room.

- **Student Features**:
  - Join a poll room created by a teacher.
  - Vote in real-time on polls.
  - Redirect to a "kicked out" page if removed by the teacher.

## Tech Stack
- **React** (with Vite for fast development)
- **Socket.IO** (for real-time communication)
- **Bootstrap** (for styling)
- **Session Storage** (for session management)

---

## Frontend Setup

### Prerequisites
Make sure you have the following installed:
- Node.js (developed with 22.5.1)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/saran-mani/intervue-poll-frontend.git
   cd intervue-poll-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Running the Application

1. The frontend will be available at:
   ```
   http://localhost:5173/
   ```

---

## Backend Setup (Node.js + Express + Socket.IO)

The backend lives under `server/` and provides REST endpoints and Socket.IO events used by the frontend.

### Install backend dependencies
```bash
cd server
npm install
```

### Run backend in development
```bash
npm run dev
```
This starts the API and Socket.IO server on `http://localhost:3000`.

### Available REST endpoints
- `POST /teacher-login` → returns `{ username: "teacher_xxxxx" }`
- `GET /polls/:username` → returns `{ data: Poll[] }` with historical polls for that teacher
- `GET /health` → returns server health `{ ok: true }`

### Socket.IO events
- Client → Server: `joinChat` `{ username }`
- Client → Server: `chatMessage` `{ user, text }`
- Client → Server: `kickOut` `username`
- Client → Server: `createPoll` `{ question, options[{id,text,correct}], timer, teacherUsername }`
- Client → Server: `submitAnswer` `{ username, option: text, pollId }`
- Server → Clients: `participantsUpdate` `[username]`
- Server → Clients: `chatMessage` `{ user, text }`
- Server → Clients: `kickedOut`
- Server → Clients: `pollCreated` `{ _id, question, options[{id,text,correct}], timer }`
- Server → Clients: `pollResults` `{ [optionText]: voteCount }`

### Notes
- Data is stored in-memory for simplicity and resets on server restart.
- Frontend uses `VITE_API_BASE_URL` and defaults to `http://localhost:3000` during development.
