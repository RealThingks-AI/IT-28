import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const TOKEN_EXPIRY_DAYS = 7;

function buildResponsePage(title: string, message: string, success: boolean): string {
  const color = success ? "#16a34a" : "#dc2626";
  const bgColor = success ? "#f0fdf4" : "#fef2f2";
  const icon = success ? "&#10004;" : "&#10008;";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.08); max-width: 440px; width: 100%; padding: 40px 32px; text-align: center; }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: ${bgColor}; color: ${color}; font-size: 24px; line-height: 56px; margin: 0 auto 20px; font-weight: bold; }
    h1 { color: ${color}; font-size: 20px; margin-bottom: 12px; font-weight: 600; }
    p { color: #4b5563; font-size: 14px; line-height: 1.6; }
    .close-hint { margin-top: 20px; padding: 12px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #6b7280; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="close-hint">&#10003; Your response has been recorded. You can safely close this tab.</div>
    <div class="footer">RT-IT-Hub Asset Management</div>
  </div>
</body>
</html>`;
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function validateToken(supabase: any, token: string) {
  const { data: confirmation, error } = await supabase
    .from("itam_asset_confirmations")
    .select("*, items:itam_asset_confirmation_items(*)")
    .eq("token", token)
    .maybeSingle();

  if (error || !confirmation) {
    return { error: "invalid" as const };
  }

  const createdAt = new Date(confirmation.created_at);
  const expiryDate = new Date(createdAt.getTime() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  if (new Date() > expiryDate) {
    await supabase.from("itam_asset_confirmations").update({ status: "expired" }).eq("id", confirmation.id);
    return { error: "expired" as const };
  }

  if (confirmation.status === "completed") {
    return { error: "completed" as const };
  }

  return { confirmation };
}

async function checkAndCompleteConfirmation(supabase: any, confirmationId: string) {
  // Check if ALL items now have a response
  const { data: items } = await supabase
    .from("itam_asset_confirmation_items")
    .select("id, response")
    .eq("confirmation_id", confirmationId);

  const allResponded = (items || []).every((it: any) => it.response === "confirmed" || it.response === "denied");
  if (allResponded && (items || []).length > 0) {
    await supabase.from("itam_asset_confirmations").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", confirmationId);
  }
}

async function notifyDeniedAssets(supabase: any, confirmation: any, deniedAssets: string[]) {
  if (deniedAssets.length === 0 || !confirmation.requested_by) return;
  const { data: reqUser } = await supabase.from("users").select("auth_user_id").eq("id", confirmation.requested_by).single();
  const { data: empUser } = await supabase.from("users").select("name, email").eq("id", confirmation.user_id).single();
  const empName = empUser?.name || empUser?.email || "An employee";

  if (reqUser?.auth_user_id) {
    await supabase.from("notifications").insert({
      user_id: reqUser.auth_user_id,
      title: "Asset Confirmation Denied",
      message: `${empName} denied ${deniedAssets.length} asset(s): ${deniedAssets.join(", ")}. Please review.`,
      type: "warning",
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createSupabaseAdmin();

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      const action = url.searchParams.get("action");
      const itemId = url.searchParams.get("item_id");

      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle individual item confirm/deny
      if ((action === "confirm_item" || action === "deny_item") && itemId) {
        const result = await validateToken(supabase, token);
        if (result.error === "invalid") return htmlResponse(buildResponsePage("Invalid Link", "This confirmation link is invalid or has already been used.", false), 404);
        if (result.error === "expired") return htmlResponse(buildResponsePage("Link Expired", "This confirmation link has expired. Please contact your IT department.", false), 410);
        if (result.error === "completed") return htmlResponse(buildResponsePage("Already Completed", "All assets in this confirmation have already been responded to.", true));

        const confirmation = result.confirmation!;
        const responseValue = action === "confirm_item" ? "confirmed" : "denied";
        const now = new Date().toISOString();

        // Find the item
        const item = (confirmation.items || []).find((it: any) => it.id === itemId);
        if (!item) {
          return htmlResponse(buildResponsePage("Asset Not Found", "This asset could not be found in the confirmation request.", false), 404);
        }

        if (item.response) {
          const alreadyStatus = item.response === "confirmed" ? "confirmed" : "denied";
          return htmlResponse(buildResponsePage("Already Responded", `This asset (${item.asset_tag || item.asset_name || "Unknown"}) has already been ${alreadyStatus}.`, true));
        }

        // Update the item
        await supabase.from("itam_asset_confirmation_items").update({
          response: responseValue,
          responded_at: now,
        }).eq("id", itemId);

        // Update asset status
        if (item.asset_id) {
          await supabase.from("itam_assets").update({
            confirmation_status: responseValue,
            ...(responseValue === "confirmed" ? { last_confirmed_at: now } : {}),
          }).eq("id", item.asset_id);
        }

        // Check if all items responded
        await checkAndCompleteConfirmation(supabase, confirmation.id);

        // Notify for denied
        if (responseValue === "denied") {
          await notifyDeniedAssets(supabase, confirmation, [item.asset_tag || item.asset_name || item.asset_id]);
        }

        const assetLabel = item.asset_tag || item.asset_name || "Asset";
        if (responseValue === "confirmed") {
          return htmlResponse(buildResponsePage("Asset Confirmed", `You have confirmed "${assetLabel}". Thank you for your response.`, true));
        } else {
          return htmlResponse(buildResponsePage("Asset Denied", `You have denied "${assetLabel}". Your IT department has been notified.`, false));
        }
      }

      // Handle bulk confirm_all / deny_all
      if (action === "confirm_all" || action === "deny_all") {
        const result = await validateToken(supabase, token);
        if (result.error === "invalid") return htmlResponse(buildResponsePage("Invalid Link", "This confirmation link is invalid or has already been used.", false), 404);
        if (result.error === "expired") return htmlResponse(buildResponsePage("Link Expired", "This confirmation link has expired. Please contact your IT department.", false), 410);
        if (result.error === "completed") return htmlResponse(buildResponsePage("Already Completed", "This confirmation has already been submitted. No further action is needed.", true));

        const confirmation = result.confirmation!;
        const responseValue = action === "confirm_all" ? "confirmed" : "denied";
        const now = new Date().toISOString();
        const deniedAssets: string[] = [];

        for (const item of (confirmation.items || [])) {
          if (item.response) continue; // Skip already responded items
          await supabase.from("itam_asset_confirmation_items").update({
            response: responseValue,
            responded_at: now,
          }).eq("id", item.id);

          if (item.asset_id) {
            await supabase.from("itam_assets").update({
              confirmation_status: responseValue,
              ...(responseValue === "confirmed" ? { last_confirmed_at: now } : {}),
            }).eq("id", item.asset_id);

            if (responseValue === "denied") {
              deniedAssets.push(item.asset_tag || item.asset_name || item.asset_id);
            }
          }
        }

        await supabase.from("itam_asset_confirmations").update({
          status: "completed",
          completed_at: now,
        }).eq("id", confirmation.id);

        await notifyDeniedAssets(supabase, confirmation, deniedAssets);

        const itemCount = (confirmation.items || []).length;
        if (action === "confirm_all") {
          return htmlResponse(buildResponsePage(
            "All Assets Confirmed",
            `You have confirmed all ${itemCount} asset(s) assigned to you. Thank you!`,
            true
          ));
        } else {
          return htmlResponse(buildResponsePage(
            "All Assets Denied",
            `You have denied all ${itemCount} asset(s). Your IT department has been notified and will follow up.`,
            false
          ));
        }
      }

      // Default GET: return confirmation data as JSON (for the React page)
      const { data: confirmation, error } = await supabase
        .from("itam_asset_confirmations")
        .select("*, items:itam_asset_confirmation_items(*)")
        .eq("token", token)
        .maybeSingle();

      if (error || !confirmation) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const createdAt = new Date(confirmation.created_at);
      const expiryDate = new Date(createdAt.getTime() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      if (new Date() > expiryDate) {
        await supabase.from("itam_asset_confirmations").update({ status: "expired" }).eq("id", confirmation.id);
        return new Response(JSON.stringify({ error: "This confirmation link has expired", expired: true }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (confirmation.status === "completed") {
        return new Response(JSON.stringify({ error: "Already completed", completed: true, completed_at: confirmation.completed_at }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: user } = await supabase.from("users").select("name, email").eq("id", confirmation.user_id).single();

      return new Response(JSON.stringify({
        id: confirmation.id,
        status: confirmation.status,
        requested_at: confirmation.requested_at,
        user_name: user?.name || user?.email || "Unknown",
        items: confirmation.items,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { token, items } = await req.json();

      if (!token || !items || !Array.isArray(items)) {
        return new Response(JSON.stringify({ error: "token and items[] required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: confirmation } = await supabase
        .from("itam_asset_confirmations")
        .select("id, user_id, requested_by, status")
        .eq("token", token)
        .maybeSingle();

      if (!confirmation || confirmation.status !== "pending") {
        return new Response(JSON.stringify({ error: "Invalid, expired, or already completed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const deniedAssets: string[] = [];

      for (const item of items) {
        const { id: itemId, response, deny_reason } = item;
        if (!itemId || !["confirmed", "denied"].includes(response)) continue;

        await supabase.from("itam_asset_confirmation_items").update({
          response,
          deny_reason: response === "denied" ? (deny_reason || null) : null,
          responded_at: now,
        }).eq("id", itemId);

        const { data: itemData } = await supabase
          .from("itam_asset_confirmation_items")
          .select("asset_id, asset_tag, asset_name")
          .eq("id", itemId)
          .single();

        if (itemData?.asset_id) {
          await supabase.from("itam_assets").update({
            confirmation_status: response,
            last_confirmed_at: response === "confirmed" ? now : undefined,
          }).eq("id", itemData.asset_id);

          if (response === "denied") {
            deniedAssets.push(itemData.asset_tag || itemData.asset_name || itemData.asset_id);
          }
        }
      }

      await supabase.from("itam_asset_confirmations").update({
        status: "completed",
        completed_at: now,
      }).eq("id", confirmation.id);

      if (deniedAssets.length > 0 && confirmation.requested_by) {
        const { data: reqUser } = await supabase.from("users").select("auth_user_id").eq("id", confirmation.requested_by).single();
        const { data: empUser } = await supabase.from("users").select("name, email").eq("id", confirmation.user_id).single();
        const empName = empUser?.name || empUser?.email || "An employee";

        if (reqUser?.auth_user_id) {
          await supabase.from("notifications").insert({
            user_id: reqUser.auth_user_id,
            title: "Asset Confirmation Denied",
            message: `${empName} denied ${deniedAssets.length} asset(s): ${deniedAssets.join(", ")}. Please review.`,
            type: "warning",
          });
        }
      }

      return new Response(JSON.stringify({ success: true, denied_count: deniedAssets.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("asset-confirmation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
