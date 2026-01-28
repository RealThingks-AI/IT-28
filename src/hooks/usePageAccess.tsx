import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { useCallback } from "react";

export function usePageAccess(route: string) {
  const { user } = useAuth();
  const { organisation } = useOrganisation();
  const queryClient = useQueryClient();

  const { data: hasAccess, isLoading, error } = useQuery({
    queryKey: ["page-access", route, user?.id, organisation?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc("check_page_access", { 
        _route: route 
      });
      
      if (error) {
        console.error("Error checking page access:", error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id && !!organisation?.id,
    staleTime: 30 * 1000, // 30 seconds for faster updates
  });

  const invalidateAccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["page-access"] });
  }, [queryClient]);

  return { 
    hasAccess: hasAccess ?? false, 
    isLoading,
    error: error as Error | null,
    invalidateAccess,
  };
}

// Hook to check multiple routes at once
export function useMultiplePageAccess(routes: string[]) {
  const { user } = useAuth();
  const { organisation } = useOrganisation();

  const results = useQuery({
    queryKey: ["page-access-multiple", routes.join(","), user?.id, organisation?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const accessMap: Record<string, boolean> = {};
      
      await Promise.all(
        routes.map(async (route) => {
          const { data, error } = await supabase.rpc("check_page_access", { 
            _route: route 
          });
          accessMap[route] = error ? false : (data as boolean);
        })
      );
      
      return accessMap;
    },
    enabled: !!user?.id && !!organisation?.id,
    staleTime: 30 * 1000,
  });

  return {
    accessMap: results.data ?? {},
    isLoading: results.isLoading,
  };
}
