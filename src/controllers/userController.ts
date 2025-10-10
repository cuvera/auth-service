import { Request, Response } from 'express';
import userService from '../services/userService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { ICreateUserRequest, IApiResponse, IUserResponse, IUserWithRolesResponse } from '../interfaces';

export const createUser = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password }: ICreateUserRequest = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  const user = await userService.createUser({ name, email, password });

  const userResponse: IUserResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const response: IApiResponse<{ user: IUserResponse }> = {
    status: 'success',
    data: {
      user: userResponse,
    },
  };

  res.status(201).json(response);
});

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new AppError('Tenant ID not found', 400);
  }
  const users = await userService.getAllUsers(tenantId);

  const usersResponse: IUserWithRolesResponse[] = users.map(user => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  const response: IApiResponse<{ users: IUserWithRolesResponse[] }> = {
    status: 'success',
    results: users.length,
    data: {
      users: usersResponse,
    },
  };

  res.status(200).json(response);
});

export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await userService.getUserById(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userResponse: IUserResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const response: IApiResponse<{ user: IUserResponse }> = {
    status: 'success',
    data: {
      user: userResponse,
    },
  };

  res.status(200).json(response);
});

export const addUserRoles = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { roles } = req.body;

  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    throw new AppError('Roles array is required and must not be empty', 400);
  }

  const nonStringRoles = roles.filter(role => typeof role !== 'string');
  if (nonStringRoles.length > 0) {
    throw new AppError('All roles must be strings', 400);
  }

  const user = await userService.addUserRoles(id, roles);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userResponse: IUserWithRolesResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const response: IApiResponse<{ user: IUserWithRolesResponse }> = {
    status: 'success',
    data: {
      user: userResponse,
    },
  };

  res.status(200).json(response);
});

export const removeUserRoles = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { roles } = req.body;

  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    throw new AppError('Roles array is required and must not be empty', 400);
  }

  const nonStringRoles = roles.filter(role => typeof role !== 'string');
  if (nonStringRoles.length > 0) {
    throw new AppError('All roles must be strings', 400);
  }

  try {
    const user = await userService.removeUserRoles(id, roles);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const userResponse: IUserWithRolesResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response: IApiResponse<{ user: IUserWithRolesResponse }> = {
      status: 'success',
      data: {
        user: userResponse,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    if (error.message === 'User must have at least one role') {
      throw new AppError('Cannot remove all roles. User must have at least one role.', 400);
    }
    throw error;
  }
});