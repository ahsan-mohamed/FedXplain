// pages/RegisterPage.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/shared/Button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().optional(),
  role: z.enum(["admin", "fraud_analyst", "auditor"]),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "fraud_analyst" },
  });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      await registerUser(values);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setServerError(detail ?? "Registration failed. Try a different email.");
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

        <h1 className="font-display mb-1 text-2xl font-medium text-[#111111]">Create account</h1>
        <p className="mb-8 text-sm text-gray-500">Register for portal access.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">Full name</label>
            <input
              {...register("full_name")}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#0f1b3d]"
              placeholder="Jane Doe"
            />
          </div>

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
              placeholder="At least 8 characters"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-600">Role</label>
            <select
              {...register("role")}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#0f1b3d]"
            >
              <option value="fraud_analyst">Fraud Analyst</option>
              <option value="auditor">Auditor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {serverError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Account created — redirecting to login...
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[#0f1b3d]">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
