import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "okc_auth_token";
const PUBLIC_ROUTES = new Set(["/", "/login", "/MFA", "/forgot-password"]);

export function auth(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
