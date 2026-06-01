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
    async saveWrapperProfile(profile) {
        await this.primary.saveWrapperProfile(profile);
        this.mirrors.forEach(mirror => {
            mirror.saveWrapperProfile(profile).catch(err => {
                console.error(`[ReplicatedAppleMusic] Mirror saveWrapperProfile failed:`, err);
            });
        });
    }
    async getWrapperProfiles() {
        return this.primary.getWrapperProfiles();
    }
    async getWrapperProfilePayload(profileId) {
        return this.primary.getWrapperProfilePayload(profileId);
    }
    async deleteWrapperProfile(profileId) {
        await this.primary.deleteWrapperProfile(profileId);
        this.mirrors.forEach(mirror => {
            mirror.deleteWrapperProfile(profileId).catch(err => {
                console.error(`[ReplicatedAppleMusic] Mirror deleteWrapperProfile failed:`, err);
            });
        });
    }
}
exports.ReplicatedAppleMusicRepository = ReplicatedAppleMusicRepository;
