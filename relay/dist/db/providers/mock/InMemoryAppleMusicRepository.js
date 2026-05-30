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
            autoUpload: config.autoUpload ?? true,
            rcloneRemote: config.rcloneRemote || 'remote:/Media/AppleMusic_Rips',
            updatedAt: new Date()
        };
        return this.config;
    }
}
exports.InMemoryAppleMusicRepository = InMemoryAppleMusicRepository;
