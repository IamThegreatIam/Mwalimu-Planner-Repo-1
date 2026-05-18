
import { GoogleGenAI, Chat } from "@google/genai";
import { LessonPlanData, LessonDefinition, NewsItem, QuizQuestion, Assignment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_ID = "gemini-3-flash-preview";

// Helper to remove ** characters
const removeBold = (text: string): string => {
    return text.replace(/\*\*/g, '');
};

// Helper to sanitize JSON response
const cleanJson = (text: string): string => {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*$/, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let startIndex = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex !== -1) {
    cleaned = cleaned.substring(startIndex);
  }
  
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  
  let endIndex = -1;
  if (lastBrace !== -1 && lastBracket !== -1) {
    endIndex = Math.max(lastBrace, lastBracket);
  } else if (lastBrace !== -1) {
    endIndex = lastBrace;
  } else if (lastBracket !== -1) {
    endIndex = lastBracket;
  }

  if (endIndex !== -1) {
    cleaned = cleaned.substring(0, endIndex + 1);
  }

  return cleaned.trim();
};

export const createMwalimuChatSession = (): Chat => {
  return ai.chats.create({
    model: MODEL_ID,
    config: {
      systemInstruction: `You are Mwalimu Bot, a friendly and expert AI assistant dedicated to helping Kenyan teachers.
      Your knowledge base includes:
      - The Competency-Based Curriculum (CBC).
      - Kenyan teaching standards and TSC guidelines.
      - Lesson planning strategies, pedagogy, and classroom management.
      - Creative ideas for teaching resources using locally available materials.
      
      Your tone should be professional yet encouraging and colloquial (you can use occasional Kenyan English terms like "sawa", "pole", "hongera" where appropriate).
      Keep responses concise, practical, and formatting easy to read (use bullets). Do NOT use bold asterisks (**) in your output.
      If asked about non-educational topics, politely steer the conversation back to teaching and education.`,
    }
  });
};

