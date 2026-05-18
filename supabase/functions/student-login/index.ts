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
    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Action: login or update profile
    if (!action || action === "login") {
      const { code, update, name, grade, stream, school_name, gender } = body;

      if (!code || typeof code !== "string" || code.trim().length < 3 || code.trim().length > 10) {
        return new Response(JSON.stringify({ error: "Invalid student code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedCode = code.trim().toUpperCase();

      const { data: students, error } = await supabase
        .from("students")
        .select("id, name, code, class_id, grade, stream, school_name, gender")
        .eq("code", normalizedCode)
        .limit(1);

      if (error || !students || students.length === 0) {
        return new Response(JSON.stringify({ error: "Invalid code" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let student = students[0];

      if (update) {
        if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) {
          return new Response(JSON.stringify({ error: "Invalid name" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!grade || !gender) {
          return new Response(JSON.stringify({ error: "Grade and gender are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updateError } = await supabase
          .from("students")
          .update({
            name: name.trim().substring(0, 100),
            grade: String(grade).substring(0, 20),
            stream: stream ? String(stream).trim().substring(0, 50) : null,
            school_name: school_name ? String(school_name).trim().substring(0, 100) : null,
            gender: String(gender).substring(0, 10),
          })
          .eq("id", student.id);

        if (updateError) {
          return new Response(JSON.stringify({ error: "Update failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        student = {
          ...student,
          name: name.trim().substring(0, 100),
          grade: String(grade).substring(0, 20),
          stream: stream ? String(stream).trim().substring(0, 50) : null,
          school_name: school_name ? String(school_name).trim().substring(0, 100) : null,
          gender: String(gender).substring(0, 10),
        };
      }

      return new Response(JSON.stringify({ student }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: load-data — returns quizzes and attempts for a student
    if (action === "load-data") {
      const { student_id, class_id } = body;

      if (!student_id || !class_id) {
        return new Response(JSON.stringify({ error: "Missing student_id or class_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify student exists with that class
      const { data: studentCheck } = await supabase
        .from("students")
        .select("id")
        .eq("id", student_id)
        .eq("class_id", class_id)
        .single();

      if (!studentCheck) {
        return new Response(JSON.stringify({ error: "Student not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [quizzesResult, attemptsResult, sharesResult] = await Promise.all([
        supabase
          .from("quizzes")
          .select("id, title, subject, questions, created_at, max_attempts, due_date, shared_notes, class_id")
          .eq("class_id", class_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("student_quiz_attempts")
          .select("id, quiz_id, score, total, completed_at, answers, teacher_comment")
          .eq("student_id", student_id)
          .order("completed_at", { ascending: false }),
        supabase
          .from("resource_shares")
          .select("resource_id, resources(id, title, description, file_url, file_type, file_name)")
          .eq("class_id", class_id),
      ]);

      const resources = (sharesResult.data || [])
        .map((s: any) => s.resources)
        .filter(Boolean);

      return new Response(JSON.stringify({
        quizzes: quizzesResult.data || [],
        attempts: attemptsResult.data || [],
        resources,
      }), {
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
