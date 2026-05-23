# Rclone Cloud Storage Browser - Architectural Blueprint

## 1. Introduction
This document outlines the architectural blueprint for the Rclone Cloud Storage Browser project. The system is designed as a highly engineered, professional, multi-tenant web application. It integrates deeply with `rclone rcd` (Daemon Mode) to provide real-time, high-performance cloud storage management via WebSockets, coupled with a robust REST API for configuration and user management.

## 2. Technology Stack
The project utilizes a modern, TypeScript-based monorepo approach.

### 2.1 Monorepo Structure
*   **Root:** Manages shared configuration, linting, and potentially Docker compose files.
*   `/frontend`: Isolated frontend application.
*   `/backend`: Isolated backend application.

### 2.2 Frontend (Client)
*   **Framework:** React (built with Vite)
*   **Language:** TypeScript
*   **UI/Styling:** Tailwind CSS combined with `shadcn/ui` for highly customizable, accessible, and professional enterprise-grade components.
*   **State Management:** Zustand (for global UI state).
*   **Data Fetching & Caching:** TanStack Query (React Query) for REST API interactions.
*   **Real-time Communication:** Socket.io-client.

### 2.3 Backend (Server)
*   **Framework:** Node.js with Express.js
*   **Language:** TypeScript
*   **Real-time Communication:** Socket.io (for WebSocket integration with frontend and polling/event handling from rclone).
*   **Core Integration:** `rclone` running in `rcd` (daemon) mode. The backend acts as a secure middleware/controller between the client and the rclone daemon.

### 2.4 Database
*   **Database:** MongoDB
*   **ODM:** Mongoose
*   **Purpose:** Storing user accounts, tenant configurations, rclone remote credentials (encrypted), and audit logs.

## 3. System Architecture

### 3.1 Clean Architecture Pattern (Backend)
The backend follows a Controller-Service-Repository pattern to ensure modularity, testability, and separation of concerns:
*   **Controllers (Presentation Layer):** Handle HTTP requests/WebSocket events, validate input, and send responses. They do not contain business logic.
*   **Services (Business Logic Layer):** Contain the core business rules. They orchestration data flow between controllers, repositories, and external services (like the rclone daemon).
*   **Repositories (Data Access Layer):** Abstraction over the database (MongoDB). They handle CRUD operations, keeping database logic out of the services.
*   **External Integrations:** Dedicated modules for interacting with `rclone rcd` via its HTTP/JSON API.

### 3.2 Communication Flow
1.  **Standard Operations (CRUD, Auth, Config):** Frontend -> REST API (Express) -> Backend Services -> MongoDB.
2.  **Real-time Operations (File Listing, Transfers):** Frontend -> WebSockets (Socket.io) -> Backend Services -> `rclone rcd` API -> Cloud Provider.

### 3.3 Security & Multi-tenancy
*   **Authentication:** JWT-based stateless authentication.
*   **Isolation:** The backend strictly isolates requests. Users can only manage and view their own configured "remotes" within rclone.
*   **Credential Storage:** Any sensitive tokens or keys for cloud providers must be securely encrypted at rest in MongoDB.

## 4. Database Schema Overview (Initial)
*   **Users:** `id`, `email`, `passwordHash`, `role`, `createdAt`
*   **Remotes:** `id`, `userId`, `name`, `type` (e.g., s3, drive, dropbox), `configParameters` (Encrypted JSON), `createdAt`
*   **AuditLogs (Optional for MVP):** Track file deletions and modifications.

## 5. Phase 1: MVP Feature Roadmap
1.  **Foundation:** Project scaffolding, Dockerization, Clean Architecture setup.
2.  **Auth & User Management:** User registration, login, and JWT middleware.
3.  **Remote Configuration:** UI and API for users to add/edit/delete their cloud storage credentials (rclone remotes).
4.  **Real-time File Explorer:**
    *   Connect to configured remotes.
    *   List directories and files via WebSockets.
    *   Basic Operations: Upload, Download, Create Folder, Delete.

## 6. Deployment Strategy
The application will be designed to run in a containerized environment (Docker).
*   `frontend` container (served via Nginx or Node).
*   `backend` container (Node.js).
*   `database` container (MongoDB).
*   `rclone` daemon container (can be bundled with the backend or run as a sidecar depending on security constraints and scaling needs).
