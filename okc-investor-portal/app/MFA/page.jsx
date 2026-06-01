'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import buildingImage from "@/images/building.jpg";

const VERIFY_MFA_ENDPOINT = "http://localhost:5000/api/auth/verify-mfa";
const DASHBOARD_PATH = "/investor";

export default function MFAPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    
    // Check what key you are using on your login page. 
    // It should match "mfaToken" or "mfaSessionToken"
    const mfaToken = sessionStorage.getItem("mfaSessionToken");

    if (!mfaToken) {
      setError("Your MFA session has expired. Please sign in again.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(VERIFY_MFA_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": crypto.randomUUID(), // For backend tracking metrics
        },
        // 🛠️ FIXED PAYLOAD: Map 'code' to 'pin' and inject the session token into the body
        body: JSON.stringify({ 
          mfaToken: mfaToken, 
          pin: code 
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError(data.message || "Invalid or expired verification code.");
          return;
        }

        setError(data.message || "Unable to verify the code. Please try again.");
        return;
      }

      if (!data.token) {
        setError("MFA verification succeeded, but no access token was returned.");
        return;
      }

      // Store final persistent session application token
      sessionStorage.setItem("token", data.token);
      sessionStorage.removeItem("mfaSessionToken");
      
      // 🛠️ FLEXIBLE REDIRECT: Fall back to your dynamic backend-delivered path (data.next) 
      // if it exists, otherwise fall back to your hardcoded DASHBOARD_PATH
      router.push(data.next || DASHBOARD_PATH);
    } catch {
      setError("Unable to connect to the authentication server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCodeChange(event) {
    const nextCode = event.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(nextCode);
  }

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
      <form
        className="w-full max-w-5xl rounded-3xl bg-white px-16 py-14 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <div className="mb-14 flex items-end gap-6">
          <span className="text-7xl font-extrabold tracking-tight text-black">
            OKC
          </span>

          <span className="pb-2 text-4xl font-light tracking-[0.5em] text-blue-500">
            PARTNERS
          </span>
        </div>

        <h2 className="mb-4 text-5xl font-bold text-slate-900">
          Enter verification code
        </h2>

        <p className="mb-12 text-2xl text-slate-500">
          We sent a 6-digit code to your authenticator app.
        </p>

        {error ? (
          <div
            role="alert"
            className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-lg font-medium text-red-700"
          >
            {error}
          </div>
        ) : null}

        <label htmlFor="mfa-code" className="sr-only">
          Verification code
        </label>

        <input
          id="mfa-code"
          type="text"
          value={code}
          onChange={handleCodeChange}
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="000000"
          required
          className="mb-12 h-28 w-full rounded-2xl border border-slate-300 text-center text-5xl font-semibold tracking-[0.5em] text-slate-900 outline-none transition placeholder:tracking-normal placeholder:text-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-200"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-blue-600 py-6 text-2xl font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isSubmitting ? "Verifying..." : "Verify and continue"}
        </button>
      </form>
    </main>
  );
}