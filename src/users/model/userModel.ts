import { Document, Schema, model } from "mongoose";

export enum UserRole {
  Customer = "Customer",
  Admin = "Admin",
  SuperAdmin = "SuperAdmin",
}

export interface IUser extends Document {
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: function (): boolean {
        return !this.googleId;
      },
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.Customer,
      index: true,
    },
    isActive: {
      type: Boolean,
      index: true,
      required: true,
    },
    googleId: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

UserSchema.virtual("profile", {
  ref: "Profile",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});
export const User = model<IUser>("User", UserSchema);
