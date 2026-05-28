"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicatedUserRepository = void 0;
/**
 * The Replication Engine for User Repositories.
 * Writes synchronously to the primary database, and asynchronously ("fire-and-forget") to all mirrors.
 * Reads always hit the primary database.
 */
class ReplicatedUserRepository {
    primary;
    mirrors;
    constructor(primary, mirrors = []) {
        this.primary = primary;
        this.mirrors = mirrors;
    }
    async findByEmail(email) {
        // Reads always hit the primary source of truth
        return this.primary.findByEmail(email);
    }
    async createUser(user) {
        // 1. Await primary write (Zero-Delay for UI)
        const createdUser = await this.primary.createUser(user);
        // 2. Fire-and-Forget async mirror writes
        this.mirrors.forEach(mirror => {
            // Re-use the exact generated ID and timestamp from the primary to ensure exact replication
            mirror.createUser(createdUser).catch(err => {
                console.error(`[Replication Engine] Mirror write failed for User ${createdUser.email}:`, err);
            });
        });
        return createdUser;
    }
}
exports.ReplicatedUserRepository = ReplicatedUserRepository;
