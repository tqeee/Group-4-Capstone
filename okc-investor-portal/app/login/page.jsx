'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import buildingImage from "@/images/building.jpg";

const LOGIN_ENDPOINT = "http://localhost:5000/api/auth/login";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": crypto.randomUUID(), // Optional: matches your server tracking setup
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError(data.message || "Invalid email or password.");
          return;
        }

        setError(data.message || "Unable to sign in. Please try again.");
        return;
      }

      // 🛠️ FIX 1: Look for 'mfaToken' instead of 'mfaSessionToken' to match Express server response
      if (!data.mfaToken) {
        setError("Login succeeded, but no MFA session token was returned.");
        return;
      }

      // 🛠️ FIX 2: Save the key using the exact string ('mfaSessionToken') your MFA page looks for
      sessionStorage.setItem("mfaSessionToken", data.mfaToken);
      
      // 🛠️ FIX 3: Dynamic redirect using the route path path delivered by the backend (data.next evaluates to "/MFA")
      router.push(data.next || "/MFA");
      
    } catch {
      setError("Unable to connect to the authentication server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-white">
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
          <div className="mb-20 flex items-baseline gap-8">
            <span className="text-8xl font-extrabold tracking-tight text-white">
              OKC
            </span>

            <span className="text-4xl font-medium tracking-[0.28em] text-[#6ea0ff]">
              PARTNERS
            </span>
          </div>

          <h1 className="mb-7 text-5xl font-bold leading-tight">
            Your Portfolio,
            <br />
            <span className="text-[#1f6bff]">Crystal Clear</span>
          </h1>

          <p className="mb-12 max-w-xl text-xl leading-9 text-blue-100/90">
            Access real-time portfolio performance, track your P&amp;L,
            and manage your investments through our secure investor portal.
          </p>
        </div>
      </section>

      <section className="flex w-1/2 items-center justify-center bg-[#fbfcff] px-24">
        <form className="w-full max-w-xl" onSubmit={handleSubmit}>
          <h2 className="mb-4 text-5xl font-bold text-[#071437]">
            Welcome back
          </h2>

          <p className="mb-14 text-xl text-[#6b7894]">
            Sign in to access your investor portal
          </p>

          {error ? (
            <div
              role="alert"
              className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-base font-medium text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="mb-8">
            <label
              htmlFor="email"
              className="mb-3 block text-lg font-medium text-slate-900"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="investor@example.com"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-[#d8e1ef] bg-white px-6 py-5 text-lg text-slate-800 outline-none placeholder:text-[#7c8aa5] focus:border-[#1f6bff]"
            />
          </div>

          <div className="mb-10">
            <div className="mb-3 flex justify-between">
              <label
                htmlFor="password"
                className="text-lg font-medium text-slate-900"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-lg font-medium text-[#1f6bff] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-[#d8e1ef] bg-white px-6 py-5 text-lg text-slate-800 outline-none placeholder:text-[#7c8aa5] focus:border-[#1f6bff]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-[#1554ff] py-5 text-xl font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#0047ff] disabled:cursor-not-allowed disabled:bg-[#8fa8ff]"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-12 text-center text-lg leading-8 text-[#7c8aa5]">
            This portal is for authorised investors only.
            <br />
            Contact your fund manager for access.
          </p>
        </form>
      </section>
    </main>
  );
}