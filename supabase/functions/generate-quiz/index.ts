import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lessonData, catMode, lessons: catLessons, questionType, questionsPerLesson } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const perLesson = questionsPerLesson || 5;
    const qType = questionType || "mcq";
    const questionCount = catMode ? Math.min((catLessons?.length || 1) * perLesson, 50) : 10;

    const isStructured = qType === "structured";

    const systemPrompt = isStructured
      ? `You are an expert Kenyan teacher creating structured questions for students.

CRITICAL RULES:
1. Return ONLY a valid JSON array. No markdown, no code blocks, no explanation text.
2. Each question object MUST have exactly these fields:
   - "question": the question text (string)
   - "options": empty array []
   - "correctAnswer": the expected answer (string)
   - "explanation": brief explanation of the answer
3. Questions should require short written answers (1-3 sentences).
4. Make questions progressively harder. Use Kenyan context where appropriate.
5. Questions should test understanding and application, not just memorization.`
      : `You are an expert Kenyan teacher creating multiple-choice questions for students.

CRITICAL RULES:
1. Return ONLY a valid JSON array. No markdown, no code blocks, no explanation text before or after.
2. Each question object MUST have exactly these fields:
   - "question": the question text (string)
   - "options": array of EXACTLY 4 option strings labeled as just the answer text (no A/B/C/D prefix)
   - "correctAnswer": the EXACT text of the correct option (must match one of the options word-for-word)
   - "explanation": brief explanation of why the correct answer is right

3. The "correctAnswer" field MUST be an EXACT copy of one of the strings in the "options" array.
4. Make questions progressively harder. Use Kenyan context where appropriate.
5. Questions should test understanding, not just memorization.
6. Double-check that correctAnswer matches one option EXACTLY before outputting.`;

    let userPrompt: string;

    if (catMode && catLessons) {
      const lessonDetails = catLessons.map((l: any, i: number) => 
        `${i + 1}. Topic: ${l.topic}\n   Strand: ${l.strand}\n   Sub-strand: ${l.subStrand}\n   Outcomes: ${l.learningOutcomes?.join(', ') || 'N/A'}`
      ).join('\n\n');

      userPrompt = `Generate ${questionCount} ${isStructured ? 'structured (short-answer)' : 'multiple-choice'} questions for a Continuous Assessment Test (CAT) covering these lessons:

Subject: ${lessonData?.subject || 'General'}
Grade: ${lessonData?.grade || 'N/A'}

LESSONS COVERED:
${lessonDetails}

Generate exactly ${perLesson} questions per lesson. Distribute questions evenly across all lessons. Return ONLY the JSON array.`;
    } else {
      userPrompt = `Generate ${questionCount} ${isStructured ? 'structured (short-answer)' : 'multiple-choice'} questions for:
- Subject: ${lessonData.subject || 'Mathematics'}
- Grade: ${lessonData.grade}
- Topic: ${lessonData.lessonTitle}
- Strand: ${lessonData.strand}
- Sub-strand: ${lessonData.subStrand}

Learning Outcomes:
${(lessonData.outcomes || []).map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}

Return ONLY the JSON array.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) throw new Error("No content generated");

    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    function repairJson(str: string): any[] {
      try {
        return JSON.parse(str);
      } catch (_e) {
        const lastCloseBrace = str.lastIndexOf('}');
        if (lastCloseBrace > 0) {
          const trimmed = str.substring(0, lastCloseBrace + 1) + ']';
          try {
            return JSON.parse(trimmed);
          } catch (_e2) { /* fall through */ }
        }
        throw new Error("Could not parse AI response as valid JSON");
      }
    }

    const rawQuestions = repairJson(content);

    const questions = rawQuestions.map((q: any) => {
      if (isStructured) {
        return {
          question: q.question,
          options: [],
          correctIndex: -1,
          correctAnswer: q.correctAnswer || q.answer || "",
          explanation: q.explanation || "",
        };
      }

      let correctIndex = -1;
      
      if (typeof q.correctAnswer === 'string') {
        correctIndex = q.options.findIndex((opt: string) => opt.trim() === q.correctAnswer.trim());
        if (correctIndex === -1) {
          correctIndex = q.options.findIndex((opt: string) => 
            opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
          );
        }
        if (correctIndex === -1) {
          correctIndex = q.options.findIndex((opt: string) => 
            opt.toLowerCase().includes(q.correctAnswer.toLowerCase()) || 
            q.correctAnswer.toLowerCase().includes(opt.toLowerCase())
          );
        }
      }
      
      if (correctIndex === -1 && typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3) {
        correctIndex = q.correctIndex;
      }
      
      if (correctIndex === -1) correctIndex = 0;

      return {
        question: q.question,
        options: q.options,
        correctIndex,
        correctAnswer: q.options[correctIndex],
        explanation: q.explanation || "See your notes for more details.",
      };
    });

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-quiz function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
