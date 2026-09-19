import { injectable } from "inversify";
import { prisma } from "../prisma.js";
import { BadRequestError } from "../common/classes/error.class.js";

export interface Image {
  id: bigint;
  name: string;
  prompt: string;
  status: "generation" | "failed" | "completed";
  completedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}

@injectable()
export class ImagesRepository {
  private selectedImageData = {
    id: true,
    name: true,
    prompt: true,
    status: true,
    completedAt: true,
    updatedAt: true,
    createdAt: true,
  };

  async create(userId: string, name: string, prompt: string): Promise<Image> {
    const image = await prisma.$transaction(async (tc) => {
      const image = await tc.image.create({
        data: {
          userId,
          name,
          prompt,
          status: "generation",
        },
        select: this.selectedImageData,
      });

      await tc.imageOutbox.create({
        data: {
          imageId: image.id,
          value: {
            id: image.id.toString(),
            name: image.name,
            prompt: image.prompt,
          },
        },
      });

      return image;
    });

    return image;
  }

  async removeFromOutbox(imageId: bigint) {
    await prisma.imageOutbox.delete({
      where: {
        imageId: imageId,
      },
    });
  }

  async getById(userId: string, imageId: bigint): Promise<Image | null> {
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId: userId,
      },
      select: this.selectedImageData,
    });

    return image;
  }

  async getAllByUserId(
    userId: string,
    limit: number,
    page: number,
  ): Promise<{ images: Image[]; currentPage: number; totalPages: number }> {
    if (page < 1) {
      throw new BadRequestError('"page" must be greated that 1');
    } else if (limit < 1 || limit > 100) {
      throw new BadRequestError('"limit" must be greated that 1 and less than 100');
    }

    const skip = (page - 1) * limit;

    const elements = await prisma.image.findMany({
      where: {
        userId: userId,
      },
      select: this.selectedImageData,
      skip: skip,
      take: limit,
    });

    const count = await prisma.image.count({
      where: {
        userId: userId,
      },
    });

    return { images: elements, currentPage: page, totalPages: Math.ceil(count / limit) };
  }

  async deleteById(userId: string, imageId: bigint): Promise<void> {
    await prisma.image.deleteMany({
      where: {
        id: imageId,
        userId: userId,
      },
    });
  }
}
