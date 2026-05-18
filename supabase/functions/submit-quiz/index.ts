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
    const { student_id, quiz_id, answers, textAnswer, submission_url, submission_file_name } = await req.json();

    // Validate inputs
    if (!student_id || typeof student_id !== "string") {
      return new Response(JSON.stringify({ error: "Invalid student_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!quiz_id || typeof quiz_id !== "string") {
      return new Response(JSON.stringify({ error: "Invalid quiz_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );


    // Verify student exists
    const { data: studentData } = await supabase
      .from("students")
      .select("id, class_id")
      .eq("id", student_id)
      .single();

    if (!studentData) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quiz and verify it belongs to the student's class
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id, questions, max_attempts, due_date, class_id")
      .eq("id", quiz_id)
      .single();

    if (!quiz) {
      return new Response(JSON.stringify({ error: "Quiz not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (quiz.class_id !== studentData.class_id) {
      return new Response(JSON.stringify({ error: "Quiz not available for this student" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check due date
    const isLate = quiz.due_date ? new Date(quiz.due_date) < new Date() : false;
    if (isLate && !quiz.allow_late) {
      return new Response(JSON.stringify({ error: "Quiz is past due date and late submissions are not allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check attempt count
    const { count } = await supabase
      .from("student_quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", student_id)
      .eq("quiz_id", quiz_id);

    if ((count || 0) >= quiz.max_attempts) {
      return new Response(JSON.stringify({ error: "Maximum attempts reached" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let score = 0;
    let total = 0;
    let finalAnswers = answers || [];
    let status = "completed"; // Default for MCQ

    const questions = typeof quiz.questions === "string" ? JSON.parse(quiz.questions) : (quiz.questions || []);
    const isStructuredMode = quiz.question_type === "structured" || (Array.isArray(questions) && questions.some((q: any) => !q.options || q.options.length === 0));

    if (quiz.question_type === "assignment") {
      total = quiz.total_marks || 100;
      status = "pending_marking";
      finalAnswers = [];
      if (quiz.submission_format === "text") {
        finalAnswers = { text: textAnswer || "" };
      }
    } else if (isStructuredMode) {
      if (!Array.isArray(questions) || !Array.isArray(answers) || answers.length !== questions.length) {
        return new Response(JSON.stringify({ error: "Answer count mismatch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const a of answers) {
        if (typeof a !== "string" && typeof a !== "number") {
          return new Response(JSON.stringify({ error: "Invalid answer format for structured/mixed question" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      total = questions.length;
      status = "pending_marking";
    } else {
      // Parse questions and compute score server-side
      if (!Array.isArray(questions) || !Array.isArray(answers) || answers.length !== questions.length) {
        return new Response(JSON.stringify({ error: "Answer count mismatch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const a of answers) {
        if (typeof a !== "number" || a < -1) {
          return new Response(JSON.stringify({ error: "Invalid answer format" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      total = questions.length;
      questions.forEach((q: any, i: number) => {
        if (answers[i] === q.correctIndex) score++;
      });
    }

    const { data: attempt, error: insertError } = await supabase
      .from("student_quiz_attempts")
      .insert({
        student_id,
        quiz_id,
        answers: finalAnswers,
        score,
        total,
        is_late: isLate,
        status,
        submission_url,
        submission_file_name
      } as any)
      .select("id, score, total, completed_at, status")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save attempt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ attempt }), {
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
