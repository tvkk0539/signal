import { Schema, Document } from 'mongoose';
export interface IVfsFileDocument extends Document {
    remoteAlias: string;
    path: string;
    name: string;
    size: number;
    mimeType: string;
    modTime: Date;
    isDirectory: boolean;
    isEphemeral: boolean;
    workerId?: string;
    expiresAt?: Date;
}
export declare const VfsFileSchema: Schema<IVfsFileDocument, import("mongoose").Model<IVfsFileDocument, any, any, any, any, any, IVfsFileDocument>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    workerId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<string, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    size?: import("mongoose").SchemaDefinitionProperty<number, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    path?: import("mongoose").SchemaDefinitionProperty<string, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    remoteAlias?: import("mongoose").SchemaDefinitionProperty<string, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    mimeType?: import("mongoose").SchemaDefinitionProperty<string, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    modTime?: import("mongoose").SchemaDefinitionProperty<Date, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isDirectory?: import("mongoose").SchemaDefinitionProperty<boolean, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isEphemeral?: import("mongoose").SchemaDefinitionProperty<boolean, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, IVfsFileDocument, Document<unknown, {}, IVfsFileDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IVfsFileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IVfsFileDocument>;
export interface IRcloneConfigDocument extends Document {
    alias: string;
    rcloneName: string;
    configText: string;
    isEphemeral: boolean;
    workerId?: string;
}
export declare const RcloneConfigSchema: Schema<IRcloneConfigDocument, import("mongoose").Model<IRcloneConfigDocument, any, any, any, any, any, IRcloneConfigDocument>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IRcloneConfigDocument, Document<unknown, {}, IRcloneConfigDocument, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IRcloneConfigDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    workerId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IRcloneConfigDocument, Document<unknown, {}, IRcloneConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IRcloneConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IRcloneConfigDocument, Document<unknown, {}, IRcloneConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IRcloneConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    alias?: import("mongoose").SchemaDefinitionProperty<string, IRcloneConfigDocument, Document<unknown, {}, IRcloneConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IRcloneConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isEphemeral?: import("mongoose").SchemaDefinitionProperty<boolean, IRcloneConfigDocument, Document<unknown, {}, IRcloneConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IRcloneConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rcloneName?: import("mongoose").SchemaDefinitionProperty<string, IRcloneConfigDocument, Document<unknown, {}, IRcloneConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IRcloneConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    configText?: import("mongoose").SchemaDefinitionProperty<string, IRcloneConfigDocument, Document<unknown, {}, IRcloneConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IRcloneConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IRcloneConfigDocument>;
