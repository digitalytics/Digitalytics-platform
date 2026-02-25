export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#004D3E] via-[#0a5f4a] to-[#166534] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
