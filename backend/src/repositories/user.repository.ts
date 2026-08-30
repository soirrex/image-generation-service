import { injectable } from "inversify";
import { prisma } from "../prisma.js";

export interface User {
  id: string;

  email: string;
  password: string;

  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class UserRepository {
  async getById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        email: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async getByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
        email: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async create(email: string, password: string): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: email,
        password: password,
      },
      select: {
        id: true,
        email: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}
