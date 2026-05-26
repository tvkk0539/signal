import mongoose, { Document } from 'mongoose';
export interface IUserDocument extends Document {
    email: string;
    passwordHash: string;
    role: 'ADMIN' | 'USER';
    createdAt: Date;
}
export declare const UserModel: mongoose.Model<IUserDocument, {}, {}, {}, mongoose.Document<unknown, {}, IUserDocument, {}, mongoose.DefaultSchemaOptions> & IUserDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUserDocument>;
