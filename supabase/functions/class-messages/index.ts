import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, class_id, student_id, sender_name, message } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "list") {
      if (!class_id) {
        return new Response(JSON.stringify({ error: "Missing class_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify student belongs to this class if student_id provided
      if (student_id) {
        const { data: check } = await supabase
          .from("students")
          .select("id")
          .eq("id", student_id)
          .eq("class_id", class_id)
          .single();

        if (!check) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data } = await supabase
        .from("class_messages")
        .select("id, sender_name, sender_role, message, created_at")
        .eq("class_id", class_id)
        .order("created_at", { ascending: true })
        .limit(100);

      return new Response(JSON.stringify({ messages: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send") {
      if (!class_id || !student_id || !sender_name || !message) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (typeof message !== "string" || message.trim().length === 0 || message.trim().length > 1000) {
        return new Response(JSON.stringify({ error: "Invalid message" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify student belongs to class
      const { data: check } = await supabase
        .from("students")
        .select("id")
        .eq("id", student_id)
        .eq("class_id", class_id)
        .single();

      if (!check) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("class_messages").insert({
        class_id,
        student_id,
        sender_name: String(sender_name).substring(0, 100),
        sender_role: "student",
        message: message.trim().substring(0, 1000),
      });

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to send" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
