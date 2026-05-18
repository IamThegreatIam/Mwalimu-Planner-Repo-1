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
    
    console.log("Generating Agriculture and Nutrition lesson for:", lessonData.lessonTitle);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert Kenyan Agriculture and Nutrition teacher creating lesson plans for Grade 7 students following the Competency-Based Curriculum (CBC). Generate comprehensive, engaging lesson plans that:

1. Follow the exact 40-minute lesson structure
2. Include age-appropriate Kenyan agricultural examples and contexts
3. Incorporate the seven core CBC competencies: Communication and Collaboration, Critical Thinking and Problem Solving, Creativity and Imagination, Digital Literacy, Learning to Learn, Citizenship, and Self-Efficacy
4. Integrate values: Respect, Unity, Responsibility, Patriotism, Peace, Love, Integrity, and Social Justice
5. Use hands-on, practical teaching approaches suitable for agriculture
6. Include clear learning outcomes and assessment strategies
7. Emphasize environmental conservation and sustainable farming practices

Format the lesson plan with clear sections. Do NOT use markdown formatting like ** or ##. Use plain text with clear headings.`;

    const userPrompt = `Create a detailed 40-minute Agriculture and Nutrition lesson plan for Grade ${lessonData.grade} Term ${lessonData.term}.

LESSON DETAILS:
- Strand: ${lessonData.strand}
- Sub-strand: ${lessonData.subStrand}
- Lesson ${lessonData.lessonNumber}: ${lessonData.lessonTitle}

SPECIFIC LEARNING OUTCOMES:
${lessonData.outcomes.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}

KEY INQUIRY QUESTIONS:
${lessonData.inquiryQuestions.join('\n')}

SUGGESTED ACTIVITIES:
${lessonData.activities.join('\n')}

LEARNING RESOURCES:
${lessonData.resources.join(', ')}

Generate a complete lesson plan (MAXIMUM 400 words - do not exceed) with the following structure:

LESSON IDENTIFICATION
- Subject: Agriculture and Nutrition
- Grade: ${lessonData.grade}
- Term: ${lessonData.term}
- Strand: ${lessonData.strand}
- Sub-strand: ${lessonData.subStrand}
- Lesson: ${lessonData.lessonNumber} - ${lessonData.lessonTitle}
- Duration: 40 minutes

SPECIFIC LEARNING OUTCOMES
List 3-4 measurable outcomes

KEY INQUIRY QUESTIONS
List 2-3 thought-provoking questions

LEARNING RESOURCES
List required materials (emphasize locally available resources)

INTRODUCTION (5 minutes)
- Start with a brief recap of the previous lesson
- Introduce the lesson topic with an engaging hook related to farming/nutrition
- State the lesson objectives

LESSON DEVELOPMENT (25 minutes)
Provide 3 detailed steps with:
- Teacher activities
- Learner activities
- Practical demonstrations where applicable
- Kenyan farming examples and local crops/animals

EXTENDED ACTIVITIES
- Advanced learners: Challenging extension task
- Remedial learners: Simplified support activity
- Real-world application: Practical home/farm activity

CONCLUSION (5 minutes)
- Summary of key points
- Assessment questions
- Preview of next lesson

REFLECTION
Space for teacher notes on lesson effectiveness

Remember to:
- Use Kenyan agricultural practices and local examples
- Include hands-on practical activities
- Incorporate environmental conservation messages
- Make content relatable to Grade 7 learners in rural and urban settings`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const lessonContent = data.choices[0].message.content;

    console.log("Agriculture and Nutrition lesson generated successfully");

    return new Response(JSON.stringify({ lessonContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-agriculture-lesson function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
