import { injectable } from "inversify";
import { prisma } from "../prisma.js";

export interface Image {
  id: bigint;
  userId: string;
  name: string;
  prompt: string;
  status: "generation" | "failed" | "completed";
  width: number;
  height: number;
  completedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}

@injectable()
export class ImagesRepository {
  async create(
    userId: string,
    name: string,
    prompt: string,
    width: number,
    height: number,
  ): Promise<Image> {
    const image = await prisma.$transaction(async (tc) => {
      const image = await tc.image.create({
        data: {
          userId,
          name,
          prompt,
          status: "generation",
          width,
          height,
        },
      });

      await tc.imageOutbox.create({
        data: {
          imageId: image.id,
          value: {
            id: image.id.toString(),
            name: image.name,
            prompt: image.prompt,
            height: height,
            width: width,
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

  async getById(imageId: bigint): Promise<Image | null> {
    const image = await prisma.image.findUnique({
      where: {
        id: imageId,
      },
    });

    return image;
  }
}
