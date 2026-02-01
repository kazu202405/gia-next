export function Footer() {
  return (
    <footer className="bg-[#0f1f33] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xl font-bold">GIA</div>
          <div className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Global Information Academy. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
