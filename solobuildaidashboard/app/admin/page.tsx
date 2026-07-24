import { redirect } from 'next/navigation'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { SearchUsers } from './SearchUsers'
import { removeRole, setRole } from './_actions'
import { ShieldCheck, UserCheck, ShieldAlert, ArrowLeft, Users, Shield, MoreVertical, Activity, Clock, CalendarDays, Ban } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  let totalUsersCount = 0;

  try {
    const totalCountRes = await client.users.getCount();
    totalUsersCount = totalCountRes;

    if (query) {
      const response = await client.users.getUserList({ query })
      users = response.data
    } else {
      // List initial top users if no search query provided
      const response = await client.users.getUserList({ limit: 50, orderBy: '-created_at' })
      users = response.data
    }
  } catch (err) {
    console.error('Failed to fetch user list from Clerk:', err)
  }

  // Calculate simple stats based on loaded users
  const adminCount = users.filter((u) => u.publicMetadata?.role === 'admin').length;
  const modCount = users.filter((u) => u.publicMetadata?.role === 'moderator').length;
  const bannedCount = users.filter((u) => u.banned).length;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-12">
      {/* Admin Navigation Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Admin Control Center
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase text-primary">
                  RBAC Active
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage user roles, system access, and security permissions
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
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Total Users</div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{totalUsersCount}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3 text-emerald-500" />
              Platform registered accounts
            </div>
          </div>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-indigo-400">Administrators</div>
              <UserCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-indigo-100">{adminCount}</div>
            <div className="text-xs text-indigo-400/80 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Full system access
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-amber-400">Moderators</div>
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-amber-100">{modCount}</div>
            <div className="text-xs text-amber-400/80 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Partial system access
            </div>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-red-400">Restricted</div>
              <Ban className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-100">{bannedCount}</div>
            <div className="text-xs text-red-400/80 flex items-center gap-1">
              <Ban className="h-3 w-3" />
              Banned or locked accounts
            </div>
          </div>
        </div>

        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-xl p-4 shadow-sm">
          <SearchUsers />
          <div className="text-xs text-muted-foreground flex items-center gap-2 font-medium bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
            <Users className="h-3.5 w-3.5 text-primary" />
            {query ? (
              <span>Found {users.length} results for &ldquo;{query}&rdquo;</span>
            ) : (
              <span>Displaying recent {users.length} users</span>
            )}
          </div>
        </div>

        {/* Users Table / List */}
        <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
          {users.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-muted mx-auto flex items-center justify-center">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No users found</h3>
              <p className="text-xs">
                {query ? `We couldn't find any accounts matching "${query}".` : 'No users are currently registered in the system.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1000px] divide-y divide-border">
                {/* Header row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3.5 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-3">User</div>
                  <div className="col-span-3">Contact</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-3">Activity</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* User items */}
                {users.map((u) => {
                  const primaryEmail = u.emailAddresses.find((e: any) => e.id === u.primaryEmailAddressId)?.emailAddress || u.emailAddresses[0]?.emailAddress || 'No Email'
                  const userRole = (u.publicMetadata?.role as string) || 'User'
                  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Unnamed User'
                  
                  // Dates formatting
                  const createdDate = new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  const lastActiveDate = u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'

                  return (
                    <div key={u.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors group">
                      {/* User name & avatar */}
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="relative shrink-0">
                          {u.imageUrl ? (
                            <img src={u.imageUrl} alt={fullName} className="h-10 w-10 rounded-full object-cover ring-1 ring-border shadow-sm" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold uppercase ring-1 ring-primary/20">
                              {fullName.slice(0, 2)}
                            </div>
                          )}
                          {u.banned && (
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-card flex items-center justify-center">
                              <Ban className="h-2 w-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate" title={u.id}>ID: {u.id.split('_')[1] || u.id}</p>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="col-span-3 min-w-0 flex flex-col justify-center">
                        <p className="text-sm text-muted-foreground truncate">{primaryEmail}</p>
                      </div>

                      {/* Role badge */}
                      <div className="col-span-2 flex items-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          userRole === 'admin'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                            : userRole === 'moderator'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-muted/50 text-muted-foreground border-border'
                        }`}>
                          {userRole === 'admin' && <UserCheck className="h-3 w-3" />}
                          {userRole === 'moderator' && <ShieldAlert className="h-3 w-3" />}
                          {userRole === 'User' && <Users className="h-3 w-3" />}
                          {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                        </span>
                      </div>

                      {/* Activity Dates */}
                      <div className="col-span-3 flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3" />
                          <span>Joined {createdDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>Active {lastActiveDate}</span>
                        </div>
                      </div>

                      {/* Action buttons (Dropdown) */}
                      <div className="col-span-1 flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Manage Roles</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {userRole !== 'admin' && (
                              <DropdownMenuItem asChild>
                                <form action={setRole} className="w-full cursor-pointer">
                                  <input type="hidden" value={u.id} name="id" />
                                  <input type="hidden" value="admin" name="role" />
                                  <button type="submit" className="w-full flex items-center gap-2 text-left text-indigo-400">
                                    <UserCheck className="h-4 w-4" />
                                    Make Admin
                                  </button>
                                </form>
                              </DropdownMenuItem>
                            )}

                            {userRole !== 'moderator' && (
                              <DropdownMenuItem asChild>
                                <form action={setRole} className="w-full cursor-pointer">
                                  <input type="hidden" value={u.id} name="id" />
                                  <input type="hidden" value="moderator" name="role" />
                                  <button type="submit" className="w-full flex items-center gap-2 text-left text-amber-400">
                                    <ShieldAlert className="h-4 w-4" />
                                    Make Moderator
                                  </button>
                                </form>
                              </DropdownMenuItem>
                            )}

                            {(userRole === 'admin' || userRole === 'moderator') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <form action={removeRole} className="w-full cursor-pointer">
                                    <input type="hidden" value={u.id} name="id" />
                                    <button type="submit" className="w-full flex items-center gap-2 text-left text-red-400 hover:text-red-300">
                                      <Shield className="h-4 w-4" />
                                      Remove Special Role
                                    </button>
                                  </form>
                                </DropdownMenuItem>
                              </>
                            )}

                            {userRole === 'User' && (
                              <DropdownMenuItem disabled className="text-muted-foreground text-xs italic justify-center mt-1">
                                User is on default role
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
