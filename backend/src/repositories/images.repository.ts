import { injectable } from "inversify";
import { prisma } from "../prisma.js";

export interface Image {
  id: bigint;
  userId: string;
  name: string;
  promt: string;
  status: "generation" | "failed" | "completed";
  completedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}

@injectable()
export class ImagesRepository {
  async create(userId: string, name: string, promt: string): Promise<Image> {
    const image = await prisma.image.create({
      data: {
        userId,
        name,
        promt,
        status: "generation",
      },
    });

    return image;
  }
}
