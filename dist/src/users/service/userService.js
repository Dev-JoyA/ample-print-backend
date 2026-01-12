import { User } from "../model/userModel.js";
import { Profile } from "../model/profileModel.js";
export async function getAllUsers() {
    const users = await User.find();
    const profiles = await Profile.find({ userId: { $in: users.map(u => u._id) } });
    return users.map(u => {
        const doc = u;
        const profile = profiles.find(p => p.userId.equals(doc._id));
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
        };
    });
}
export async function getUserById(userId) {
    const user = await User.findById(userId).exec();
    if (!user)
        throw new Error(`User with ID ${userId} not found`);
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
export async function getUserByEmail(email) {
    const user = await User.findOne({ email }).exec();
    if (!user)
        return null;
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
        address: profile?.address
    };
}
export async function getProfileByUserId(userId) {
    return Profile.findOne({ userId }).exec();
}
export async function updateProfileDetails(userId, profileData) {
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
        if (profileData.address)
            profileData.address = profileData.address.trim();
        const profile = await Profile.findOneAndUpdate({ userId }, profileData, { new: true }).exec();
        if (!profile)
            throw new Error(`Profile for user ${userId} not found`);
        return { user, profile };
    }
    catch (err) {
        throw new Error(`Error updating profile: ${err.message}`);
    }
}
export async function deleteUser(userId) {
    try {
        const user = await User.findByIdAndDelete(userId).exec();
        if (!user)
            throw new Error(`User with ID ${userId} not found`);
        await Profile.findOneAndDelete({ userId }).exec();
        return user;
    }
    catch (err) {
        throw new Error(`Error deleting user: ${err.message}`);
    }
}
export async function changeUserRole(userId, newRole) {
    try {
        const user = await User.findByIdAndUpdate(userId, { role: newRole }, { new: true }).exec();
        if (!user)
            throw new Error(`User with ID ${userId} not found`);
        return user;
    }
    catch (err) {
        throw new Error(`Error changing user role: ${err.message}`);
    }
}
export async function toggleUserActiveness(userId) {
    try {
        const user = await User.findById(userId).exec();
        if (!user)
            throw new Error(`User with ID ${userId} not found`);
        user.isActive = !user.isActive;
        await user.save();
        return user;
    }
    catch (err) {
        throw new Error(`Error toggling user activeness: ${err.message}`);
    }
}
export async function getUserAddress(userId) {
    try {
        const profile = await getProfileByUserId(userId);
        if (!profile)
            throw new Error(`Profile for user ${userId} not found`);
        return profile.address || null;
    }
    catch (err) {
        throw new Error(`Error fetching user address: ${err.message}`);
    }
}
//# sourceMappingURL=userService.js.map