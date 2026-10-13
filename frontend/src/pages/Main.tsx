import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { GenerateImageForm } from "../components/GenerateImageForm";
import { ImageList } from "../components/ImageList";
import { PageLayout } from "../components/PageLayout";
import { Pagination } from "../components/Pagination";
import { clearIsAuthed, readIsAuthed } from "../components/authStorage";
import { ApiError } from "../hooks/useApi";
import { useImages } from "../hooks/useImages";
import type { GenerateImageDto, ImageItem } from "../hooks/useImages";

function isUnauthorized(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 401;
  return e instanceof Error && /401|unauthorized/i.test(e.message);
}

export function MainPage() {
  const isAuthed = readIsAuthed();
  const navigate = useNavigate();

  const listApi = useImages();
  const generateApi = useImages();
  const deleteApi = useImages();

  const [images, setImages] = useState<ImageItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number) => {
      try {
        const result = await listApi.getAll(nextPage, 15);
        setImages(result.images);
        setPage(result.currentPage);
        setTotalPages(result.totalPages);
      } catch (e) {
        if (isUnauthorized(e)) {
          clearIsAuthed();
          navigate("/register");
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAuthed) void load(1);
    else navigate("/register");
  }, [isAuthed, load, navigate]);

  const hasPending = images.some((image) => image.status === "generation");

  useEffect(() => {
    if (!isAuthed || !hasPending) return;
  }, [isAuthed, hasPending, page, load]);

  const handleGenerate = async (dto: GenerateImageDto) => {
    try {
      await generateApi.generate(dto);
      await load(1);
    } catch {
      // the error is already stored in the hook's `error` and shown in the form
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteApi.remove(id);
      setImages((prev) => prev.filter((image) => image.id !== id));
      await load(page);
    } catch {
      // the error is already stored in the hook's `error` and shown below the gallery
    } finally {
      setDeletingId(null);
    }
  };

  const handlePageChange = (nextPage: number) => {
    void load(nextPage);
  };

  if (!isAuthed) {
    return (
      <PageLayout>
        <section className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Home</h1>
          <p className="text-sm text-gray-600">Log in or create an account to continue.</p>
          <div className="flex gap-2">
            <Link
              to="/login"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Sign up
            </Link>
          </div>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <section className="flex w-full max-w-4xl flex-col gap-6">
        <GenerateImageForm
          isSubmitting={generateApi.isLoading}
          submitError={generateApi.error}
          onSubmit={handleGenerate}
        />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My images</h2>
          <button
            type="button"
            onClick={() => void load(page)}
            disabled={listApi.isLoading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            {listApi.isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {listApi.error !== null && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {listApi.error.message}
          </p>
        )}
        {deleteApi.error !== null && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {deleteApi.error.message}
          </p>
        )}

        <ImageList
          images={images}
          isLoading={listApi.isLoading}
          deletingId={deletingId}
          onDelete={handleDelete}
          onRetry={() => void load(page)}
        />

        <div className="flex justify-center">
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      </section>
    </PageLayout>
  );
}
