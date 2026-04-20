import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function getSocialMediaTrends(query: string) {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `
    You are a World-Class Social Media Marketing Guru and Trend Analyst. 
    Your mission is to help users find what's trending on Social Media (Instagram, YouTube, TikTok, X/Twitter) and the Web.
    
    When asked about trends:
    1. Use Google Search to find current, real-time trending topics and products.
    2. Provide specific examples of trending content.
    3. Recommend the BEST TIME TO POST based on general social media benchmarks (or specific ones if found).
    4. Provide the BEST HASHTAGS (#) to use for the discovered trends.
    5. Suggest content generation ideas and analyze potential competitor strategies.
    
    Structure your responses using Markdown for clarity.
  `;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        systemInstruction,
      },
      tools: [{ googleSearch: {} }]
    } as any);

    return result.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble analyzing the web right now. Please try again later.";
  }
}

export async function generateContent(topic: string, platform: 'Instagram' | 'YouTube' | 'TikTok' | 'General') {
  const model = "gemini-3.1-flash-lite-preview"; 
  const prompt = `Generate a high-engagement social media post for ${platform} about: ${topic}. 
  Include:
  - A catchy headline/hook.
  - The main caption.
  - A list of optimized hashtags.
  - Tips for the visual/video content.`;

  const result = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return result.text;
}

export async function analyzeCompetitor(competitorName: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `Perform a high-level competitor analysis for: ${competitorName}. 
  Find their:
  1. Primary content pillars.
  2. Engagement strategies.
  3. Apparent target audience.
  4. Suggested strategies for us to beat them or differentiate.
  Use Search Grounding for current info.`;

  const result = await ai.models.generateContent({
    model,
    contents: prompt,
    tools: [{ googleSearch: {} }]
  } as any);

  return result.text;
}
