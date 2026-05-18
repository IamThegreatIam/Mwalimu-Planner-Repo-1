import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lessonData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert Kenyan Integrated Science teacher creating lesson plans following the Competency-Based Curriculum (CBC). Generate detailed, practical lesson plans that:

1. Follow constructivist teaching approaches with hands-on activities
2. Include age-appropriate language for Grade 7 students
3. Use Kenyan context and examples where relevant
4. Integrate the seven core CBC competencies: Communication and Collaboration, Critical Thinking and Problem Solving, Creativity and Imagination, Digital Literacy, Learning to Learn, Citizenship, and Self-Efficacy
5. Embed values: Respect, Unity, Responsibility, Patriotism, Peace, Love, Integrity, and Social Justice

Generate a lesson plan (MAXIMUM 400 words - do not exceed) with this structure:
- Lesson Identification (Strand, Sub-strand, Lesson Number, Title)
- Specific Learning Outcomes (3-4 outcomes)
- Key Inquiry Questions (2-3 questions)
- Learning Resources (4-6 resources)
- Introduction (5 minutes) - Start with a 1-minute recap of previous lesson if applicable
- Lesson Development (25 minutes with 3 numbered steps including practical activities)
- Extended Activities (differentiated for advanced learners, remedial learners, and real-world application)
- Conclusion (5 minutes)
- Reflection space

Important: Include hands-on experiments and practical demonstrations where appropriate. For laboratory-related lessons, emphasize safety procedures. Use scientific diagrams and illustrations where relevant.

DO NOT use markdown formatting like ** for bold. Output clean, presentation-ready text.`;

    const userPrompt = `Create an Integrated Science lesson plan for:
- Grade: ${lessonData.grade}
- Term: ${lessonData.term}
- Strand: ${lessonData.strand}
- Sub-Strand: ${lessonData.subStrand}
- Lesson Number: ${lessonData.lessonNumber}
- Lesson Title: ${lessonData.lessonTitle}
- Learning Outcomes: ${lessonData.outcomes?.join(', ') || 'Not specified'}
- Key Inquiry Questions: ${lessonData.inquiryQuestions?.join(', ') || 'Not specified'}
- Learning Resources: ${lessonData.resources?.join(', ') || 'Not specified'}
- Suggested Activities: ${lessonData.activities?.join(', ') || 'Not specified'}

Generate a comprehensive lesson plan (MAXIMUM 400 words) with practical activities, experiments where applicable, and scientific explanations appropriate for Grade 7 students in Kenya.`;

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const lessonContent = data.choices[0].message.content;

    return new Response(JSON.stringify({ lessonContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-science-lesson function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
