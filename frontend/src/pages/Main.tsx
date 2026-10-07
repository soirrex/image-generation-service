import { Link } from "react-router";
import { PageLayout } from "../components/PageLayout";
import { readIsAuthed } from "../components/authStorage";

export function MainPage() {
  const isAuthed = readIsAuthed();

  return (
    <PageLayout>
      <section className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Home</h1>
        {isAuthed ? (
          <p className="text-sm text-gray-600">You are signed in.</p>
        ) : (
          <>
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
          </>
        )}
      </section>
    </PageLayout>
  );
}
