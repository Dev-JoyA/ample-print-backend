import { IUser, UserRole } from "../model/userModel.js";
import { IProfile as ProfileType } from "../model/profileModel.js";
import { Document } from "mongoose";
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
export declare function getProfileByUserId(userId: string): Promise<ProfileType | null>;
export declare function updateProfileDetails(userId: string, profileData: Partial<IProfileUpdate>): Promise<{
    user: IUserResponse;
    profile: Document<unknown, {}, ProfileType, {}, {}> & ProfileType & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    };
}>;
export declare function deleteUser(userId: string): Promise<Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function changeUserRole(userId: string, newRole: UserRole): Promise<Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function toggleUserActiveness(userId: string): Promise<Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function getUserAddress(userId: string): Promise<string | null>;
//# sourceMappingURL=userService.d.ts.map