export const generateLessonPlan = async (
  formData: any,
  lessonDetails: LessonDefinition
): Promise<LessonPlanData> => {
  
  const isKiswahili = formData.subject === "Kiswahili";

  const systemInstruction = `You are an expert educational consultant and curriculum developer for the Kenyan Junior School (JS) Competency-Based Education (CBE) system. 
  Your task is to generate a professional, curriculum-aligned lesson plan for ${formData.subject}.
  
  Adhere strictly to these core requirements:
  1. **Core Competencies:** Embed Communication, Critical Thinking, Creativity, Digital Literacy, Learning to Learn, Citizenship, and Self-Efficacy.
  2. **Values:** Integrate Respect, Unity, Responsibility, Patriotism, Peace, Love, Integrity, and Social Justice.
  3. **Methodology:** Use Constructivist teaching approaches, Active Learning, and Differentiation.
  4. **Context:** Use Kenyan examples (e.g., currency in Shillings, local names, local geography).
  5. **Format:** Return strictly valid JSON data. Ensure all keys are double-quoted. Do not output Markdown.
  6. **Length:** The main content sections (Introduction, Development, Conclusion) MUST be concise and total EXACTLY 300 words. Do not exceed this word count.
  7. **Language:** ${isKiswahili ? 'Use KISWAHILI language for ALL content fields (introduction, development, conclusion, resources, etc.). The JSON keys must remain in English, but the values must be in Kiswahili.' : 'Use English.'}
  8. Do NOT use markdown bold syntax (**) in the content strings.
  `;

  let prompt = `
    Create a JS ${formData.subject} Lesson Plan.

    **Input Details:**
    Teacher: ${formData.teacherName}
    School: ${formData.schoolName}
    Date: ${formData.date}
    Grade: ${formData.grade}
    Term: ${formData.term}
    Class Size: ${formData.roll}
    Time: 40 minutes
    
    **Lesson Context:**
    Topic: ${lessonDetails.topic}
    Strand: ${lessonDetails.strand}
    Sub-strand: ${lessonDetails.subStrand}
    Specific Learning Outcomes: ${JSON.stringify(lessonDetails.learningOutcomes)}
    Key Inquiry Questions: ${JSON.stringify(lessonDetails.inquiryQuestions)}
    Base Resources: ${lessonDetails.resources}
    Base Activities: ${lessonDetails.activities}
  `;

  if (formData.customContext) {
    prompt += `\n**Additional Teacher Context:** ${formData.customContext}`;
  }

  prompt += `
    \n**Required JSON Structure:**
    Return a single JSON object with the following schema. Ensure all property names are double-quoted.
    {
      "teacherName": "${formData.teacherName}",
      "schoolName": "${formData.schoolName}",
      "date": "${formData.date}",
      "subject": "${formData.subject}",
      "grade": "${formData.grade}",
      "term": "${formData.term}",
      "roll": ${formData.roll},
      "strand": "${lessonDetails.strand}",
      "subStrand": "${lessonDetails.subStrand}",
      "lessonNumber": "${lessonDetails.topic}",
      "topic": "${lessonDetails.topic}",
      "learningOutcomes": ["outcome 1", ...],
      "keyInquiryQuestions": ["question 1", ...],
      "learningResources": ["resource 1", ...],
      "introduction": "Concise introduction text with time allocation (e.g. 5 MIN)...",
      "developmentSteps": {
        "step1": "Concise Step 1 text...",
        "step2": "Concise Step 2 text...",
        "step3": "Concise Step 3 text..."
      },
      "extendedActivities": "Concise extended activities text...",
      "conclusion": "Concise conclusion text with time allocation (e.g. 5 MIN)...",
      "reflectionSpace": true
    }

    Ensure the language is age-appropriate for ${formData.grade}. Use "Learner" or "Students" instead of "Teacher" in activity descriptions.
    KEEP IT BRIEF.
    ${isKiswahili ? 'IMPORTANT: RETURN ALL VALUES IN KISWAHILI.' : ''}
  `;

  const parts: any[] = [{ text: prompt }];
  if (formData.images && formData.images.length > 0) {
      formData.images.forEach((base64Image: string) => {
          const rawBase64 = base64Image.split(',')[1] || base64Image;
          parts.push({
              inlineData: {
                  mimeType: 'image/jpeg', 
                  data: rawBase64
              }
          });
      });
      parts.push({ text: "Use the provided images as visual context for the lesson plan generation." });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: { parts: parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const cleanedText = cleanJson(text);
    const textWithoutBold = removeBold(cleanedText);
    const planData = JSON.parse(textWithoutBold) as LessonPlanData;
    
    planData.customContext = formData.customContext;
    planData.images = formData.images;
    
    return planData;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate lesson plan. Please try again.");
  }
};

export const generateSimplifiedNotes = async (plan: LessonPlanData, wordCount: number = 300, style: 'standard' | 'whiteboard' | 'presentation' = 'standard'): Promise<string> => {
  const isKiswahili = plan.subject === "Kiswahili";
  let prompt = `
    Based on the following lesson plan, create ${style} content for Grade ${plan.grade} learners.
    
    Topic: ${plan.topic}
    Subject: ${plan.subject}
    Target Word Count: Approximately ${wordCount} words.
    
    Lesson Plan Context:
    ${JSON.stringify(plan)}
  `;

  if (style === 'whiteboard') {
    prompt += `\n\nRequirements for WHITEBOARD NOTES:
      1. Audience: Grade ${plan.grade} students copying from the board.
      2. Structure: Date, Topic, Key Terms, Summary Points, Diagram Sketch Description.
      3. Tone: Concise, instructional.
      4. Format: Use clear headers. No markdown bold (**).
      5. Language: ${isKiswahili ? 'Use KISWAHILI.' : 'Use English.'}
    `;
  } else if (style === 'presentation') {
    prompt += `\n\nRequirements for POWERPOINT PRESENTATION:
      1. Audience: Grade ${plan.grade} students viewing a screen.
      2. Structure: 5-7 slides with Title, Objectives, Content, Summary.
      3. Tone: Engaging, visual-friendly.
      4. Format: No markdown bold (**).
      5. Language: ${isKiswahili ? 'Use KISWAHILI.' : 'Use English.'}
    `;
  } else {
    prompt += `\n\nRequirements for STANDARD STUDY NOTES:
      1. Audience: Grade ${plan.grade} students.
      2. Structure: Heading, Introduction, Key Concepts, Examples, Summary, 5 Exercises.
      3. Tone: Professional, educational.
      4. Format: Plain text, no markdown bold (**).
      5. Language: ${isKiswahili ? 'Use KISWAHILI.' : 'Use English.'}
    `;
  }

  const parts: any[] = [{ text: prompt }];
  if (plan.images && plan.images.length > 0) {
      plan.images.forEach((base64Image: string) => {
          const rawBase64 = base64Image.split(',')[1] || base64Image;
          parts.push({
              inlineData: { mimeType: 'image/jpeg', data: rawBase64 }
          });
      });
      parts.push({ text: "Incorporate relevant details from the provided images." });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: { parts: parts },
    });
    return removeBold(response.text || "Failed to generate notes.");
  } catch (error) {
    console.error("Gemini API Error (Notes):", error);
    throw new Error("Failed to generate notes.");
  }
};

