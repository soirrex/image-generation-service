import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { clearIsAuthed, readIsAuthed } from "./authStorage";

export function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  // Subscribe to navigation so the header re-renders and re-reads the auth cookie.
  useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isAuthed = readIsAuthed();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Even if the server returns an error, log out locally
    } finally {
      clearIsAuthed();
      setIsLoggingOut(false);
      navigate("/");
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="text-base font-semibold text-gray-900">
          Image generation
        </Link>
        {isAuthed ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
