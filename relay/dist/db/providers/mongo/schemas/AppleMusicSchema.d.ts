import { Schema, Document } from 'mongoose';
import { AppleMusicConfig } from '../../../interfaces/IAppleMusicRepository';
export interface IAppleMusicConfigDocument extends Omit<AppleMusicConfig, 'updatedAt'>, Document {
    updatedAt: Date;
}
export interface IWrapperProfileDocument extends Document {
    id: string;
    name: string;
    username: string;
    payload: string;
    timestamp: number;
}
export declare const WrapperProfileSchema: Schema<IWrapperProfileDocument, import("mongoose").Model<IWrapperProfileDocument, any, any, any, any, any, IWrapperProfileDocument>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IWrapperProfileDocument, Document<unknown, {}, IWrapperProfileDocument, {}, import("mongoose").DefaultSchemaOptions> & IWrapperProfileDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, {
    id?: import("mongoose").SchemaDefinitionProperty<string, IWrapperProfileDocument, Document<unknown, {}, IWrapperProfileDocument, {}, import("mongoose").DefaultSchemaOptions> & IWrapperProfileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    timestamp?: import("mongoose").SchemaDefinitionProperty<number, IWrapperProfileDocument, Document<unknown, {}, IWrapperProfileDocument, {}, import("mongoose").DefaultSchemaOptions> & IWrapperProfileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IWrapperProfileDocument, Document<unknown, {}, IWrapperProfileDocument, {}, import("mongoose").DefaultSchemaOptions> & IWrapperProfileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<string, IWrapperProfileDocument, Document<unknown, {}, IWrapperProfileDocument, {}, import("mongoose").DefaultSchemaOptions> & IWrapperProfileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    payload?: import("mongoose").SchemaDefinitionProperty<string, IWrapperProfileDocument, Document<unknown, {}, IWrapperProfileDocument, {}, import("mongoose").DefaultSchemaOptions> & IWrapperProfileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    username?: import("mongoose").SchemaDefinitionProperty<string, IWrapperProfileDocument, Document<unknown, {}, IWrapperProfileDocument, {}, import("mongoose").DefaultSchemaOptions> & IWrapperProfileDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
}, IWrapperProfileDocument>;
export declare const AppleMusicSchema: Schema<IAppleMusicConfigDocument, import("mongoose").Model<IAppleMusicConfigDocument, any, any, any, any, any, IAppleMusicConfigDocument>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    mediaUserToken?: import("mongoose").SchemaDefinitionProperty<string, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    storefront?: import("mongoose").SchemaDefinitionProperty<string, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    alacFix?: import("mongoose").SchemaDefinitionProperty<boolean, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    autoUpload?: import("mongoose").SchemaDefinitionProperty<boolean, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rcloneRemote?: import("mongoose").SchemaDefinitionProperty<string, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lrcFormat?: import("mongoose").SchemaDefinitionProperty<"lrc" | "ttml", IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lrcType?: import("mongoose").SchemaDefinitionProperty<"lyrics" | "syllable-lyrics", IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    language?: import("mongoose").SchemaDefinitionProperty<string, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tagSortOrder?: import("mongoose").SchemaDefinitionProperty<boolean, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    saveLrcFile?: import("mongoose").SchemaDefinitionProperty<boolean, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    saveArtistCover?: import("mongoose").SchemaDefinitionProperty<boolean, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    useSongInfoForPlaylist?: import("mongoose").SchemaDefinitionProperty<boolean, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, IAppleMusicConfigDocument, Document<unknown, {}, IAppleMusicConfigDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAppleMusicConfigDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IAppleMusicConfigDocument>;
