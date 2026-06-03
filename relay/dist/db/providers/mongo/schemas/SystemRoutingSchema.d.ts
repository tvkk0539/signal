import { Schema, Document } from 'mongoose';
export interface ISystemRoutingDocument extends Document {
    domain: string;
    primary: {
        engine: string;
        connectionString?: string;
        apiKey?: string;
    };
    mirrors: Array<{
        engine: string;
        connectionString?: string;
        apiKey?: string;
    }>;
    updatedAt: Date;
}
export declare const SystemRoutingSchema: Schema<ISystemRoutingDocument, import("mongoose").Model<ISystemRoutingDocument, any, any, any, any, any, ISystemRoutingDocument>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ISystemRoutingDocument, Document<unknown, {}, ISystemRoutingDocument, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ISystemRoutingDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    domain?: import("mongoose").SchemaDefinitionProperty<string, ISystemRoutingDocument, Document<unknown, {}, ISystemRoutingDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ISystemRoutingDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, ISystemRoutingDocument, Document<unknown, {}, ISystemRoutingDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ISystemRoutingDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    primary?: import("mongoose").SchemaDefinitionProperty<{
        engine: string;
        connectionString?: string;
        apiKey?: string;
    }, ISystemRoutingDocument, Document<unknown, {}, ISystemRoutingDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ISystemRoutingDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    mirrors?: import("mongoose").SchemaDefinitionProperty<{
        engine: string;
        connectionString?: string;
        apiKey?: string;
    }[], ISystemRoutingDocument, Document<unknown, {}, ISystemRoutingDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ISystemRoutingDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, ISystemRoutingDocument, Document<unknown, {}, ISystemRoutingDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ISystemRoutingDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ISystemRoutingDocument>;
