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

    const subject = lessonData.subject || "Mathematics";
    const isMaths = subject === "Mathematics";

    const mathsSystemPrompt = `You are an expert Kenyan JSS Mathematics teacher creating supplementary lesson notes for students.

FORMATTING RULE: Do not use markdown formatting symbols like ** or ## for bold/headers. Use plain text only.

CRITICAL REQUIREMENTS:
1. Create SHORTENED summary notes (not full lesson plan)
2. Include AT LEAST 4 worked examples with DETAILED step-by-step solutions
3. Show ALL formulas and conversion processes clearly
4. Use KENYAN context (currency, places, scenarios)
5. Include 4 assessment questions for homework
6. Target approximately 500 words total

FORMAT:
- Summary Notes: Brief overview of key concepts (100-150 words)
- Worked Examples: Minimum 4 examples with complete step-by-step solutions showing formulas (250-300 words)
- Assessment Questions: 4 homework questions (50-100 words)`;

    const otherSubjectsSystemPrompt = `You are an expert Kenyan ${subject} teacher creating supplementary lesson notes for students.

FORMATTING RULE: Do not use markdown formatting symbols like ** or ## for bold/headers. Use plain text only.

CRITICAL REQUIREMENTS:
1. Create DETAILED and EXHAUSTIVE explanatory notes (not a lesson plan)
2. Provide comprehensive explanations of key concepts with depth
3. Include definitions, descriptions, and real-world applications
4. Use KENYAN context (local examples, places, scenarios)
5. Be thorough - cover all important points students need to understand
6. Include 4 assessment questions for homework at the END
7. Target approximately 500 words total

FORMAT:
- Key Concepts: Detailed explanations with definitions (200-250 words)
- Important Points: Exhaustive coverage of the topic with examples and applications (150-200 words)  
- Kenyan Context: Local examples and relevance (50-100 words)
- Assessment Questions: 4 homework questions at the very end (50-100 words)

NOTE: This is NOT a lesson plan. Focus on providing detailed explanatory content that students can study and learn from.`;

    const systemPrompt = isMaths ? mathsSystemPrompt : otherSubjectsSystemPrompt;

    const mathsUserPrompt = `Generate supplementary lesson notes for:
- Subject: Mathematics
- Grade: ${lessonData.grade}
- Lesson: ${lessonData.lessonNumber}. ${lessonData.lessonTitle}
- Strand: ${lessonData.strand}
- Sub-strand: ${lessonData.subStrand}

Learning Outcomes:
${lessonData.outcomes.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}

Create comprehensive lesson notes with:
1. Shortened summary of key concepts
2. At least 4 worked examples with detailed step-by-step solutions
3. All relevant formulas clearly displayed
4. Kenyan context and examples
5. 4 assessment questions for homework`;

    const otherUserPrompt = `Generate supplementary lesson notes for:
- Subject: ${subject}
- Grade: ${lessonData.grade}
- Term: ${lessonData.term || 'N/A'}
- Lesson: ${lessonData.lessonNumber}. ${lessonData.lessonTitle}
- Strand: ${lessonData.strand}
- Sub-strand: ${lessonData.subStrand}

Learning Outcomes:
${lessonData.outcomes.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}

Create comprehensive lesson notes with:
1. Detailed explanations of all key concepts
2. Exhaustive points covering the topic thoroughly
3. Definitions and descriptions where necessary
4. Real-world applications and Kenyan examples
5. 4 assessment questions for homework at the END`;

    const userPrompt = isMaths ? mathsUserPrompt : otherUserPrompt;

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
    const generatedNotes = data.choices[0]?.message?.content;

    if (!generatedNotes) {
      throw new Error("No content generated");
    }

    return new Response(
      JSON.stringify({ lessonNotes: generatedNotes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-lesson-notes function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
