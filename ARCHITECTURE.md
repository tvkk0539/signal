# System Architecture

## Technical Stack
The project adheres to a **Full TypeScript** stack to ensure type safety, consistency, and shared data models across the entire application.

### Frontend
*   **Framework**: React (Bootstrapped with Vite for lightning-fast builds).
*   **Language**: TypeScript.
*   **UI/Styling**: Tailwind CSS combined with `shadcn/ui` for enterprise-grade, highly customizable, and accessible components.
*   **State Management**: `Zustand` for global UI state.
*   **Data Fetching/Caching**: `TanStack Query` (React Query) for managing server data.

### Backend
*   **Environment**: Node.js.
*   **Language**: TypeScript.
*   **API Framework**: Express.
*   **Real-time Communication**: Socket.io.
*   **Design Pattern**: Clean Architecture utilizing the Controller-Service-Repository pattern to maintain modular, testable, and robust code.

### Database
*   **Primary Store**: MongoDB.
*   **ODM**: Mongoose.
*   **Strategy**: Careful schema design for multi-tenant users, secure cloud provider configurations, and audit logs.

## Infrastructure & Security
The system is built to be highly professional and secure from day one.

*   **Communication Split**:
    *   **REST APIs**: Used for standard CRUD operations (e.g., User Authentication, managing rclone configurations).
    *   **WebSockets**: Dedicated strictly to real-time, high-bandwidth communication with the `rclone rcd` process (e.g., live file transfers, directory polling).
*   **Containerization**: Dockerfiles will be created for the frontend, backend, and the rclone daemon, allowing the entire stack to be spun up seamlessly and consistently across environments.
*   **Multi-tenant Security**: Built-in authentication (JWT) ensures that each user's file operations are strictly isolated. The backend manages the rclone daemon securely so users can only access their configured remotes.

## Deployment Strategy
Because of the strict separation of the `/frontend` and `/backend` directories, the deployment can be split:
*   **Frontend**: Hosted on static/edge platforms like Vercel, Netlify, or an Nginx web server.
*   **Backend/Workers**: Deployed on compute instances like AWS EC2, DigitalOcean droplets, etc.
*   **Database**: Hosted MongoDB cluster (e.g., MongoDB Atlas).