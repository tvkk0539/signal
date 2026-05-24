# Database Abstraction Architecture (Repository Pattern)

This document details the highly engineered design pattern used to manage persistent data within the Relay Server. To ensure long-term flexibility, the architecture explicitly forbids tightly coupling business logic to any specific database technology (e.g., MongoDB).

The system must support seamless migration to PostgreSQL, Firebase, Supabase, or any other datastore in the future without requiring core application rewrites.

---

## 1. The Core Concept: The Repository Pattern

We utilize the **Repository Pattern**, a core tenet of Clean Architecture. This pattern acts as an intermediary layer between the application's business logic and the database's data mapping layer.

1.  **The Interface (The Contract):** We define strict TypeScript interfaces (e.g., `IUserRepository`) that state *what* the database must do (e.g., `findByEmail(email)`, `createUser(data)`).
2.  **The Business Logic:** The Relay Server's authentication controllers only ever speak to the `IUserRepository` interface. They are completely blind to *how* the data is saved.
3.  **The Implementation (The Plugin):** We write specific classes that fulfill the contract. For example, `MongoUserRepository` fulfills `IUserRepository` by executing Mongoose commands. Later, we can write `PostgresUserRepository` to fulfill the exact same contract using SQL.

## 2. The Central Database Manager

To orchestrate this, we introduce the **Central DB Manager**.

*   At application startup, the Central DB Manager reads the environment variables (e.g., `DB_TYPE="MONGODB"`).
*   It instantiates the correct "Plugin" (e.g., `MongoUserRepository`).
*   It injects this specific repository into the application controllers.
*   **The Result:** Swapping from MongoDB to Supabase requires changing exactly one environment variable and writing one new Plugin class. Zero business logic is touched.

## 3. The Implementation Structure (`/relay/src/db`)

The folder structure enforces this strict separation of concerns:

```text
/relay/src/db/
├── index.ts               # The Central DB Manager & Factory
├── interfaces/            # The strict contracts
│   └── IUserRepository.ts
└── providers/             # The Database Plugins
    ├── mongo/             # MongoDB specific implementations
    │   ├── connection.ts
    │   ├── schemas/       # Mongoose Schemas
    │   └── MongoUserRepository.ts
    └── postgres/          # (Future) SQL specific implementations
```

## 4. Current Phase: MongoDB Implementation

For Phase 1, the default Plugin utilized by the Central DB Manager is MongoDB.

*   **Security:** User passwords are never stored in plaintext. The `MongoUserRepository` (and any future plugins) must utilize `bcrypt` for secure salting and hashing before insertion.
*   **Authentication:** The REST API endpoints utilize the DB Manager to verify credentials and subsequently issue cryptographically signed JSON Web Tokens (JWTs) for both the React Web UI and the React Native Mobile App to use when establishing their WebSocket/WebTransport connections.