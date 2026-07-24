import { redirect } from 'next/navigation'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { SearchUsers } from './SearchUsers'
import { removeRole, setRole } from './_actions'
import { ShieldCheck, UserCheck, ShieldAlert, ArrowLeft, Users, Shield } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AdminDashboard(props: {
  searchParams: Promise<{ search?: string }>
}) {
  const { sessionClaims } = await auth()

  // Protect the page from users who are not admins
  if (sessionClaims?.metadata?.role !== 'admin') {
    redirect('/')
  }

  const searchParamsResolved = await props.searchParams
  const query = searchParamsResolved.search

  const client = await clerkClient()

  let users: any[] = []
  try {
    if (query) {
      const response = await client.users.getUserList({ query })
      users = response.data
    } else {
      // List initial top users if no search query provided
      const response = await client.users.getUserList({ limit: 20 })
      users = response.data
    }
  } catch (err) {
    console.error('Failed to fetch user list from Clerk:', err)
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Admin Navigation Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Admin Control Center
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  RBAC Active
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage user roles and system access permissions
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="h-9 border-border bg-transparent text-foreground hover:bg-muted text-xs rounded-lg gap-2"
            asChild
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to App Dashboard
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Intro banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4">
          <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Role-Based Access Control System</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This protected dashboard is restricted exclusively to users with the <strong className="text-primary font-mono">admin</strong> role.
              Use the search bar below to find users and manage their role assignments (`admin`, `moderator`, or default user).
            </p>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-xl p-4">
          <SearchUsers />
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            {query ? (
              <span>Showing search results for &ldquo;{query}&rdquo; ({users.length})</span>
            ) : (
              <span>Showing recent users ({users.length})</span>
            )}
          </div>
        </div>

        {/* Users Table / List */}
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          {users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs text-muted-foreground">
                {query ? `No matching accounts found for "${query}".` : 'No users currently registered.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">User</div>
                <div className="col-span-4">Email</div>
                <div className="col-span-2">Current Role</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* User items */}
              {users.map((u) => {
                const primaryEmail = u.emailAddresses.find((e: any) => e.id === u.primaryEmailAddressId)?.emailAddress || u.emailAddresses[0]?.emailAddress || 'No Email'
                const userRole = (u.publicMetadata?.role as string) || 'User (Default)'
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Unnamed User'

                return (
                  <div key={u.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors">
                    {/* User name & avatar */}
                    <div className="col-span-4 flex items-center gap-3">
                      {u.imageUrl ? (
                        <img src={u.imageUrl} alt={fullName} className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase">
                          {fullName.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{fullName}</p>
                        <p className="text-[11px] font-mono text-muted-foreground">ID: {u.id}</p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="col-span-4 text-sm text-muted-foreground truncate">
                      {primaryEmail}
                    </div>

                    {/* Role badge */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        userRole === 'admin'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          : userRole === 'moderator'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {userRole === 'admin' && <UserCheck className="h-3 w-3" />}
                        {userRole === 'moderator' && <ShieldAlert className="h-3 w-3" />}
                        {userRole.toUpperCase()}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      {userRole !== 'admin' && (
                        <form action={setRole}>
                          <input type="hidden" value={u.id} name="id" />
                          <input type="hidden" value="admin" name="role" />
                          <button
                            type="submit"
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                          >
                            Make Admin
                          </button>
                        </form>
                      )}

                      {userRole !== 'moderator' && (
                        <form action={setRole}>
                          <input type="hidden" value={u.id} name="id" />
                          <input type="hidden" value="moderator" name="role" />
                          <button
                            type="submit"
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                          >
                            Make Mod
                          </button>
                        </form>
                      )}

                      {(userRole === 'admin' || userRole === 'moderator') && (
                        <form action={removeRole}>
                          <input type="hidden" value={u.id} name="id" />
                          <button
                            type="submit"
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 transition-colors cursor-pointer"
                          >
                            Remove Role
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
