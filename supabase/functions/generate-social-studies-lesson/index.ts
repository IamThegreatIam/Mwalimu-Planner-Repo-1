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
    
    console.log("Generating Social Studies lesson for:", lessonData.lessonTitle);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert Kenyan Social Studies teacher creating lesson plans for Grade 7 students following the Competency-Based Curriculum (CBC). Generate comprehensive, engaging lesson plans that:

1. Follow the exact 40-minute lesson structure
2. Include age-appropriate Kenyan examples and contexts
3. Incorporate the seven core CBC competencies: Communication and Collaboration, Critical Thinking and Problem Solving, Creativity and Imagination, Digital Literacy, Learning to Learn, Citizenship, and Self-Efficacy
4. Integrate values: Respect, Unity, Responsibility, Patriotism, Peace, Love, Integrity, and Social Justice
5. Use interactive, learner-centered teaching approaches
6. Include clear learning outcomes and assessment strategies

Format the lesson plan with clear sections. Do NOT use markdown formatting like ** or ##. Use plain text with clear headings.`;

    const userPrompt = `Create a detailed 40-minute Social Studies lesson plan for Grade ${lessonData.grade} Term ${lessonData.term}.

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
- Subject: Social Studies
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
List required materials

INTRODUCTION (5 minutes)
- Start with a brief recap of the previous lesson
- Introduce the lesson topic with an engaging hook
- State the lesson objectives

LESSON DEVELOPMENT (25 minutes)
Provide 3 detailed steps with:
- Teacher activities
- Learner activities
- Discussion points
- Kenyan examples and contexts

EXTENDED ACTIVITIES
- Advanced learners: Challenging extension task
- Remedial learners: Simplified support activity
- Real-world application: Practical activity

CONCLUSION (5 minutes)
- Summary of key points
- Assessment questions
- Preview of next lesson

REFLECTION
Space for teacher notes on lesson effectiveness

Remember to:
- Use Kenyan geographical features, communities, and examples
- Include interactive group discussions and pair work
- Incorporate values and life skills
- Make content relatable to Grade 7 learners`;

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

    console.log("Social Studies lesson generated successfully");

    return new Response(JSON.stringify({ lessonContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-social-studies-lesson function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
