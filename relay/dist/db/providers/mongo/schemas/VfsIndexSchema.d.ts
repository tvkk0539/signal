import mongoose, { Document } from 'mongoose';
export interface IVfsIndexModel extends Document {
    id: string;
    remoteName: string;
    path: string;
    name: string;
    size: number;
    mimeType: string;
    isDir: boolean;
    workerId: string;
    persistentId?: string;
    isPermanent: boolean;
    createdAt: Date;
}
export declare const VfsIndexModel: mongoose.Model<IVfsIndexModel, {}, {}, {}, mongoose.Document<unknown, {}, IVfsIndexModel, {}, mongoose.DefaultSchemaOptions> & IVfsIndexModel & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any, IVfsIndexModel>;
