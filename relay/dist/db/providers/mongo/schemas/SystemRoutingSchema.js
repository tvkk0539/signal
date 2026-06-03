"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemRoutingSchema = void 0;
const mongoose_1 = require("mongoose");
exports.SystemRoutingSchema = new mongoose_1.Schema({
    domain: { type: String, required: true, unique: true, index: true },
    primary: {
        engine: { type: String, required: true },
        connectionString: { type: String },
        apiKey: { type: String }
    },
    mirrors: [{
            engine: { type: String, required: true },
            connectionString: { type: String },
            apiKey: { type: String }
        }],
    updatedAt: { type: Date, default: Date.now }
});
