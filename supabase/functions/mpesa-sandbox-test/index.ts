import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    // This function triggers the Daraja sandbox simulator for testing
    // Only use this in development mode
    
    const { ShortCode, CommandID, Amount, Msisdn, BillRefNumber } = await req.json();

    if (!ShortCode || !CommandID || !Amount || !Msisdn) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const env = Deno.env.get("MPESA_ENV") || "sandbox";

    if (env !== "sandbox") {
      return new Response(
        JSON.stringify({ error: "Sandbox test only available in sandbox mode" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get OAuth token from mpesa-auth function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authResponse = await fetch(
      `${supabaseUrl}/functions/v1/mpesa-auth`,
      {
        method: "GET",
      }
    );

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to get OAuth token" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { access_token } = await authResponse.json();

    // Trigger Daraja sandbox simulator
    const baseUrl = "https://sandbox.safaricom.co.ke";
    const simulateResponse = await fetch(
      `${baseUrl}/mpesa/c2b/v1/simulate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ShortCode,
          CommandID,
          Amount,
          Msisdn,
          BillRefNumber: BillRefNumber || "test001",
        }),
      }
    );

    if (!simulateResponse.ok) {
      const error = await simulateResponse.text();
      return new Response(
        JSON.stringify({ error: "Failed to trigger sandbox simulator", details: error }),
        { status: simulateResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await simulateResponse.json();

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in mpesa-sandbox-test:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
