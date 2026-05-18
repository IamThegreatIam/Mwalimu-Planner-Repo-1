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
    const { teacherName, schoolName, date, grade, term, strand, subStrand, lessonTitle, lessonNumber, roll } = await req.json();

    console.log('Generating CRE lesson plan for:', { teacherName, schoolName, grade, term, strand, subStrand, lessonTitle, lessonNumber });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert Kenyan Christian Religious Education (CRE) teacher specializing in the Competency-Based Curriculum (CBC) for Junior Secondary School. Generate lesson plans that are EXACTLY 400 words or less.

CRITICAL FORMATTING RULES:
- Output must be plain text only - NO markdown formatting (no **, no ##, no bullets with *)
- Use simple numbering (1. 2. 3.) and letters (a) b) c)) for lists
- Use line breaks to separate sections
- Keep the total word count to EXACTLY 400 words or less

The lesson plan must follow Kenya's CBC framework and include:
1. Strand and Sub-strand identification
2. Specific Learning Outcomes (3-4 outcomes)
3. Key Inquiry Questions (2-3 questions)
4. Learning Resources (4-6 items including Bible references)
5. Introduction (5 minutes) - Start with a recap of previous lesson, then introduce current lesson objective
6. Lesson Development (25 minutes with 3 numbered steps focusing on biblical teachings and Christian values)
7. Extended Activities (differentiated for different learner needs)
8. Conclusion (5 minutes with reflection on Christian values learned)
9. Reflection section for teacher notes

Embed these CBC core competencies throughout: Communication and Collaboration, Critical Thinking and Problem Solving, Creativity and Imagination, Digital Literacy, Learning to Learn, Citizenship, and Self-Efficacy.

Integrate these values: Respect, Unity, Responsibility, Patriotism, Peace, Love, Integrity, and Social Justice.

Use Kenyan context and examples. Include relevant Bible verses and references. Focus on practical application of Christian values in daily life.`;

    const userPrompt = `Generate a CRE lesson plan with these details:
Teacher: ${teacherName}
School: ${schoolName}
Date: ${date}
Grade: ${grade}
Term: ${term}
Class Size: ${roll || 'Not specified'}
Strand: ${strand}
Sub-strand: ${subStrand}
Lesson ${lessonNumber}: ${lessonTitle}
Duration: 40 minutes

Create a detailed, engaging lesson plan that teaches Christian values and biblical principles effectively. Include specific Bible verses and practical applications for Kenyan students.`;

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
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from AI');
    }

    console.log('Successfully generated CRE lesson plan');

    return new Response(JSON.stringify({ 
      success: true, 
      content: generatedContent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error generating CRE lesson:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
