import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Organisation {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  settings?: Record<string, unknown>;
  active_tools?: string[];
  plan?: string;
}

interface OrganisationContextType {
  organisation: Organisation | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export const OrganisationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganisation = useCallback(async () => {
    if (!user) {
      setOrganisation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's organisation_id from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organisation_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user data:', userError);
        // Don't throw - user might not exist in users table yet
      }

      if (userData?.organisation_id) {
        // Fetch organisation details
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .select('id, name, logo_url, active_tools, plan, domain')
          .eq('id', userData.organisation_id)
          .maybeSingle();

        if (orgError) {
          console.error('Error fetching organisation:', orgError);
          throw orgError;
        }

        if (orgData) {
          setOrganisation({
            id: orgData.id,
            name: orgData.name || 'RT-IT-Hub',
            slug: orgData.domain || undefined,
            logo_url: orgData.logo_url || undefined,
            active_tools: orgData.active_tools || ['helpdesk', 'assets', 'subscriptions', 'updates', 'monitoring'],
            plan: orgData.plan || 'enterprise',
          });
        }
      } else {
        // No organisation found - set to null (RLS will handle tenant-based filtering)
        setOrganisation(null);
      }
    } catch (err) {
      console.error('Error in fetchOrganisation:', err);
      setError(err as Error);
      setOrganisation(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganisation();
  }, [fetchOrganisation]);

  return (
    <OrganisationContext.Provider value={{ 
      organisation, 
      loading, 
      error, 
      refetch: fetchOrganisation 
    }}>
      {children}
    </OrganisationContext.Provider>
  );
};

export const useOrganisation = () => {
  const context = useContext(OrganisationContext);
  if (context === undefined) {
    throw new Error('useOrganisation must be used within an OrganisationProvider');
  }
  return context;
};
