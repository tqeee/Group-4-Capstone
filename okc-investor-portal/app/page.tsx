import { redirect } from 'next/navigation'

// The root path is never shown directly: the proxy sends signed-out visitors to
// /login and signed-in visitors to /investor. This redirect is the fallback for
// any request that reaches the route directly.
export default function Home() {
  redirect('/investor')
}
