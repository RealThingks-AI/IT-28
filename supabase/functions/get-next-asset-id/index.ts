import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tag format configuration (single-company, no org scoping needed)
    const { data: tagFormat, error: tagError } = await supabaseClient
      .from('itam_tag_format')
      .select('prefix, start_number, padding_length')
      .single();

    if (tagError) {
      console.error('Error fetching tag format:', tagError);
    }

    const prefix = tagFormat?.prefix || 'AS-';
    const paddingLength = (tagFormat?.start_number?.length ?? 0) || tagFormat?.padding_length || 4;

    const startNumberRaw = tagFormat?.start_number || '1';
    const parsedStart = parseInt(startNumberRaw, 10);
    const effectiveStart = Number.isNaN(parsedStart) ? 1 : parsedStart;
 
    // Call the database function to get the next number
    const { data: nextNumberData, error: nextNumberError } = await supabaseClient
      .rpc('get_next_asset_number', {});
 
    if (nextNumberError) {
      console.error('Error getting next asset number:', nextNumberError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate asset ID' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
 
    const rawNextNumber = typeof nextNumberData === 'number'
      ? nextNumberData
      : parseInt(String(nextNumberData ?? '0'), 10) || 1;
    const nextNumber = Math.max(rawNextNumber, effectiveStart);
    const paddedNumber = nextNumber.toString().padStart(paddingLength, '0');
    const nextAssetId = `${prefix}${paddedNumber}`;

    return new Response(
      JSON.stringify({ assetId: nextAssetId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-next-asset-id function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
