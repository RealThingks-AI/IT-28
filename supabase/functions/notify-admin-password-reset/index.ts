import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAzureAccessToken(): Promise<string> {
  const tenantId = Deno.env.get("AZURE_TENANT_ID");
  const clientId = Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    console.error("Missing Azure credentials:", { 
      hasTenantId: !!tenantId, 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret 
    });
    throw new Error("Azure credentials not configured");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  console.log("Requesting Azure access token...");
  
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Azure auth failed:", errorText);
    throw new Error(`Azure authentication failed: ${errorText}`);
  }

  const data = await response.json();
  console.log("Azure access token obtained successfully");
  return data.access_token;
}

async function sendEmailViaGraph(
  accessToken: string, 
  toEmails: string[], 
  subject: string, 
  htmlBody: string
): Promise<void> {
  const senderEmail = Deno.env.get("AZURE_SENDER_EMAIL");
  
  if (!senderEmail) {
    throw new Error("AZURE_SENDER_EMAIL not configured");
  }

  console.log(`Sending email to ${toEmails.length} recipient(s) via Graph API...`);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { 
            contentType: "HTML", 
            content: htmlBody 
          },
          toRecipients: toEmails.map(email => ({ 
            emailAddress: { address: email } 
          })),
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to send email via Graph:", errorText);
    throw new Error(`Failed to send email: ${errorText}`);
  }

  console.log("Email sent successfully");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName } = await req.json();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "User email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password reset request received for: ${userEmail}`);

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all admin emails from the organisation
    const { data: admins, error: adminError } = await supabase
      .from("users")
      .select("email, name")
      .eq("role", "admin")
      .eq("status", "active");

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw new Error("Failed to fetch administrators");
    }

    const adminEmails = admins?.map(a => a.email).filter(Boolean) || [];
    
    if (adminEmails.length === 0) {
      console.warn("No active administrators found");
      throw new Error("No administrators found to notify");
    }

    console.log(`Found ${adminEmails.length} administrator(s) to notify`);

    // Get Azure access token
    const accessToken = await getAzureAccessToken();
    
    // Format the current date/time
    const requestTime = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC"
    });

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #667eea; }
          .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 16px; color: #1f2937; margin-top: 4px; }
          .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>A user has requested a password reset and requires administrator assistance.</p>
            
            <div class="info-box">
              <div class="label">User Email</div>
              <div class="value">${userEmail}</div>
            </div>
            
            <div class="info-box">
              <div class="label">User Name</div>
              <div class="value">${userName || "Not provided"}</div>
            </div>
            
            <div class="info-box">
              <div class="label">Requested At (UTC)</div>
              <div class="value">${requestTime}</div>
            </div>
            
            <p style="margin-top: 20px;">
              <strong>Action Required:</strong> Please log in to the RT-IT-Hub admin panel to reset this user's credentials.
            </p>
          </div>
          <div class="footer">
            This is an automated message from RT-IT-Hub. Please do not reply directly to this email.
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to all admins
    await sendEmailViaGraph(
      accessToken,
      adminEmails,
      `🔐 Password Reset Request - ${userName || userEmail}`,
      emailHtml
    );

    console.log("Password reset notification sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent to administrators" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in notify-admin-password-reset:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
