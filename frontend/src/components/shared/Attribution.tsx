// components/shared/Attribution.tsx

const GITHUB_URL = "https://github.com/ahsan-mohamed";
const LINKEDIN_URL = "https://linkedin.com/in/ahsan-mohamed-17515a2a5";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/>
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>
    </svg>
  );
}

export function Attribution({ variant = "footer" }: { variant?: "footer" | "sidebar" }) {
  if (variant === "sidebar") {
    return (
      <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-3 py-3 text-xs text-gray-400">
        <span>Built by Ahsan</span>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-[#111111]">
          <GithubIcon className="h-3.5 w-3.5" />
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-[#111111]">
          <LinkedinIcon className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
      <span>Developed by Ahsan Mohamed</span>
      <span className="text-gray-300">·</span>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 transition hover:text-[#111111]"
      >
        <GithubIcon className="h-3.5 w-3.5" />
        GitHub
      </a>
      <span className="text-gray-300">·</span>
      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 transition hover:text-[#111111]"
      >
        <LinkedinIcon className="h-3.5 w-3.5" />
        LinkedIn
      </a>
    </div>
  );
}
