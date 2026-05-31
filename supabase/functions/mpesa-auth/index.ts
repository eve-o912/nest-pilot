import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Cache for OAuth token (in-memory, valid for 1 hour)
let cachedToken: { access_token: string; expires_at: number } | null = null;

serve(async (req) => {
  try {
    // Check if we have a valid cached token
    const now = Date.now();
    if (cachedToken && cachedToken.expires_at > now) {
      return new Response(
        JSON.stringify({ access_token: cachedToken.access_token }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Get credentials from environment variables
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const env = Deno.env.get("MPESA_ENV") || "sandbox";

    if (!consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({ error: "Missing M-Pesa credentials" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine base URL based on environment
    const baseUrl = env === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // Create Basic Auth header
    const authString = btoa(`${consumerKey}:${consumerSecret}`);

    // Request OAuth token from Daraja
    const response = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${authString}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return new Response(
        JSON.stringify({ error: "Failed to get OAuth token", details: error }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const accessToken = data.access_token;
    const expiresIn = data.expires_in || 3599; // Default to 1 hour

    // Cache the token
    cachedToken = {
      access_token: accessToken,
      expires_at: now + (expiresIn * 1000),
    };

    return new Response(
      JSON.stringify({ access_token: accessToken, expires_in: expiresIn }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in mpesa-auth:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
