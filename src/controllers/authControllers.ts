import { Request, Response } from 'express';
import { serialize } from 'cookie';
import {
  signUpService,
  signInService,
  createAdminService,
  createSuperAdminService,
  deactivateAdminService,
  reactivateAdminService,
  forgotPasswordService,
  resetPasswordService,
  SignUpData,
  SignInData
} from '../services/authService.js';
import { authenticateToken } from '../utils/auth.js';
import { checkSuperAdmin } from '../middleware/authorization.js';

export const signUp = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { firstName, lastName, userName, email, password, phoneNumber, address } = req.body;

    const userData: SignUpData = {
      firstName,
      lastName,
      userName, 
      email,
      password,
      phoneNumber,
      address
    };

    const { user, profile } = await signUpService(userData);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: user.userId,
        email: user.email,
        userName: profile.userName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('SignUp error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const signIn = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { email, password } = req.body;

    const credentials: SignInData = {
      email,
      password
    };

    const { user, profile, accessToken, refreshToken } = await signInService(credentials);

    // Set HTTP-only cookies
    const accessCookie = serialize('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 // 1 hour
    });

    const refreshCookie = serialize('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
    
    res.status(200).json({
      success: true,
      message: 'Sign in successful',
      data: {
        accessToken,
        userId: user.userId,
        userName: profile.userName,
        role: user.role,
        email: user.email,
        firstName: profile.firstName,
        lastName: profile.lastName
      }
    });
  } catch (error: any) {
    console.error('SignIn error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('Invalid') ? 401 : 
                      error.message.includes('inactive') ? 403 : 400;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

export const adminSignUp = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { firstName, lastName, userName, email, password, phoneNumber, address } = req.body;

    const userData: SignUpData = {
      firstName,
      lastName,
      userName,
      email,
      password,
      phoneNumber,
      address
    };

    const superAdmin = {
      email: req.user.email,
      userName: req.user.userName
    };

    const { user, profile } = await createAdminService(userData, superAdmin);
    
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        userId: user.userId,
        email: user.email,
        userName: profile.userName,
        role: user.role,
        firstName: profile.firstName,
        lastName: profile.lastName
      }
    });
  } catch (error: any) {
    console.error('AdminSignUp error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const superAdminSignUp = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { firstName, lastName, userName, email, password, phoneNumber, address } = req.body;

    const userData: SignUpData = {
      firstName,
      lastName,
      userName,
      email,
      password,
      phoneNumber,
      address
    };

    const { user, profile } = await createSuperAdminService(userData);
    
    res.status(201).json({
      success: true,
      message: 'SuperAdmin created successfully',
      data: {
        userId: user.userId,
        email: user.email,
        userName: profile.userName,
        role: user.role,
        firstName: profile.firstName,
        lastName: profile.lastName
      }
    });
  } catch (error: any) {
    console.error('SuperAdminSignUp error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const deactivateAdmin = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const superAdmin = {
      email: req.user.email,
      userName: req.user.userName
    };

    await deactivateAdminService(email, superAdmin);
    
    res.status(200).json({
      success: true,
      message: `Admin ${email} deactivated successfully`
    });
  } catch (error: any) {
    console.error('DeactivateAdmin error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('already deactivated') ? 400 : 400;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

export const reactivateAdmin = async (req: Request, res: Response): Promise<Response | Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const superAdmin = {
      email: req.user.email,
      userName: req.user.userName
    };

    await reactivateAdminService(email, superAdmin);
    
    res.status(200).json({
      success: true,
      message: `Admin ${email} reactivated successfully`
    });
  } catch (error: any) {
    console.error('ReactivateAdmin error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('already active') ? 400 : 400;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<Response | Response | void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = await forgotPasswordService(email);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('ForgotPassword error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('inactive') ? 403 : 400;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<Response | Response | void> => {
  try {
    const { token, password, confirmPassword } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirmation are required'
      });
    }

    const result = await resetPasswordService(token, password, confirmPassword);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('ResetPassword error:', error);
    
    const statusCode = error.message.includes('Invalid') ? 400 : 
                      error.message.includes('expired') ? 400 :
                      error.message.includes('not found') ? 404 : 400;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<Response | Response | void> => {
  try {
    // Clear HTTP-only cookies
    const accessCookie = serialize('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });

    const refreshCookie = serialize('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });

    res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
    
    res.status(200).json({
      success: true,
      message: 'Signed out successfully'
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<Response | Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error: any) {
    console.error('GetCurrentUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};