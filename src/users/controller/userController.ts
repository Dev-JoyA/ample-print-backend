import { Request, Response } from "express";
import * as userService from "../service/userService.js";
import { UserRole } from "../model/userModel.js";

export async function getAllUsersController(req: Request, res: Response) {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ users });
  } catch (err: any) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getUserByIdController(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const user = await userService.getUserById(userId);
    res.status(200).json({ user });
  } catch (err: any) {
    console.error("Error fetching user:", err);
    res.status(404).json({ message: err.message });
  }
}

export async function updateProfileController(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    const result = await userService.updateProfileDetails(userId, profileData);
    res.status(200).json(result);
  } catch (err: any) {
    console.error("Error updating profile:", err);
    res.status(400).json({ message: err.message });
  }
}

export async function deleteUserController(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const user = await userService.deleteUser(userId);
    res.status(200).json({ message: "User deleted successfully", user });
  } catch (err: any) {
    console.error("Error deleting user:", err);
    res.status(404).json({ message: err.message });
  }
}

export async function changeUserRoleController(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { newRole } = req.body;
    if (!Object.values(UserRole).includes(newRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await userService.changeUserRole(userId, newRole);
    res.status(200).json({ message: "User role updated", user });
  } catch (err: any) {
    console.error("Error changing user role:", err);
    res.status(400).json({ message: err.message });
  }
}

export async function toggleUserActivenessController(
  req: Request,
  res: Response,
) {
  try {
    const { userId } = req.params;
    const user = await userService.toggleUserActiveness(userId);
    res.status(200).json({ message: "User activeness toggled", user });
  } catch (err: any) {
    console.error("Error toggling activeness:", err);
    res.status(400).json({ message: err.message });
  }
}

export async function getUserAddressController(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const address = await userService.getUserAddress(userId);
    res.status(200).json({ address });
  } catch (err: any) {
    console.error("Error fetching user address:", err);
    res.status(404).json({ message: err.message });
  }
}
