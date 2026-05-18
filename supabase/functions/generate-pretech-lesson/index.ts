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

    console.log("Generating Pre-Technical Studies lesson for:", lessonData.lessonTitle);

    const systemPrompt = `You are an expert Kenyan JSS Pre-Technical Studies teacher creating lesson plans following Kenya's Competency-Based Education (CBE) curriculum.

FORMATTING RULE: Do not use markdown formatting symbols like ** or ## for bold/headers. Use plain text only.

CRITICAL REQUIREMENTS:
1. Follow the 40-minute lesson structure exactly
2. Use KENYAN context (local materials, examples, scenarios)
3. Integrate the specified core competencies and values
4. Include practical hands-on activities
5. MAXIMUM 400 words total - do not exceed this limit

LESSON STRUCTURE (40 minutes total):
1. Introduction (5 min): Recap previous lesson in 1 minute, then introduce today's lesson objective
2. Lesson Development (25 min): 3 numbered steps with activities
3. Conclusion (5 min): Summary and reflection
4. Extended Activities: Differentiated for advanced/remedial learners

CBE COMPETENCIES TO EMBED: Communication, Critical Thinking, Creativity, Digital Literacy, Learning to Learn, Citizenship, Self-Efficacy

VALUES TO INTEGRATE: Respect, Unity, Responsibility, Patriotism, Peace, Love, Integrity, Social Justice`;

    const userPrompt = `Generate a Pre-Technical Studies lesson plan for:
- Grade: ${lessonData.grade}
- Strand: ${lessonData.strand}
- Sub-strand: ${lessonData.subStrand}
- Lesson: ${lessonData.lessonNumber}. ${lessonData.lessonTitle}

Learning Outcomes:
${lessonData.outcomes.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}

Key Inquiry Questions:
${lessonData.inquiryQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

Suggested Activities:
${lessonData.activities?.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n') || 'N/A'}

Core Competencies:
${lessonData.competencies?.join(', ') || 'N/A'}

Learning Resources:
${lessonData.resources.join(', ')}

Create a comprehensive lesson plan with:
1. Clear introduction with previous lesson recap
2. Step-by-step lesson development with practical activities
3. Conclusion with reflection questions
4. Extended activities for different learner levels`;

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

    console.log("Successfully generated Pre-Technical Studies lesson plan");

    return new Response(
      JSON.stringify({ lessonContent: generatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-pretech-lesson function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
