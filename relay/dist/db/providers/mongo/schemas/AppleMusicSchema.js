"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppleMusicSchema = void 0;
const mongoose_1 = require("mongoose");
exports.AppleMusicSchema = new mongoose_1.Schema({
    mediaUserToken: { type: String, default: '' },
    storefront: { type: String, default: 'us' },
    alacFix: { type: Boolean, default: false },
    autoUpload: { type: Boolean, default: true },
    rcloneRemote: { type: String, default: 'remote:/Media/AppleMusic_Rips' },
    lrcFormat: { type: String, enum: ['lrc', 'ttml'], default: 'lrc' },
    lrcType: { type: String, enum: ['lyrics', 'syllable-lyrics'], default: 'lyrics' },
    language: { type: String, default: '' },
    tagSortOrder: { type: Boolean, default: true },
    saveLrcFile: { type: Boolean, default: false },
    saveArtistCover: { type: Boolean, default: false },
    useSongInfoForPlaylist: { type: Boolean, default: false },
    wrapperStatePayload: { type: String },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: { updatedAt: 'updatedAt' }
});
