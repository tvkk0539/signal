"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoAppleMusicRepository = void 0;
const AppleMusicSchema_1 = require("./schemas/AppleMusicSchema");
class MongoAppleMusicRepository {
    configModel;
    profileModel;
    constructor(connection) {
        this.configModel = connection.model('AppleMusicConfig', AppleMusicSchema_1.AppleMusicSchema);
        this.profileModel = connection.model('WrapperProfile', AppleMusicSchema_1.WrapperProfileSchema);
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
            updatedAt: doc.updatedAt
        };
    }
    async saveWrapperProfile(profile) {
        await this.profileModel.findOneAndUpdate({ id: profile.id }, { $set: profile }, { new: true, upsert: true }).exec();
    }
    async getWrapperProfiles() {
        const docs = await this.profileModel.find({}, { payload: 0 }).lean().exec();
        return docs.map(doc => ({
            id: doc.id,
            name: doc.name,
            username: doc.username,
            timestamp: doc.timestamp
        }));
    }
    async getWrapperProfilePayload(profileId) {
        const doc = await this.profileModel.findOne({ id: profileId }, { payload: 1 }).lean().exec();
        return doc ? doc.payload : null;
    }
    async deleteWrapperProfile(profileId) {
        await this.profileModel.deleteOne({ id: profileId }).exec();
    }
}
exports.MongoAppleMusicRepository = MongoAppleMusicRepository;
