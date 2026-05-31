import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

serve(async (req) => {
  try {
    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { shortcode } = await req.json();
    if (!shortcode) {
      return new Response(
        JSON.stringify({ error: "Missing shortcode" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const env = Deno.env.get("MPESA_ENV") || "sandbox";

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user and get user_id from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get OAuth token from mpesa-auth function
    const authResponse = await fetch(
      `${supabaseUrl}/functions/v1/mpesa-auth`,
      {
        method: "GET",
        headers: {
          "Authorization": authHeader,
        },
      }
    );

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to get OAuth token" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { access_token } = await authResponse.json();

    // Determine base URL based on environment
    const baseUrl = env === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // Get the project reference for callback URLs
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) {
      return new Response(
        JSON.stringify({ error: "Invalid Supabase URL" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const confirmationUrl = `https://${projectRef}.supabase.co/functions/v1/mpesa-c2b-callback`;
    const validationUrl = `https://${projectRef}.supabase.co/functions/v1/mpesa-c2b-validate`;

    // Register C2B URLs with Daraja
    const registerResponse = await fetch(
      `${baseUrl}/mpesa/c2b/v1/registerurl`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ShortCode: shortcode,
          ResponseType: "Completed",
          ConfirmationURL: confirmationUrl,
          ValidationURL: validationUrl,
        }),
      }
    );

    if (!registerResponse.ok) {
      const error = await registerResponse.text();
      return new Response(
        JSON.stringify({ error: "Failed to register C2B URLs", details: error }),
        { status: registerResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const registerData = await registerResponse.json();

    // Update mpesa_settings to mark as registered
    const { error: updateError } = await supabase
      .from("mpesa_settings")
      .upsert({
        user_id: user.id,
        shortcode: shortcode,
        c2b_registered: true,
      }, {
        onConflict: "user_id",
      });

    if (updateError) {
      console.error("Error updating mpesa_settings:", updateError);
      // Don't fail the request if update fails, but log it
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: registerData,
        confirmationUrl,
        validationUrl,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in mpesa-c2b-register:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
