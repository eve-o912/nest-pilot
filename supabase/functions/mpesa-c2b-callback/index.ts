import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

serve(async (req) => {
  try {
    // This endpoint is called by Safaricom to confirm a completed payment
    const payload = await req.json();
    console.log("M-Pesa C2B Callback:", JSON.stringify(payload));

    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      OrgAccountBalance,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = payload;

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user_id by matching BusinessShortCode to mpesa_settings.shortcode
    const { data: settingsData, error: settingsError } = await supabase
      .from("mpesa_settings")
      .select("user_id")
      .eq("shortcode", BusinessShortCode)
      .single();

    if (settingsError || !settingsData) {
      console.error("Unknown shortcode:", BusinessShortCode);
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Unknown shortcode" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const user_id = settingsData.user_id;

    // Parse TransTime from "YYYYMMDDHHmmss" format to ISO timestamptz
    const year = TransTime.substring(0, 4);
    const month = TransTime.substring(4, 6);
    const day = TransTime.substring(6, 8);
    const hour = TransTime.substring(8, 10);
    const minute = TransTime.substring(10, 12);
    const second = TransTime.substring(12, 14);
    const transactionTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();

    // Check for duplicate
    const { data: existingTx } = await supabase
      .from("mpesa_transactions")
      .select("id")
      .eq("user_id", user_id)
      .eq("mpesa_receipt_no", TransID)
      .single();

    if (existingTx) {
      console.log("Duplicate transaction, skipping:", TransID);
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Success - Duplicate" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // INSERT into mpesa_transactions
    const { data: mpesaTx, error: insertError } = await supabase
      .from("mpesa_transactions")
      .insert({
        user_id,
        mpesa_receipt_no: TransID,
        transaction_type: "C2B",
        amount: parseFloat(TransAmount),
        phone_number: MSISDN,
        first_name: FirstName,
        middle_name: MiddleName,
        last_name: LastName,
        bill_ref_number: BillRefNumber,
        org_account_balance: parseFloat(OrgAccountBalance),
        transaction_time: transactionTime,
        raw_payload: payload,
        matched: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting mpesa_transaction:", insertError);
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Database error" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Attempt auto-match with transactions
    const amount = parseFloat(TransAmount);
    const tenMinutesAgo = new Date(new Date(transactionTime).getTime() - 10 * 60 * 1000).toISOString();
    const tenMinutesLater = new Date(new Date(transactionTime).getTime() + 10 * 60 * 1000).toISOString();

    const { data: matchingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user_id)
      .eq("type", "income")
      .gte("amount", amount - 1)
      .lte("amount", amount + 1)
      .gte("created_at", tenMinutesAgo)
      .lte("created_at", tenMinutesLater)
      .is("matched_receipt", null);

    if (matchingTx && matchingTx.length === 1) {
      // Exactly one match - link them
      const transactionId = matchingTx[0].id;
      
      await supabase
        .from("mpesa_transactions")
        .update({ matched: true, transaction_id: transactionId })
        .eq("id", mpesaTx.id);

      await supabase
        .from("transactions")
        .update({ matched_receipt: TransID })
        .eq("id", transactionId);
    }

    // Broadcast realtime update
    await supabase
      .channel("mpesa_transactions")
      .send({
        type: "broadcast",
        event: "new_transaction",
        payload: mpesaTx,
      });

    // Respond to Safaricom immediately
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in mpesa-c2b-callback:", error);
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: "Internal server error" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
});
