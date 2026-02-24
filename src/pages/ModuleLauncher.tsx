import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useHelpdeskStats } from "@/hooks/useHelpdeskStats";
import { useITAMStats } from "@/hooks/useITAMStats";
import { useSubscriptionStats } from "@/hooks/useSubscriptionStats";
import { useUpdateStats } from "@/hooks/useUpdateManager";
import { useUsers } from "@/hooks/useUsers";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSessionStore } from "@/stores/useSessionStore";
import {
  Ticket, Package, CreditCard, RefreshCw, Shield, LucideIcon,
  ChevronRight, ChevronDown, Plus, PackagePlus, BarChart3, Calendar,
  User, Settings, LogOut,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import appLogo from "@/assets/app-logo.png";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  url: string;
  color: string;
  borderColor: string;
  stat?: string;
  badge?: string;
  adminOnly?: boolean;
}

export default function ModuleLauncher() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const storeName = useSessionStore(s => s.name);
  const userName = storeName || user?.user_metadata?.name || "there";
  const userEmail = user?.email || "";

  const { data: ticketStats } = useHelpdeskStats();
  const { data: assetStats } = useITAMStats();
  const { data: subStats } = useSubscriptionStats();
  const { data: updateStats } = useUpdateStats();
  const { data: users } = useUsers();

  if (!loading && !user) return <Navigate to="/login" replace />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const modules: ModuleCard[] = [
    {
      id: "tickets",
      title: "Tickets",
      description: "Manage helpdesk tickets, problems, SLA & queues",
      icon: Ticket,
      url: "/tickets",
      color: "bg-blue-500/10 text-blue-600",
      borderColor: "border-t-blue-500",
      stat: ticketStats ? `${ticketStats.open} open` : undefined,
      badge: ticketStats ? `${ticketStats.slaCompliance}% SLA` : undefined,
    },
    {
      id: "assets",
      title: "Assets",
      description: "IT asset management, tracking & lifecycle",
      icon: Package,
      url: "/assets/dashboard",
      color: "bg-emerald-500/10 text-emerald-600",
      borderColor: "border-t-emerald-500",
      stat: assetStats ? `${assetStats.totalAssets} assets` : undefined,
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      description: "Software subscriptions, licenses & payments",
      icon: CreditCard,
      url: "/subscription",
      color: "bg-violet-500/10 text-violet-600",
      borderColor: "border-t-violet-500",
      stat: subStats ? `${subStats.activeTools} active` : undefined,
    },
    {
      id: "updates",
      title: "System Updates",
      description: "Windows updates, device patching & compliance",
      icon: RefreshCw,
      url: "/system-updates",
      color: "bg-amber-500/10 text-amber-600",
      borderColor: "border-t-amber-500",
      stat: updateStats ? `${updateStats.totalDevices} devices` : undefined,
    },
    {
      id: "admin",
      title: "Administration",
      description: "Users, roles, audit logs, system & backup",
      icon: Shield,
      url: "/admin/users",
      color: "bg-rose-500/10 text-rose-600",
      borderColor: "border-t-rose-500",
      stat: users ? `${users.length} users` : undefined,
      adminOnly: true,
    },
  ];

  const quickActions = [
    { label: "New Ticket", icon: Plus, url: "/tickets/create" },
    { label: "Add Asset", icon: PackagePlus, url: "/assets/add" },
    { label: "Reports", icon: BarChart3, url: "/tickets/reports" },
  ];

  const visibleModules = modules.filter(m => !m.adminOnly);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={appLogo} alt="RT-IT-Hub" className="w-8 h-8" />
            <span className="text-base font-semibold text-primary">RT-IT-Hub</span>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full text-xs h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => navigate("/admin/users")}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin Panel</span>
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
              </>
            )}
            <NotificationPanel />
            <Separator orientation="vertical" className="h-5 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <Avatar className="h-8 w-8 border-2 border-primary/30 ring-1 ring-primary/10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[11px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-semibold text-foreground truncate max-w-[120px]">
                    {userName}
                  </span>
                  {/* ChevronDown removed */}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">{userName}</p>
                    
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/account")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 flex-1">
        {/* Greeting */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{greeting}, {userName}</h1>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{today}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-8">
          {quickActions.map(action => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(action.url)}
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleModules.map(mod => (
            <Card
              key={mod.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 group border-t-4 ${mod.borderColor}`}
              onClick={() => navigate(mod.url)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3.5 rounded-xl ${mod.color}`}>
                    <mod.icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {mod.title}
                      </h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      {mod.stat && (
                        <span className="text-xs font-medium text-primary">{mod.stat}</span>
                      )}
                      {mod.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {mod.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-10 flex items-center justify-between text-xs text-muted-foreground">
          <span>RT-IT-Hub</span>
          <span>{today}</span>
        </div>
      </footer>
    </div>
  );
}
