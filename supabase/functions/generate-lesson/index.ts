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
    const { lessonData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert Kenyan JSS Mathematics teacher and curriculum designer specializing in CBE (Competency-Based Education). Your task is to generate detailed, engaging, and pedagogically sound lesson plans.

FORMATTING RULE: Do not use markdown formatting symbols like ** or ## for bold/headers. Use plain text only.

CRITICAL REQUIREMENTS:
1. Use SPECIFIC mathematical examples and formulas related to the lesson topic
2. Include DETAILED step-by-step worked examples with clear calculations
3. Incorporate KENYAN context (places, currency, real-world scenarios)
4. Use proper mathematical notation and formulas
5. Make content age-appropriate for Grade ${lessonData.grade} students
6. Embed the 7 core competencies naturally throughout
7. Integrate values like respect, responsibility, and integrity
8. Follow constructivist teaching approaches

FORMAT (MAXIMUM 400 words - do not exceed):
- Introduction (5 min): FIRST recap the previous lesson in one minute, THEN provide an engaging hook with specific example for the new lesson
- Lesson Development (25 min): 
  Step 1: Conceptual introduction with concrete examples
  Step 2: Guided practice with worked examples showing formulas
  Step 3: Independent application with specific problems
- Extended Activities: Differentiated for advanced/remedial/real-world
- Conclusion (5 min): Review and connection to future learning

Include specific formulas, calculations, and Kenyan examples throughout.`;

    const userPrompt = `Generate a detailed lesson plan for:
- Grade: ${lessonData.grade}
- Term: ${lessonData.term}
- Strand: ${lessonData.strand}
- Sub-strand: ${lessonData.subStrand}
- Lesson: ${lessonData.lessonNumber}. ${lessonData.lessonTitle}

Learning Outcomes:
${lessonData.outcomes.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}

Key Inquiry Questions:
${lessonData.inquiryQuestions.map((q: string) => `- ${q}`).join('\n')}

Learning Resources: ${lessonData.resources.join(", ")}

Generate the complete lesson plan with:
1. Specific mathematical formulas and notation relevant to "${lessonData.lessonTitle}"
2. At least 2 worked examples with step-by-step calculations
3. Kenyan context (use Kenyan shillings, Kenyan towns/schools, local examples)
4. Clear progression from concrete to abstract thinking
5. Embedded competencies (critical thinking, problem-solving, collaboration)
6. MAXIMUM 400 words total - do not exceed this limit`;

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const generatedContent = data.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No content generated");
    }

    return new Response(
      JSON.stringify({ lessonContent: generatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-lesson function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});