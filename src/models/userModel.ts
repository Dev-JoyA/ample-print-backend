import { Document, Schema , model } from 'mongoose';
import { v4 as uuid } from "uuid";

export enum UserRole {
    Customer = 'Customer',
    Admin = 'Admin',
    SuperAdmin = 'SuperAdmin'
}

export interface IUser extends Document {
    userId : string;
    email : string;
    password : string;
    role : UserRole;
    isActive : boolean;
    createdAt : Date;
    updatedAt : Date;
}

const UserSchema = new Schema<IUser>(
  {
      userId: {
        type : String,
        default : uuid,
        required : true,
        unique : true
    },
    email : {
        type : String,
        required : true,
        unique : true,
        index : true
    },
    password : {
        type : String,
        required : true
    },
    role : {
        type : String,
        enum : Object.values(UserRole),
        default : UserRole.Customer,
        index : true
    },
    isActive : {
        type : Boolean,
        index : true,
        required : true
    }
  },
  {
    timestamps : true
  }
)

export const User = model<IUser>("User", UserSchema);



