import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, ChevronUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarUserSectionProps {
  collapsed?: boolean;
}

export function SidebarUserSection({ collapsed = false }: SidebarUserSectionProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  if (!user) return null;

  const displayName =
    currentUser?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatarUrl = user.user_metadata?.avatar_url;

  const trigger = (
    <button
      className={cn(
        "flex items-center gap-2 w-full rounded-lg px-2 py-2 text-left hover:bg-accent transition-colors",
        collapsed && "justify-center"
      )}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <>
          <span className="text-xs font-medium truncate flex-1">{displayName}</span>
          <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
        </>
      )}
    </button>
  );

  return (
    <div className="border-t p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {collapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                <TooltipContent side="right">{displayName}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            trigger
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-48">
          <DropdownMenuItem onClick={() => navigate("/account")}>
            <User className="h-4 w-4 mr-2" />
            My Account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
