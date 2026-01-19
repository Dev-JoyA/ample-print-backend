import { User, IUser, UserRole } from "../model/userModel.js";
import { Profile, IProfile as ProfileType } from "../model/profileModel.js";
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

export async function getAllUsers(): Promise<IUserResponse[]> {
  const users = await User.find();
  const profiles = await Profile.find({
    userId: { $in: users.map((u) => u._id) },
  });
  return users.map((u) => {
    const doc: any = u;
    const profile = profiles.find((p) => p.userId.equals(doc._id));
    return {
      user: doc._id?.toString(),
      email: doc.email,
      role: doc.role,
      isActive: doc.isActive,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      userName: profile?.userName,
      phoneNumber: profile?.phoneNumber,
      address: profile?.address,
    } as IUserResponse;
  });
}
export async function getUserById(userId: string): Promise<IUserResponse> {
  const user = await User.findById(userId).exec();
  if (!user) throw new Error(`User with ID ${userId} not found`);
  const profile = await Profile.findOne({ userId: user._id });
  return {
    user: user._id.toString(),
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    firstName: profile?.firstName,
    lastName: profile?.lastName,
    userName: profile?.userName,
    phoneNumber: profile?.phoneNumber,
    address: profile?.address,
  };
}

export async function getUserByEmail(
  email: string,
): Promise<IUserResponse | null> {
  const user = await User.findOne({ email }).exec();
  if (!user) return null;
  const profile = await Profile.findOne({ userId: user._id });
  return {
    user: user._id.toString(),
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    firstName: profile?.firstName,
    lastName: profile?.lastName,
    userName: profile?.userName,
    phoneNumber: profile?.phoneNumber,
    address: profile?.address,
  };
}

export async function getProfileByUserId(
  userId: string,
): Promise<ProfileType | null> {
  return Profile.findOne({ userId }).exec();
}

export async function updateProfileDetails(
  userId: string,
  profileData: Partial<IProfileUpdate>,
) {
  try {
    const user = await getUserById(userId);

    if (profileData.userName)
      profileData.userName = profileData.userName.trim().toLowerCase();
    if (profileData.firstName)
      profileData.firstName = profileData.firstName.trim();
    if (profileData.lastName)
      profileData.lastName = profileData.lastName.trim();
    if (profileData.phoneNumber)
      profileData.phoneNumber = profileData.phoneNumber.trim();
    if (profileData.address) profileData.address = profileData.address.trim();

    const profile = await Profile.findOneAndUpdate({ userId }, profileData, {
      new: true,
    }).exec();
    if (!profile) throw new Error(`Profile for user ${userId} not found`);

    return { user, profile };
  } catch (err: any) {
    throw new Error(`Error updating profile: ${err.message}`);
  }
}

export async function deleteUser(userId: string) {
  try {
    const user = await User.findByIdAndDelete(userId).exec();
    if (!user) throw new Error(`User with ID ${userId} not found`);

    await Profile.findOneAndDelete({ userId }).exec();

    return user;
  } catch (err: any) {
    throw new Error(`Error deleting user: ${err.message}`);
  }
}

export async function changeUserRole(userId: string, newRole: UserRole) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true },
    ).exec();
    if (!user) throw new Error(`User with ID ${userId} not found`);
    return user;
  } catch (err: any) {
    throw new Error(`Error changing user role: ${err.message}`);
  }
}

export async function toggleUserActiveness(userId: string) {
  try {
    const user = await User.findById(userId).exec();
    if (!user) throw new Error(`User with ID ${userId} not found`);
    user.isActive = !user.isActive;
    await user.save();
    return user;
  } catch (err: any) {
    throw new Error(`Error toggling user activeness: ${err.message}`);
  }
}

export async function getUserAddress(userId: string): Promise<string | null> {
  try {
    const profile = await getProfileByUserId(userId);
    if (!profile) throw new Error(`Profile for user ${userId} not found`);
    return profile.address || null;
  } catch (err: any) {
    throw new Error(`Error fetching user address: ${err.message}`);
  }
}
