import { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FeedItem } from '../types';

// Safely access API Key to prevent "process is not defined" crashes in browser
const getApiKey = () => {
  try {
    // Check if process exists before accessing it
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
    // Fallback for some bundlers that define it globally
    // @ts-ignore
    if (typeof window !== 'undefined' && window.process && window.process.env) {
        // @ts-ignore
        return window.process.env.API_KEY;
    }
    return undefined;
  } catch (e) {
    console.warn("Environment access failed");
    return undefined;
  }
};

const API_KEY = getApiKey();

export type GenerationStatus = 'idle' | 'grounding' | 'imagining' | 'filming' | 'ready' | 'error';

interface EditorialAssets {
  imageUrl: string | null;
  videoUrl: string | null;
  status: GenerationStatus;
  caption?: string;
}

export const useEditorialAI = () => {
  // We use a Map to store assets per article ID to prevent re-generation on re-renders
  const [assets, setAssets] = useState<Record<string, EditorialAssets>>({});

  const generateEditorialIllustration = useCallback(async (item: FeedItem, styleEra: string, force = false) => {
    if (!API_KEY) {
      console.warn("No API Key found for GenAI");
      return;
    }
    
    // Prevent double generation unless forced
    if (assets[item.id]?.status !== 'idle' && assets[item.id]?.status && !force) return;

    // Set initial loading state
    setAssets(prev => ({
      ...prev,
      [item.id]: { imageUrl: null, videoUrl: null, status: 'grounding' }
    }));

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });

      // Step 1: Search Grounding
      // We ask for visual metaphors based on real-world context
      const groundingPrompt = `I need a visual description for a newspaper editorial illustration about: "${item.title}". 
      Summary: ${item.summary.slice(0, 150)}. 
      Publication Era Style: ${styleEra}.
      Find 3 key visual symbols related to this specific news topic using Google Search.
      Output ONLY a comma-separated list of visual elements.`;

      let visualElements = "";
      try {
        const groundingResp = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: groundingPrompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        visualElements = groundingResp.text || "Law, Justice, Paperwork";
      } catch (e) {
        console.warn("Grounding failed, falling back to basic metadata", e);
        visualElements = `${item.primaryCategory?.name || 'Legal'}, Courtroom, Documents`;
      }

      // Step 2: Image Generation
      setAssets(prev => ({ ...prev, [item.id]: { ...prev[item.id], status: 'imagining' } }));

      const imagePrompt = `Editorial illustration for a newspaper. 
      Style: ${styleEra} print aesthetic. High contrast, ink bleed, halftone textures.
      Subject: ${visualElements}. 
      Context: ${item.title}.
      Composition: Cinematic, artistic, no text, serious tone.`;

      const imageResp = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: imagePrompt }] },
        config: {
          imageConfig: {
            aspectRatio: "4:3", // Good for editorial
            imageSize: "1K" // Faster loading
          }
        }
      });

      let base64Image = "";
      for (const part of imageResp.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (base64Image) {
        setAssets(prev => ({
          ...prev,
          [item.id]: { 
            imageUrl: `data:image/png;base64,${base64Image}`, 
            videoUrl: null, 
            status: 'ready',
            caption: visualElements
          }
        }));
      } else {
        throw new Error("No image data returned");
      }

    } catch (err) {
      console.error("Editorial Generation Failed:", err);
      setAssets(prev => ({
        ...prev,
        [item.id]: { ...prev[item.id], status: 'error' }
      }));
    }
  }, [assets]);


  const animateEditorial = useCallback(async (itemId: string, itemTitle: string) => {
    const currentAsset = assets[itemId];
    if (!currentAsset?.imageUrl || !API_KEY) return;

    setAssets(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status: 'filming' }
    }));

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      // Veo Generation
      const base64Data = currentAsset.imageUrl.split(',')[1];
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic news clip, slight camera pan, dynamic movement, 1980s broadcast style overlay. Subject: ${itemTitle}`,
        image: {
            imageBytes: base64Data,
            mimeType: 'image/png'
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
      });

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3s
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (videoUri) {
         // Fetch the actual bytes (proxy via fetch to append key)
         const vidResp = await fetch(`${videoUri}&key=${API_KEY}`);
         const vidBlob = await vidResp.blob();
         const vidUrl = URL.createObjectURL(vidBlob);

         setAssets(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], videoUrl: vidUrl, status: 'ready' }
         }));
      }

    } catch (err) {
      console.error("Video Generation Failed:", err);
      setAssets(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], status: 'ready' } // Revert to ready (image only) on fail
      }));
    }
  }, [assets]);

  return {
    assets,
    generateEditorialIllustration,
    animateEditorial
  };
};