import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h2 className="text-3xl font-bold mb-4">404 - Page Not Found</h2>
      <p className="text-muted-foreground mb-6">Could not find the requested resource</p>
      <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
        Return Home
      </Link>
    </div>
  )
}
