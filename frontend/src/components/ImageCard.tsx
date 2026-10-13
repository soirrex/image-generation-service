import type { ImageItem } from "../hooks/useImages";

interface ImageCardProps {
  image: ImageItem;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

const STYLES: Record<string, string> = {
  generation: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export function ImageCard({ image, isDeleting, onDelete }: ImageCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex h-48 items-center justify-center bg-gray-100">
        {image.imageUrl !== null ? (
          <img
            src={image.imageUrl}
            alt={image.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-4 text-center text-sm text-gray-400">
            {image.status === "generation" ? "Generating..." : "No preview"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-gray-900" title={image.name}>
            {image.name}
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STYLES[image.status]}`}
          >
            {image.status}
          </span>
        </div>

        <p className="line-clamp-2 text-xs text-gray-600" title={image.prompt}>
          {image.prompt}
        </p>

        {image.error !== null && (
          <p role="alert" className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">
            {image.error}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <time className="text-xs text-gray-400">
            {new Date(image.createdAt).toLocaleString()}
          </time>
          <button
            type="button"
            onClick={() => onDelete(image.id)}
            disabled={isDeleting}
            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}
