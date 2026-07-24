import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define which routes require authentication.
// Adjust this array to match the actual protected routes in your app.
const isProtectedRoute = createRouteMatcher([
  '/',
  '/dashboard(.*)',
  '/campaigns(.*)',
  '/agents(.*)',
  '/call(.*)'
  // add any other routes that should be protected
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // auth.protect() automatically redirects to the sign-in URL if not authenticated
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
}
