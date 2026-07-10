// components/layout/PublicNavbar.tsx
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export function PublicNavbar() {
  const navigate = useNavigate();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 z-50 w-full border-b border-gray-100/80 bg-white/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-12">
        <Link to="/" className="font-display text-lg font-semibold tracking-tight text-[#111111]">
          FedXplain
        </Link>
        <div className="hidden items-center gap-10 text-sm text-gray-600 md:flex">
          <a href="#technology" className="transition hover:text-[#111111]">Technology</a>
          <a href="#architecture" className="transition hover:text-[#111111]">Architecture</a>
          <a href="#research" className="transition hover:text-[#111111]">Research</a>
          <a href="#contact" className="transition hover:text-[#111111]">Contact</a>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="rounded-full bg-[#0f1b3d] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#1e2f5c]"
        >
          Login
        </button>
      </div>
    </motion.nav>
  );
}
