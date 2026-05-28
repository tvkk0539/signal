"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoUserRepository = void 0;
const UserSchema_1 = require("./schemas/UserSchema");
class MongoUserRepository {
    userModel;
    constructor(connection) {
        this.userModel = connection.model('User', UserSchema_1.UserSchema);
    }
    async findByEmail(email) {
        const userDoc = await this.userModel.findOne({ email }).exec();
        if (!userDoc)
            return null;
        return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            passwordHash: userDoc.passwordHash,
            role: userDoc.role,
            createdAt: userDoc.createdAt
        };
    }
    async createUser(userData) {
        const newUser = new this.userModel(userData);
        const savedUser = await newUser.save();
        return {
            id: savedUser._id.toString(),
            email: savedUser.email,
            passwordHash: savedUser.passwordHash,
            role: savedUser.role,
            createdAt: savedUser.createdAt
        };
    }
}
exports.MongoUserRepository = MongoUserRepository;
