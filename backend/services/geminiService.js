const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
require('dotenv').config({path:'../../.env.local'})

const API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ],
});

exports.analyzeImageWithGemini = async (imagePart) => {
  const prompt = `Analyze the provided job posting image. Extract only the essential information for a job applicant to create a concise to-do list for applying. The output should be highly scannable and actionable.
Focus on:
Hiring Company:
Job Role(s) & Experience (if brief and clear): (e.g., SDE 1 (1-3 yrs), SDE Intern)
Primary Application Action(s): (List these as actionable steps)
If an application/JD link exists: Action: Apply via Link: [URL]
If email application is an option: Action: Email [Email Address] with Subject: "[Specific Subject, if any]" (Mention resume if implied/stated)
If direct message/referral contact is primary: Action: Contact [Person's Name/Profile] via [Platform, e.g., LinkedIn DM] for [Role] referral. (Mention sending resume)
Key Contact for Application (if applicable for email/DM): (e.g., Pracheta Das)
Location (briefly, if on-site): (e.g., HSR Layout, Bangalore)
If information for a specific action (e.g., subject line) is missing, note it as 'Subject: (not specified)' or similar. Omit other descriptive text, reasons for hiring, or general hashtags unless they are part of an actionable instruction (like a specific hashtag for a referral). Prioritize direct application methods.`;

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;

    if (!response || typeof response.text !== 'function') {
      console.error('Invalid Gemini response structure:', response);
      throw new Error('Invalid Gemini response: No text function found or response undefined.');
    }
    
    const text = response.text();
    console.log("Gemini raw response text:", text); 
    return text;

  } catch (error) {
    console.error("Error during Gemini API call:", error);
    // specific Gemini error types are not covered rn, e.g., billing issues, quota etc
    if (error.message.includes('quota') || error.message.includes('billing')) {
        throw new Error('Gemini API request failed due to quota or billing issues. Please check your Google Cloud account.');
    }
    throw new Error(`Failed to analyze image with Gemini: ${error.message}`);
  }
};