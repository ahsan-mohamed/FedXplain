// pages/LoginPage.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/shared/Button";
import { AlertCircle, Sparkles } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginDemo } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login(values);
      navigate("/portal/dashboard");
    } catch {
      setServerError("Incorrect email or password.");
    }
  }

  async function handleTryDemo() {
    setServerError(null);
    setIsDemoLoading(true);
    try {
      await loginDemo();
      navigate("/portal/dashboard");
    } catch {
      setServerError("Could not start the demo right now. Please try again.");
    } finally {
      setIsDemoLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <Link to="/" className="font-display mb-10 block text-center text-xl font-semibold text-[#111111]">
          FedXplain
        </Link>

        <Button
          type="button"
          variant="secondary"
          isLoading={isDemoLoading}
          onClick={handleTryDemo}
          className="mb-6 w-full border-[#0f1b3d]/20"
        >
          <Sparkles className="h-4 w-4" />
          Try the demo — no signup needed
        </Button>

        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-xs text-gray-400">or sign in</span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">Email</label>
            <input
              {...register("email")}
              type="email"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#0f1b3d]"
              placeholder="you@bank.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-600">Password</label>
            <input
              {...register("password")}
              type="password"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#0f1b3d]"
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {serverError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-[#0f1b3d]">Register</Link>
        </p>
      </motion.div>
    </div>
  );
}
