# Detailed Technical Design

This document outlines the granular, highly engineered implementation details for the project, including the database schemas, API architecture, code organization, and UI structure.

---

## 1. Monorepo Folder Structure

The project utilizes a strict, professional folder structure enforcing the Clean Architecture pattern in the backend and a component-driven approach in the frontend.

```text
/
├── .github/                # CI/CD workflows
├── backend/                # Node.js / Express / Socket.io Backend
│   ├── src/
│   │   ├── config/         # Environment variables, database connection
│   │   ├── controllers/    # API Route handlers (Request/Response logic)
│   │   ├── middlewares/    # Auth guards, error handlers, input validation
│   │   ├── models/         # Mongoose Database Schemas
│   │   ├── routes/         # Express Route definitions
│   │   ├── services/       # Core business logic (Rclone management, etc.)
│   │   ├── sockets/        # Socket.io event handlers (Real-time logic)
│   │   ├── types/          # TypeScript interface definitions
│   │   ├── utils/          # Helper functions (Loggers, formatters)
│   │   └── app.ts          # Main Express application setup
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # React / Vite Frontend
│   ├── src/
│   │   ├── assets/         # Images, global CSS
│   │   ├── components/     # Reusable UI parts (shadcn/ui, custom buttons)
│   │   │   ├── common/     # Buttons, inputs, modals
│   │   │   └── layout/     # Sidebar, Header
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries (Axios instances, utils)
│   │   ├── pages/          # Full page views (Dashboard, Login, Settings)
│   │   ├── router/         # React Router configuration
│   │   ├── store/          # Zustand global state stores
│   │   ├── types/          # TypeScript interfaces (Shared with backend via monorepo logic)
│   │   └── App.tsx         # Root component
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── shared/                 # (Optional future phase) Shared TS Types
├── package.json            # Root workspace configuration
└── docker-compose.yml      # Local development orchestrator
```

---

## 2. Database Schema (MongoDB / Mongoose)

The schema design is highly normalized for a multi-tenant environment, ensuring absolute data isolation between users.

### A. User Schema (`User`)
Stores authentication data and basic profile information.
*   `_id`: ObjectId
*   `email`: String (Unique, Indexed)
*   `passwordHash`: String (Bcrypt encrypted)
*   `role`: Enum (`ADMIN`, `USER`)
*   `createdAt`: Timestamp
*   `updatedAt`: Timestamp

### B. Cloud Provider Configuration Schema (`RemoteConfig`)
Securely stores the configuration needed for `rclone` to connect to a user's cloud drive.
*   `_id`: ObjectId
*   `userId`: ObjectId (Ref -> User, Indexed for fast lookup)
*   `remoteName`: String (e.g., "my_personal_gdrive")
*   `providerType`: Enum (`GDRIVE`, `S3`, `DROPBOX`, `ONEDRIVE`, etc.)
*   `encryptedConfig`: String (The raw rclone config data, strongly encrypted at rest via AES-256-GCM before saving to MongoDB)
*   `isActive`: Boolean
*   `createdAt`: Timestamp

---

## 3. API Endpoints Architecture (REST)

While WebSockets handle real-time streaming, REST endpoints handle persistent state mutations.

### Authentication (`/api/v1/auth`)
*   `POST /register`: Accepts email/password, creates `User`, returns JWT.
*   `POST /login`: Verifies credentials, returns JWT.
*   `GET /me`: Returns the current authenticated user's profile.

### Remote Management (`/api/v1/remotes`)
*   `GET /`: List all `RemoteConfig` items belonging to the authenticated user.
*   `POST /`: Create a new remote connection (encrypts and saves credentials).
*   `DELETE /:id`: Delete a specific remote connection.
*   `POST /:id/test`: Instruct the backend to perform a quick `rclone` connection test to verify the credentials.

---

## 4. WebSocket Architecture (Real-Time Communication)

The Socket.io connection is authenticated via JWT upon connection.

### Namespaces / Channels
*   `Namespace: /files`
    *   **Client Emits:** `request_directory_list` (Payload: `{ remoteName: "my_s3", path: "/images" }`)
    *   **Server Emits:** `directory_list_response` (Payload: JSON array of files from rclone)
    *   **Client Emits:** `start_transfer` (Payload: source path, destination path)
    *   **Server Emits:** `transfer_progress` (Payload: `{ percentage: 45, speed: "2MB/s" }`) - *Highly engineered real-time feature.*

---

## 5. UI Layout / Wireframes

The frontend will utilize Tailwind CSS and `shadcn/ui` to build a clean, modern, enterprise-grade interface.

### Main Dashboard (File Explorer)

*   **Left Sidebar (Navigation)**
    *   Logo/Brand.
    *   List of configured Cloud Remotes (e.g., "Personal GDrive", "Work S3").
    *   "Add New Remote" button.
    *   Settings & Profile links at the bottom.
*   **Top Header (Context)**
    *   Breadcrumb navigation (e.g., `my_s3 / backups / 2024`).
    *   Global Search Bar.
    *   Action Buttons: "Upload", "New Folder", "Refresh".
*   **Main Content Area (Data Grid)**
    *   A high-performance data table displaying the contents of the current directory.
    *   Columns: Icon (File/Folder), Name, Size, Modified Date.
    *   Context Menu (Right-click): Download, Delete, Rename, Move.
*   **Bottom Right (Overlay)**
    *   Transfer Manager Queue: A small hovering window showing live progress bars for active uploads/downloads, powered by WebSockets.