export const generatePracticeQuestions = async (plan: LessonPlanData): Promise<QuizQuestion[]> => {
  const isKiswahili = plan.subject === "Kiswahili";
  const prompt = `
    Generate exactly 10 multiple-choice questions (MCQ) for Grade ${plan.grade} based on this topic: ${plan.topic}.
    
    Subject: ${plan.subject}
    Context: ${JSON.stringify(plan)}
    
    Requirements:
    1. Exactly 10 questions.
    2. 4 options each.
    3. Return STRICT JSON array.
    4. Language: ${isKiswahili ? 'KISWAHILI' : 'English'}.
    5. No markdown bold (**).

    Schema:
    [{"id": 1, "type": "mcq", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "Exact string", "explanation": "..."}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const cleanedText = cleanJson(response.text);
    return JSON.parse(removeBold(cleanedText)) as QuizQuestion[];
  } catch (error) {
    console.error("Gemini API Error (Questions):", error);
    throw new Error("Failed to generate questions.");
  }
};

export const generateCAT = async (subject: string, grade: string, lessons: LessonDefinition[], count: number = 20): Promise<QuizQuestion[]> => {
    const isKiswahili = subject === "Kiswahili";
    const lessonSummary = lessons.map(l => l.topic + ": " + l.learningOutcomes.join(", ")).join("; ");
    
    const prompt = `
      Create a Continuous Assessment Test (CAT) for ${subject}, Grade ${grade}.
      The CAT should cover these lessons: ${lessonSummary}.
      
      Requirements:
      1. Generate exactly ${count} Multiple Choice Questions (MCQ).
      2. Distribute questions evenly across the provided lessons.
      3. Questions should vary in difficulty (Bloom's Taxonomy).
      4. Return a STRICT JSON array of objects.
      5. Language: ${isKiswahili ? 'KISWAHILI' : 'English'}.
      6. No markdown bold (**).

      Schema:
      [{"id": 1, "type": "mcq", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "explanation": "..."}]
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const cleanedText = cleanJson(response.text);
        return JSON.parse(removeBold(cleanedText)) as QuizQuestion[];
    } catch (error) {
        console.error("Gemini API Error (CAT):", error);
        throw new Error("Failed to generate CAT.");
    }
};

export const generateStructuredQuestions = async (plan: LessonPlanData): Promise<QuizQuestion[]> => {
  const isKiswahili = plan.subject === "Kiswahili";
  const prompt = `Generate 5 structured short-answer questions for Grade ${plan.grade} based on: ${plan.topic}. Return JSON. Language: ${isKiswahili ? 'KISWAHILI' : 'English'}.`;
  try {
    const response = await ai.models.generateContent({ model: MODEL_ID, contents: prompt, config: { responseMimeType: "application/json" } });
    const cleanedText = cleanJson(response.text);
    return JSON.parse(removeBold(cleanedText)) as QuizQuestion[];
  } catch (error) {
    throw new Error("Failed to generate structured questions.");
  }
};

export const generateSimilarQuestions = async (topic: string, subject: string, grade: string): Promise<QuizQuestion[]> => {
  const isKiswahili = subject === "Kiswahili";
  const prompt = `Generate 10 new MCQs for ${topic}, ${subject}, ${grade}. Return JSON. Language: ${isKiswahili ? 'KISWAHILI' : 'English'}.`;
  try {
    const response = await ai.models.generateContent({ model: MODEL_ID, contents: prompt, config: { responseMimeType: "application/json" } });
    const cleanedText = cleanJson(response.text);
    return JSON.parse(removeBold(cleanedText)) as QuizQuestion[];
  } catch (error) {
    throw new Error("Failed to regenerate questions.");
  }
};

export const generateStudentPerformanceReport = async (
  assignment: Assignment,
  studentAnswers: Record<number, string>,
  score: number,
  timeTaken: number,
  timePerQuestion: Record<number, number>
): Promise<string> => {
  const isKiswahili = assignment.subject === "Kiswahili";
  const prompt = `Review student score ${score}/${assignment.questions.length} on ${assignment.topic} and provide a brief pedagogical report in ${isKiswahili ? 'KISWAHILI' : 'English'}. No markdown bold (**).`;
  try {
    const response = await ai.models.generateContent({ model: MODEL_ID, contents: prompt });
    return removeBold(response.text || "Analysis unavailable.");
  } catch (error) {
    return "Analysis unavailable.";
  }
};

export const fetchEducationNews = async (): Promise<NewsItem[]> => {
  const prompt = `Top 5 Kenya education news headlines (TSC, CBC, Ministry) from last 7 days. Return JSON array. Keys: title, summary, source, date, url.`;
  try {
    const response = await ai.models.generateContent({ model: MODEL_ID, contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } });
    const cleanedText = cleanJson(response.text);
    return JSON.parse(cleanedText) as NewsItem[];
  } catch (error) {
    return [{ title: "TSC Updates", summary: "New guidelines released.", source: "Education News", date: "Today", url: "#" }];
  }
};
