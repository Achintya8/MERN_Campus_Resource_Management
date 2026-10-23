# Campus Resource Management System (MERN Stack)

A complete **MERN Stack** (MongoDB, Express, React, Node.js) web application for managing campus classrooms, computer labs, and seminar halls.

---

## 🛠️ Tech Stack
* **M**ongoDB & Mongoose: Document-based database with schemas for Users, Resources, Bookings, and Timetables.
* **E**xpress.js: RESTful backend API handling authentication, conflict checking, scheduling, timetable uploads, and metrics.
* **R**eact: Modern interactive frontend built with Vite and Tailwind CSS.
* **N**ode.js: Runtime environment powering the backend server.

---

## 📁 Project Structure

```text
MERN- Campus_Resource_Mngt/
├── client/                     # React (Vite) Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI elements (Navbar, BookingModal, etc.)
│   │   ├── pages/             # Dashboard, Bookings, Resources, Admin, Profile, Login, Register
│   │   ├── services/          # Axios API layer
│   │   └── context/           # AuthContext
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Node.js + Express + Mongoose Backend
│   ├── config/                # MongoDB connection setup
│   ├── models/                # Mongoose Models (User, Resource, Booking, Timetable)
│   ├── controllers/           # Business logic & conflict detection
│   ├── middleware/            # JWT authentication, role check, multer
│   ├── routes/                # API routes (/api/auth, /api/bookings, etc.)
│   ├── services/              # Auto-seeding database service
│   ├── .env                   # Environment configuration
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── docker-compose.yml          # Optional: Run MongoDB via Docker
├── package.json                # Root scripts to run both client and server
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** (v18 or higher)
* **MongoDB**:
  * Either run locally via MongoDB Community Server or MongoDB Compass
  * Or start Docker (`docker-compose up -d`)
  * Or connect to a free MongoDB Atlas cloud cluster

### 2. Configure Environment (`server/.env`)
By default, the backend connects to your local MongoDB:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/campus_cms
JWT_SECRET=campus-resource-secret-key-2024
```
*(If you are using MongoDB Atlas, simply replace `MONGODB_URI` with your Atlas connection string).*

---

### 3. Install Dependencies
You can install dependencies for both client and server from the root directory:
```bash
npm run install:all
```
Or manually:
```bash
cd server && npm install
cd ../client && npm install
```

---

### 4. Running the Application

#### Option A: Run Backend Server
```bash
cd server
npm start
```
* The server will automatically connect to MongoDB.
* It **auto-seeds** default admin accounts and initial campus resources (`MC005`, `MC213`, `LAB1-4`, `IOT LAB`, `MCA SEMINAR HALL`) on its first launch.

#### Option B: Run Frontend Development Server
In a separate terminal:
```bash
cd client
npm run dev
```
* Open **`http://localhost:5173`** in your browser. All API requests are automatically proxied to `http://localhost:3000`.

---

## 🔑 Default Credentials

| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | Administrator | Full management & approval access |
| `admin123` | `admin123` | Administrator | Secondary Admin account |
| *(Register)* | *(Your choice)* | User | Faculty / Student registration |

---

## ✨ Features Preserved
* **User Authentication & Role Management**: JWT token-based auth with encrypted passwords (bcrypt) and protected routes.
* **Campus Resource Explorer**: Live status of classrooms, labs, seminar halls, capacities, and facilities.
* **Smart Booking Engine**: Prevents double-booking overlaps and validates against official campus hours (8:30 AM to 6:00 PM).
* **Booking Lifecycle**: `PENDING` -> `APPROVED` / `REJECTED`, early checkout release, and cancellation workflows.
* **Timetable Sync & Excel Import**: Bulk-schedule recurring semester timetables using `.xlsx` or `.csv` files.
* **Analytics & Utilization Reports**: Visual breakdown of room utilization hours and frequency.
