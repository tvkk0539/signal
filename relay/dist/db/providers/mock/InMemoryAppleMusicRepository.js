"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAppleMusicRepository = void 0;
class InMemoryAppleMusicRepository {
    config = null;
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
}
exports.InMemoryAppleMusicRepository = InMemoryAppleMusicRepository;
