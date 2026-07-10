// components/shared/ComingSoon.tsx
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
      <h1 className="font-display text-2xl font-medium text-[#111111]">{title}</h1>
      <p className="text-sm text-gray-400">This section is being built next.</p>
    </div>
  );
}
