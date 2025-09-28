import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM = `You classify user queries for a crisis resource finder.
Return ONLY valid JSON (no markdown, no code blocks): {"language":"en"|"es", "categories": ["shelter"|"food_bank"|"clinic"], "openNowPreferred": boolean, "queryTerms": ["term1", "term2"]}.
Map categories to: "shelter" (housing, homeless), "food_bank" (food, hungry, meal), "clinic" (medical, doctor, health).
Example: {"language":"en", "categories":["shelter"], "openNowPreferred":true, "queryTerms":["shelter", "emergency"]}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { text, emergencyMode } = req.body || {};
    
    // Force emergency mode to shelters
    if (emergencyMode) {
      const intent = { categories: ['shelter'], openNowPreferred: true, language: 'en', queryTerms: [text] };
      return res.status(200).json({ intent });
    }

    // Try Gemini API first if available
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        console.log('Using Gemini API for intent processing:', text);
        
        // Initialize the Gemini AI client
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Using Gemini 2.5 Flash - stable model that supports generateContent
        console.log('Using Gemini 2.5 Flash model');
        const model = genAI.getGenerativeModel({ 
          model: "models/gemini-2.5-flash",
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 256,
          }
        });
        
        const prompt = `${SYSTEM}\nUser: ${text}`;
        
        // Generate content using the SDK
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const raw = response.text();
        
        console.log('Gemini raw response:', raw);
        
        try { 
          // Clean the response by removing markdown code blocks if present
          let cleanedResponse = raw.trim();
          if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const geminiIntent = JSON.parse(cleanedResponse);
          console.log('Gemini parsed intent:', geminiIntent);
          // Mark as AI-powered
          geminiIntent._isAI = true;
          return res.status(200).json({ intent: geminiIntent });
        } catch (parseError) {
          console.error('Failed to parse Gemini response:', parseError);
          console.error('Raw response was:', raw);
        }
      } catch (e) {
        console.error('Gemini API error:', e);
      }
    } else {
      console.warn('GEMINI_API_KEY not found in environment variables');
    }

    // Fallback intent processor when Gemini API is not available or fails
    console.log('Using fallback intent processor for:', text);
    const lowerText = text.toLowerCase();
    const categories: string[] = [];
    const queryTerms = [text];
    
    // Simple keyword matching for intent classification
    if (lowerText.includes('shelter') || lowerText.includes('housing') || lowerText.includes('homeless')) {
      categories.push('shelter');
    }
    if (lowerText.includes('food') || lowerText.includes('hungry') || lowerText.includes('meal') || lowerText.includes('pantry')) {
      categories.push('food_bank');
    }
    if (lowerText.includes('clinic') || lowerText.includes('doctor') || lowerText.includes('medical') || lowerText.includes('health')) {
      categories.push('clinic');
    }
    
    // Default to shelter if no categories found
    if (categories.length === 0) {
      categories.push('shelter');
    }
    
    const openNowPreferred = lowerText.includes('now') || lowerText.includes('urgent') || lowerText.includes('emergency');
    
    const intent = {
      language: 'en',
      categories,
      openNowPreferred,
      queryTerms
    };

    console.log('Fallback intent:', intent);
    res.status(200).json({ intent });
  } catch (e:any) {
    console.error('Intent processing error:', e);
    res.status(500).json({ error: e.message });
  }
}
