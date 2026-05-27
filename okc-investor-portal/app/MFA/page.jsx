import buildingImage from "@/images/building.jpg";

export default function MFAPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0, 32, 96, 0.78), rgba(0, 32, 96, 0.82)),
          url(${buildingImage.src})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* MFA Card */}
      <section className="w-full max-w-5xl rounded-3xl bg-white px-16 py-14 shadow-2xl">
        
        {/* Logo */}
        <div className="mb-14 flex items-end gap-6">
          <span className="text-7xl font-extrabold tracking-tight text-black">
            OKC
          </span>

          <span className="pb-2 text-4xl font-light tracking-[0.5em] text-blue-500">
            PARTNERS
          </span>
        </div>

        {/* Heading */}
        <h2 className="mb-4 text-5xl font-bold text-slate-900">
          Enter verification code
        </h2>

        {/* Description */}
        <p className="mb-12 text-2xl text-slate-500">
          We sent a 6-digit code to your authenticator app.
        </p>

        {/* OTP Inputs */}
        <div className="mb-12 flex gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              className="h-28 w-28 rounded-2xl border border-slate-300 text-center text-5xl font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-200"
            />
          ))}
        </div>

        {/* Button */}
        <button className="w-full rounded-2xl bg-blue-600 py-6 text-2xl font-semibold text-white transition hover:bg-blue-700">
          Verify and continue
        </button>
      </section>
    </main>
  );
}



