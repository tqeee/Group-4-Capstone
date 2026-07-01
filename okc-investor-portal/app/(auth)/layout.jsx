// Shared shell for the unauthenticated auth pages (login, forgot-password, MFA),
// mirroring the (investor) route group's layout.jsx.
export default function AuthLayout({ children }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
