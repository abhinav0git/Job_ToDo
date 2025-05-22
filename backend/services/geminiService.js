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
  const prompt = `Extract the following information from the given text, separated by semicolons (;). The order of information should be: Recipient Email; Role; Onsite/Offsite; Job Description; Years of Experience; Company Name; Tech Requirements; OtherInfo. If any field is not found, leave it blank but preserve all semicolons as placeholders for that field. For example, if Role is not found, it should be like: email@example.com;;Onsite;...`;

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;

    if (!response || typeof response.text !== 'function') {
      console.error('Invalid Gemini response structure:', response);
      throw new Error('Invalid Gemini response: No text function found or response undefined.');
    }
    
    const text = response.text();
    // console.log("Gemini raw response text:", text); 
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