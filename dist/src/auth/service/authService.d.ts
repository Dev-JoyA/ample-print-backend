import { IUser } from "../../users/model/userModel.js";
import { IProfile } from "../../users/model/profileModel.js";
export interface SignUpData {
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
    password: string;
    phoneNumber: string;
    address?: string;
}
export interface SignInData {
    email: string;
    password: string;
}
export interface AdminData {
    email: string;
    userName: string;
}
export interface AuthResponse {
    user: Partial<IUser>;
    profile: Partial<IProfile>;
    accessToken: string;
    refreshToken: string;
}
export declare function signUpService(data: SignUpData): Promise<{
    user: Partial<IUser> | null;
    profile: Partial<IProfile> | null;
}>;
export declare function signInService(data: SignInData): Promise<AuthResponse>;
export declare function refreshTokenService(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
}>;
export declare function logoutService(refreshToken: string): Promise<void>;
export declare function createAdminService(data: SignUpData, superAdmin: AdminData): Promise<{
    user: Partial<IUser> | null;
    profile: Partial<IProfile> | null;
}>;
export declare function createSuperAdminService(data: SignUpData): Promise<{
    user: Partial<IUser> | null;
    profile: Partial<IProfile> | null;
}>;
export declare function deactivateAdminService(email: string): Promise<void>;
export declare function reactivateAdminService(email: string): Promise<void>;
export declare function forgotPasswordService(email: string): Promise<{
    message: string;
}>;
export declare function effectForgotPassword(token: string, newPassword: string, confirmPassword: string): Promise<{
    message: string;
}>;
export declare function resetPasswordService(userId: string, newPassword: string, confirmPassword: string): Promise<{
    message: string;
}>;
//# sourceMappingURL=authService.d.ts.map