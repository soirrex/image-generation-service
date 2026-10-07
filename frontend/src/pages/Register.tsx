import { Link, useNavigate } from "react-router";
import { AuthForm } from "../components/AuthForm";
import { PageLayout } from "../components/PageLayout";
import { writeIsAuthed } from "../components/authStorage";
import { useAuth } from "../hooks/useAuth";
import type { AuthDto } from "../hooks/useAuth";

export function RegisterPage() {
  const { register, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (dto: AuthDto) => {
    try {
      await register(dto);
      writeIsAuthed();
      navigate("/");
    } catch {
      // the error is already stored in the hook's `error` and shown in AuthForm
    }
  };

  return (
    <PageLayout>
      <AuthForm mode="register" isLoading={isLoading} error={error} onSubmit={handleSubmit} />
      <p className="mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </PageLayout>
  );
}
