import { IUser, UserRole } from "../model/userModel.js";
import { IProfile } from "../model/profileModel.js";
import mongoose from "mongoose";
export interface IProfileUpdate {
    userName?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    address?: string;
}
export interface IUserResponse {
    user: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    userName?: string;
    phoneNumber?: string;
    address?: string;
}
export declare function getAllUsers(): Promise<IUserResponse[]>;
export declare function getUserById(userId: string): Promise<IUserResponse>;
export declare function getUserByEmail(email: string): Promise<IUserResponse | null>;
export declare function getProfileByUserId(userId: string): Promise<IProfile | null>;
export declare function updateProfileDetails(userId: string, profileData: Partial<IProfileUpdate>): Promise<{
    user: IUserResponse;
    profile: mongoose.Document<unknown, {}, IProfile, {}, {}> & IProfile & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    };
}>;
export declare function deleteUser(userId: string): Promise<{
    message: string;
    userId: string;
}>;
export declare function changeUserRole(userId: string, newRole: UserRole): Promise<mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function toggleUserActiveness(userId: string): Promise<mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function getUserAddress(userId: string): Promise<string | null>;
//# sourceMappingURL=userService.d.ts.map