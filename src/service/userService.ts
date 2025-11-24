import { User, IUser, UserRole } from "../models/userModel.js";
import { Profile, IProfile as ProfileType } from "../models/profileModel.js";

export interface IProfileUpdate {
  userName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
}


export async function getAllUsers(): Promise<IUser[]> {
  return User.find().exec();
}

export async function getUserById(userId: string): Promise<IUser> {
  const user = await User.findById(userId).exec();
  if (!user) throw new Error(`User with ID ${userId} not found`);
  return user;
}

export async function getUserByEmail(email: string): Promise<IUser | null> {
  return User.findOne({ email }).exec();
}



export async function getProfileByUserId(userId: string): Promise<ProfileType | null> {
  return Profile.findOne({ userId }).exec();
}

export async function updateProfileDetails(userId: string, profileData: Partial<IProfileUpdate>) {
  try {
    const user = await getUserById(userId);

   
    if (profileData.userName) profileData.userName = profileData.userName.trim().toLowerCase();
    if (profileData.firstName) profileData.firstName = profileData.firstName.trim();
    if (profileData.lastName) profileData.lastName = profileData.lastName.trim();
    if (profileData.phoneNumber) profileData.phoneNumber = profileData.phoneNumber.trim();
    if (profileData.address) profileData.address = profileData.address.trim();

    const profile = await Profile.findOneAndUpdate({ userId: user._id }, profileData, { new: true }).exec();
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
    const user = await User.findByIdAndUpdate(userId, { role: newRole }, { new: true }).exec();
    if (!user) throw new Error(`User with ID ${userId} not found`);
    return user;
  } catch (err: any) {
    throw new Error(`Error changing user role: ${err.message}`);
  }
}

export async function toggleUserActiveness(userId: string) {
  try {
    const user = await getUserById(userId);
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
