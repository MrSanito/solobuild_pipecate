'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const SearchUsers = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.get('search') || ''
  const [searchTerm, setSearchTerm] = useState(currentQuery)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`${pathname}?search=${encodeURIComponent(searchTerm.trim())}`)
    } else {
      router.push(pathname)
    }
  }

  const handleClear = () => {
    setSearchTerm('')
    router.push(pathname)
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="search"
          name="search"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9 pr-8 h-10 border-border bg-card text-foreground rounded-lg text-sm placeholder:text-muted focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/50"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Button
        type="submit"
        className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-lg px-4"
      >
        Search
      </Button>
    </form>
  )
}
