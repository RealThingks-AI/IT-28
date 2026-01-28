import { Navigate } from "react-router-dom";
import { usePageAccess } from "@/hooks/usePageAccess";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProtectedRouteProps {
  children: React.ReactNode;
  route: string;
}

export function PageProtectedRoute({ children, route }: PageProtectedRouteProps) {
  const { hasAccess, isLoading } = usePageAccess(route);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
