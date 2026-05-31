import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    // This endpoint is called by Safaricom to validate incoming payments
    // For now, we accept all payments. Validation logic can be added later.
    
    // Log the payload for debugging
    const payload = await req.json();
    console.log("M-Pesa C2B Validation Request:", JSON.stringify(payload));

    // Always accept the payment
    return new Response(
      JSON.stringify({
        ResultCode: "0",
        ResultDesc: "Accepted",
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in mpesa-c2b-validate:", error);
    // Even on error, accept the payment to avoid blocking legitimate transactions
    return new Response(
      JSON.stringify({
        ResultCode: "0",
        ResultDesc: "Accepted",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
});
