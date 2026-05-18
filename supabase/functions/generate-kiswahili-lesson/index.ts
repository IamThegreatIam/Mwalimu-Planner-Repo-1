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

    console.log('Generating Kiswahili lesson plan for:', { teacherName, schoolName, grade, term, strand, subStrand, lessonTitle, lessonNumber });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Wewe ni mwalimu hodari wa Kiswahili nchini Kenya unayebobea katika Mtaala wa Umahiri (CBC) kwa shule za Sekondari za Chini. Tengeneza mpango wa somo ambao una MANENO 400 HASWA au chini.

KANUNI MUHIMU ZA UANDISHI:
- Matokeo yawe maandishi wazi tu - USITUMIE alama za markdown (hakuna **, hakuna ##, hakuna nukta za bullet *)
- Tumia nambari rahisi (1. 2. 3.) na herufi (a) b) c)) kwa orodha
- Tumia nafasi za mistari kutenganisha sehemu
- Hakikisha jumla ya maneno ni HASWA 400 au chini

Mpango wa somo ufuate mfumo wa CBC wa Kenya na ujumuishe:
1. Mada Kuu na Mada Ndogo
2. Matokeo Maalum ya Ujifunzaji (matokeo 3-4)
3. Maswali Dadisi (maswali 2-3)
4. Nyenzo za Kujifunzia (vitu 4-6)
5. Utangulizi (dakika 5) - Anza na muhtasari wa somo lililopita, kisha utambulishe lengo la somo la sasa
6. Uendelezaji wa Somo (dakika 25 na hatua 3 zenye nambari zinazolenga stadi za lugha)
7. Shughuli za Nyongeza (zilizotofautishwa kwa mahitaji tofauti ya wanafunzi)
8. Hitimisho (dakika 5)
9. Sehemu ya Tafakuri kwa maelezo ya mwalimu

Jumuisha umahiri huu wa msingi wa CBC: Mawasiliano na Ushirikiano, Kufikiri kwa Kina na Utatuzi wa Matatizo, Ubunifu na Mawazo, Ujuzi wa Kidijitali, Kujifunza Kujifunza, Uraia, na Kujitegemea.

Jumuisha maadili haya: Heshima, Umoja, Uwajibikaji, Uzalendo, Amani, Upendo, Uadilifu, na Haki ya Kijamii.

Tumia muktadha wa Kenya na mifano. Lenga stadi za lugha: kusikiliza, kuzungumza, kusoma, na kuandika. Jumuisha sarufi, msamiati, na matumizi sahihi ya Kiswahili sanifu.`;

    const userPrompt = `Tengeneza mpango wa somo la Kiswahili na maelezo haya:
Mwalimu: ${teacherName}
Shule: ${schoolName}
Tarehe: ${date}
Darasa: ${grade}
Muhula: ${term}
Idadi ya Wanafunzi: ${roll || 'Haijabainishwa'}
Mada Kuu: ${strand}
Mada Ndogo: ${subStrand}
Somo ${lessonNumber}: ${lessonTitle}
Muda: Dakika 40

Tengeneza mpango wa somo unaovutia na unaofundisha stadi za lugha ya Kiswahili kwa ufanisi. Jumuisha mifano maalum na matumizi ya vitendo kwa wanafunzi wa Kenya.`;

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

    console.log('Successfully generated Kiswahili lesson plan');

    return new Response(JSON.stringify({ 
      success: true, 
      content: generatedContent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error generating Kiswahili lesson:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
