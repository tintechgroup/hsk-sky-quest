import AdminNavigation from "@/components/admin/AdminNavigation";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020b13] text-white lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <AdminNavigation />

      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}