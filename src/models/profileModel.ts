import { Document, Schema , model, Types } from "mongoose";

export interface IProfile extends Document {
    userId : Types.ObjectId;
    firstName : string;
    lastName : string;
    userName : string;
    phoneNumber : string;
    address? : string;
    createdAt : Date;
    updatedAt : Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    userId: {
        type : Schema.Types.ObjectId,
        ref : 'User',
        required : true,
        unique : true,
        index : true
    },
    firstName : {
        type : String,
        required : true,
        index : true
    },
    lastName : {
        type : String,
        required : true,
        index : true,
    },
    userName : {
        type : String,
        required : true,
        unique : true,
        index : true
    },
    phoneNumber : {
        type : String,
        required : true
    },
    address : {
        type : String
    }
  },
  {
    timestamps : true
  }
)

export const Profile = model<IProfile>("Profile", ProfileSchema);