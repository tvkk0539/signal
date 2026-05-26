"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryUserRepository = void 0;
class InMemoryUserRepository {
    users = new Map();
    nextId = 1;
    async findByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }
    async createUser(userData) {
        const id = this.nextId.toString();
        this.nextId++;
        const newUser = {
            ...userData,
            id,
            createdAt: new Date()
        };
        this.users.set(id, newUser);
        return newUser;
    }
}
exports.InMemoryUserRepository = InMemoryUserRepository;
