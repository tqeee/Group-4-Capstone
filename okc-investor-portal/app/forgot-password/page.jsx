import Link from "next/link";
import buildingImage from "@/images/building.jpg";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen bg-white">
      {/* LEFT PANEL */}
      <section
        className="relative flex w-1/2 flex-col justify-center overflow-hidden px-20 text-white"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 26, 88, 0.82), rgba(0, 26, 88, 0.86)),
            url(${buildingImage.src})
          `,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="max-w-2xl">
          
          {/* Branding */}
          <div className="mb-20 flex items-baseline gap-8">
            <span className="text-8xl font-extrabold tracking-tight text-white">
              OKC
            </span>

            <span className="text-4xl font-medium tracking-[0.28em] text-[#6ea0ff]">
              PARTNERS
            </span>
          </div>

          {/* Heading */}
          <h1 className="mb-7 text-5xl font-bold leading-tight">
            Your Portfolio,
            <br />
            <span className="text-[#1f6bff]">
              Crystal Clear
            </span>
          </h1>

          {/* Description */}
          <p className="mb-12 max-w-xl text-xl leading-9 text-blue-100/90">
            Access real-time portfolio performance, track your P&amp;L,
            and manage your investments through our secure investor portal.
          </p>
        </div>
      </section>

      {/* RIGHT PANEL */}
      <section className="flex w-1/2 items-center justify-center bg-[#fbfcff] px-24">
        <div className="w-full max-w-xl">

          <h2 className="mb-4 text-5xl font-bold text-[#071437]">
            Reset password
          </h2>

          <p className="mb-14 text-xl leading-8 text-[#6b7894]">
            Enter your email address and we&apos;ll send you a link
            to reset your password
          </p>

          <form>
            <div className="mb-8">

              <label className="mb-3 block text-lg font-medium text-slate-900">
                Email address
              </label>

              <input
                type="email"
                placeholder="investor@example.com"
                className="w-full rounded-2xl border border-[#d8e1ef] bg-white px-6 py-5 text-lg text-slate-800 outline-none placeholder:text-[#7c8aa5] focus:border-[#1f6bff]"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#1554ff] py-5 text-xl font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#0047ff]"
            >
              Send reset link
            </button>
          </form>

          <div className="mt-12 text-center">
            <Link
              href="/login"
              className="text-lg font-medium text-[#1f6bff] hover:underline"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, text }) {
  return (
    <div className="flex items-center gap-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0d47a1]/70 text-xl">
        {icon}
      </div>

      <p className="text-xl font-medium text-white">
        {text}
      </p>
    </div>
  );
}