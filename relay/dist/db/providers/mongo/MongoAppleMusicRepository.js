"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoAppleMusicRepository = void 0;
const AppleMusicSchema_1 = require("./schemas/AppleMusicSchema");
class MongoAppleMusicRepository {
    configModel;
    constructor(connection) {
        this.configModel = connection.model('AppleMusicConfig', AppleMusicSchema_1.AppleMusicSchema);
    }
    async getConfig() {
        // We assume a single configuration document exists for the system/user.
        // In a multi-tenant environment, you might filter by userId.
        const doc = await this.configModel.findOne().exec();
        if (!doc)
            return null;
        return {
            mediaUserToken: doc.mediaUserToken,
            storefront: doc.storefront,
            alacFix: doc.alacFix,
            autoUpload: doc.autoUpload,
            rcloneRemote: doc.rcloneRemote,
            lrcFormat: doc.lrcFormat,
            lrcType: doc.lrcType,
            language: doc.language,
            tagSortOrder: doc.tagSortOrder,
            saveLrcFile: doc.saveLrcFile,
            saveArtistCover: doc.saveArtistCover,
            useSongInfoForPlaylist: doc.useSongInfoForPlaylist,
            wrapperStatePayload: doc.wrapperStatePayload,
            updatedAt: doc.updatedAt
        };
    }
    async saveConfig(config) {
        const updateData = {
            ...config,
            updatedAt: new Date()
        };
        // Upsert the single configuration document
        const doc = await this.configModel.findOneAndUpdate({}, // Match the first/only document
        { $set: updateData }, { new: true, upsert: true }).exec();
        return {
            mediaUserToken: doc.mediaUserToken,
            storefront: doc.storefront,
            alacFix: doc.alacFix,
            autoUpload: doc.autoUpload,
            rcloneRemote: doc.rcloneRemote,
            lrcFormat: doc.lrcFormat,
            lrcType: doc.lrcType,
            language: doc.language,
            tagSortOrder: doc.tagSortOrder,
            saveLrcFile: doc.saveLrcFile,
            saveArtistCover: doc.saveArtistCover,
            useSongInfoForPlaylist: doc.useSongInfoForPlaylist,
            wrapperStatePayload: doc.wrapperStatePayload,
            updatedAt: doc.updatedAt
        };
    }
}
exports.MongoAppleMusicRepository = MongoAppleMusicRepository;
