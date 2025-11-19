import {Document, Schema, model, Types } from 'mongoose'
import {v4 as uuid } from 'uuid'

export interface IPasswordResetToken extends Document {
  id : string;
  userId : Types.ObjectId;
  token : string;
  expiresAt : Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    id : {
      type : String,
      default : uuid,
      required : true,
      unique : true
    },
    userId : {
      type : Schema.Types.ObjectId,
      ref : 'User',
      required : true,
      index : true
    },
    token : {
      type : String,
      required : true,
      unique : true
    },
    expiresAt : {
      type : Date,
      required : true
    }
  },
  {
    timestamps : false
  }
)

export const PasswordResetToken = model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);