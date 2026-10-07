import { Link, useNavigate } from "react-router";
import { AuthForm } from "../components/AuthForm";
import { PageLayout } from "../components/PageLayout";
import { writeIsAuthed } from "../components/authStorage";
import { useAuth } from "../hooks/useAuth";
import type { AuthDto } from "../hooks/useAuth";

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (dto: AuthDto) => {
    try {
      await login(dto);
      writeIsAuthed();
      navigate("/");
    } catch {
      // the error is already stored in the hook's `error` and shown in AuthForm
    }
  };

  return (
    <PageLayout>
      <AuthForm mode="login" isLoading={isLoading} error={error} onSubmit={handleSubmit} />
      <p className="mt-4 text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </PageLayout>
  );
}
