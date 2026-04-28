import { User, UserRole } from "../model/userModel.js";
import { Profile, IProfile } from "../model/profileModel.js";
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

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex =
    /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

const isValidUserName = (userName: string): boolean => {
  const userNameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return userNameRegex.test(userName);
};

export async function getAllUsers(): Promise<IUserResponse[]> {
  try {
    const users = await User.find().lean().exec();

    if (!users.length) {
      return [];
    }

    const profiles = await Profile.find({
      userId: { $in: users.map((u) => u._id) },
    })
      .lean()
      .exec();

    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    return users.map((u) => {
      const profile = profileMap.get(u._id.toString());
      return {
        user: u._id.toString(),
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        userName: profile?.userName,
        phoneNumber: profile?.phoneNumber,
        address: profile?.address,
      };
    });
  } catch (error: any) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
}

export async function getUserById(userId: string): Promise<IUserResponse> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID format");
  }

  try {
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      throw new Error(`User not found`);
    }

    const profile = await Profile.findOne({ userId: user._id }).lean().exec();

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
  } catch (error: any) {
    if (error.message === "User not found") {
      throw error;
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}

export async function getUserByEmail(
  email: string,
): Promise<IUserResponse | null> {
  if (!email || !isValidEmail(email)) {
    throw new Error("Valid email is required");
  }

  try {
    const user = await User.findOne({ email }).lean().exec();
    if (!user) return null;

    const profile = await Profile.findOne({ userId: user._id }).lean().exec();

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
  } catch (error: any) {
    throw new Error(`Failed to fetch user by email: ${error.message}`);
  }
}

export async function getProfileByUserId(
  userId: string,
): Promise<IProfile | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID format");
  }

  try {
    const profile = await Profile.findOne({ userId }).exec();
    return profile;
  } catch (error: any) {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }
}

export async function updateProfileDetails(
  userId: string,
  profileData: Partial<IProfileUpdate>,
) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID format");
  }

  try {
    const user = await getUserById(userId);

    const updates: any = {};

    if (profileData.userName) {
      const trimmedUserName = profileData.userName.trim().toLowerCase();
      if (!isValidUserName(trimmedUserName)) {
        throw new Error(
          "Username must be 3-20 characters and can only contain letters, numbers, and underscores",
        );
      }

      const existingUser = await Profile.findOne({
        userName: trimmedUserName,
        userId: { $ne: userId },
      })
        .lean()
        .exec();

      if (existingUser) {
        throw new Error("Username is already taken");
      }
      updates.userName = trimmedUserName;
    }

    if (profileData.firstName) {
      const trimmed = profileData.firstName.trim();
      if (trimmed.length < 2) {
        throw new Error("First name must be at least 2 characters");
      }
      updates.firstName = trimmed;
    }

    if (profileData.lastName) {
      const trimmed = profileData.lastName.trim();
      if (trimmed.length < 2) {
        throw new Error("Last name must be at least 2 characters");
      }
      updates.lastName = trimmed;
    }

    if (profileData.phoneNumber) {
      const trimmed = profileData.phoneNumber.trim();
      if (!isValidPhone(trimmed)) {
        throw new Error("Please provide a valid phone number");
      }
      updates.phoneNumber = trimmed;
    }

    if (profileData.address) {
      updates.address = profileData.address.trim();
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No valid fields to update");
    }

    const profile = await Profile.findOneAndUpdate({ userId }, updates, {
      new: true,
      runValidators: true,
    }).exec();

    if (!profile) {
      throw new Error(`Profile not found`);
    }

    return { user, profile };
  } catch (error: any) {
    if (
      error.message === "Profile not found" ||
      error.message.includes("Username is already taken")
    ) {
      throw error;
    }
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

export async function deleteUser(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID format");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findByIdAndDelete(userId).session(session).exec();
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`User not found`);
    }

    await Profile.findOneAndDelete({ userId }).session(session).exec();

    await session.commitTransaction();
    session.endSession();

    return { message: "User deleted successfully", userId };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    if (error.message === "User not found") {
      throw error;
    }
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

export async function changeUserRole(userId: string, newRole: UserRole) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID format");
  }

  if (!Object.values(UserRole).includes(newRole)) {
    throw new Error("Invalid role specified");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session).exec();
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`User not found`);
    }

    if (user.role === UserRole.SuperAdmin && newRole !== UserRole.SuperAdmin) {
      const superAdminCount = await User.countDocuments({
        role: UserRole.SuperAdmin,
        _id: { $ne: userId },
      })
        .session(session)
        .exec();

      if (superAdminCount === 0) {
        await session.abortTransaction();
        session.endSession();
        throw new Error("Cannot change role of the last superadmin");
      }
    }

    user.role = newRole;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return user;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    if (
      error.message === "User not found" ||
      error.message.includes("last superadmin")
    ) {
      throw error;
    }
    throw new Error(`Failed to change user role: ${error.message}`);
  }
}

export async function toggleUserActiveness(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID format");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session).exec();
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`User not found`);
    }

    if (user.role === UserRole.SuperAdmin) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("SuperAdmin accounts cannot be deactivated");
    }

    user.isActive = !user.isActive;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return user;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    if (
      error.message === "User not found" ||
      error.message.includes("SuperAdmin accounts cannot be deactivated")
    ) {
      throw error;
    }
    throw new Error(`Failed to toggle user activeness: ${error.message}`);
  }
}

export async function getUserAddress(userId: string): Promise<string | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID format");
  }

  try {
    const profile = await getProfileByUserId(userId);
    if (!profile) {
      throw new Error(`Profile not found`);
    }
    return profile.address || null;
  } catch (error: any) {
    if (error.message === "Profile not found") {
      throw error;
    }
    throw new Error(`Failed to fetch user address: ${error.message}`);
  }
}
