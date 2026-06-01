"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAppleMusicRepository = void 0;
class InMemoryAppleMusicRepository {
    config = null;
    wrapperProfiles = new Map();
    async getConfig() {
        return this.config;
    }
    async saveConfig(config) {
        this.config = {
            mediaUserToken: config.mediaUserToken || '',
            storefront: config.storefront || 'us',
            alacFix: config.alacFix ?? false,
            autoUpload: config.autoUpload ?? true,
            rcloneRemote: config.rcloneRemote || 'remote:/Media/AppleMusic_Rips',
            lrcFormat: config.lrcFormat || 'lrc',
            lrcType: config.lrcType || 'lyrics',
            language: config.language || '',
            tagSortOrder: config.tagSortOrder ?? true,
            saveLrcFile: config.saveLrcFile ?? false,
            saveArtistCover: config.saveArtistCover ?? false,
            useSongInfoForPlaylist: config.useSongInfoForPlaylist ?? false,
            updatedAt: new Date()
        };
        return this.config;
    }
    async saveWrapperProfile(profile) {
        this.wrapperProfiles.set(profile.id, profile);
    }
    async getWrapperProfiles() {
        const profiles = [];
        for (const profile of this.wrapperProfiles.values()) {
            profiles.push({
                id: profile.id,
                name: profile.name,
                username: profile.username,
                timestamp: profile.timestamp
            });
        }
        return profiles;
    }
    async getWrapperProfilePayload(profileId) {
        const profile = this.wrapperProfiles.get(profileId);
        return profile ? profile.payload : null;
    }
    async deleteWrapperProfile(profileId) {
        this.wrapperProfiles.delete(profileId);
    }
}
exports.InMemoryAppleMusicRepository = InMemoryAppleMusicRepository;
