export function Hero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/images/hero.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/35 z-[1]" />

      {/* Content */}
      <div className="relative z-[2] max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-8 tracking-tight">
          心理学とDXで<br />会社が自走する仕組みをデザイン
        </h1>
        <p className="text-lg sm:text-xl text-white/90 font-semibold leading-relaxed">
          成果を生むのは、仕組みと人の成長。<br />
          その力を、ともに引き出します。
        </p>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-[120px] overflow-hidden z-[1]">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,60 C480,120 960,0 1440,60 L1440,120 L0,120 Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
