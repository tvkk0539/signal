"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresUserRepository = void 0;
class PostgresUserRepository {
    connectionString;
    constructor(connectionString) {
        this.connectionString = connectionString || '';
        console.log(`[Postgres] Initialized User Repository mapping.`);
    }
    async findByEmail(email) {
        console.log(`[Postgres] (Stub) findByEmail: ${email}`);
        return null;
    }
    async createUser(user) {
        console.log(`[Postgres] (Stub) createUser: ${user.email}`);
        return {
            ...user,
            id: `pg-${Date.now()}`,
            createdAt: new Date()
        };
    }
}
exports.PostgresUserRepository = PostgresUserRepository;
