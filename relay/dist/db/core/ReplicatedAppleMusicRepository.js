"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicatedAppleMusicRepository = void 0;
class ReplicatedAppleMusicRepository {
    primary;
    mirrors;
    constructor(primary, mirrors) {
        this.primary = primary;
        this.mirrors = mirrors;
    }
    async getConfig() {
        return this.primary.getConfig();
    }
    async saveConfig(config) {
        const result = await this.primary.saveConfig(config);
        this.mirrors.forEach(mirror => {
            mirror.saveConfig(config).catch(err => {
                console.error(`[ReplicatedAppleMusic] Mirror save failed:`, err);
            });
        });
        return result;
    }
}
exports.ReplicatedAppleMusicRepository = ReplicatedAppleMusicRepository;
