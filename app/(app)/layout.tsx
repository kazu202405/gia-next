import { AppSidebar } from "@/components/app/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />
      {/* mobile: top header（h-14）分の上余白／ desktop: 左サイドバー（w-64）分の左余白 */}
      <main className="lg:pl-64 pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
