import type { ImageItem } from "../hooks/useImages";
import { ImageCard } from "./ImageCard";

interface ImageListProps {
  images: ImageItem[];
  isLoading: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onRetry: () => void;
}

export function ImageList({ images, isLoading, deletingId, onDelete, onRetry }: ImageListProps) {
  if (isLoading && images.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">Loading images...</p>;
  }

  if (images.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-gray-500">No images yet. Generate your first one above.</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          isDeleting={deletingId === image.id}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
