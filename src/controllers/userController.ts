import { Request, Response } from 'express';
import userService from '../services/userService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { ICreateUserRequest, IApiResponse, IUserResponse } from '../interfaces';

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
  const users = await userService.getAllUsers();

  const usersResponse: IUserResponse[] = users.map(user => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  const response: IApiResponse<{ users: IUserResponse[] }> = {
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
