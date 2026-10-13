import { useCallback } from "react";
import { useApi } from "./useApi";
import type { MessageResponse } from "./useApi";

export interface ImageItem {
  id: string;
  name: string;
  prompt: string;
  status: "generation" | "failed" | "completed";
  imageUrl: string | null;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateImageDto {
  name: string;
  prompt: string;
}

interface RawImagesListResponse {
  totalPages: number;
  currentPage: number;
  images: ImageItem[];
}

export interface ImagesListResponse {
  totalPages: number;
  currentPage: number;
  images: ImageItem[];
}

export function useImages() {
  const { isLoading, error, clearError, call } = useApi();

  const generate = useCallback(
    (dto: GenerateImageDto) => call<MessageResponse>("POST", "/api/images", dto),
    [call],
  );

  const getAll = useCallback(
    async (page = 1, limit = 12): Promise<ImagesListResponse> => {
      const raw = await call<RawImagesListResponse>(
        "GET",
        `/api/images?page=${page}&limit=${limit}`,
      );
      return {
        totalPages: raw.totalPages,
        currentPage: raw.currentPage ?? 1,
        images: raw.images as ImageItem[],
      };
    },
    [call],
  );

  const remove = useCallback(
    (id: string) => call<MessageResponse>("DELETE", `/api/images/${id}`),
    [call],
  );

  return { isLoading, error, clearError, generate, getAll, remove };
}
