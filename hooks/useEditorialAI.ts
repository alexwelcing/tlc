import { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FeedItem } from '../types';

// Global cache to prevent re-fetching across the entire app session
const globalAssetCache: Record<string, EditorialAssets> = {};
const pendingRequests = new Set<string>();

export type GenerationStatus = 'idle' | 'grounding' | 'imagining' | 'filming' | 'ready' | 'error';

interface EditorialAssets {
  imageUrl: string | null;
  videoUrl: string | null;
  status: GenerationStatus;
  caption?: string;
}

export const useEditorialAI = () => {
  const [assets, setAssets] = useState<Record<string, EditorialAssets>>(globalAssetCache);

  const generateEditorialIllustration = useCallback(async (item: FeedItem, styleEra: string, force = false) => {
    // @google/genai guidelines: API key must be obtained exclusively from process.env.API_KEY.
    const apiKey = process.env.API_KEY;
    if (!apiKey) return;
    
    const existing = globalAssetCache[item.id];
    if (existing && existing.status === 'ready' && !force) return;
    if (pendingRequests.has(item.id) && !force) return;

    pendingRequests.add(item.id);
    
    const updateLocalState = (newState: EditorialAssets) => {
      globalAssetCache[item.id] = newState;
      setAssets(prev => ({ ...prev, [item.id]: newState }));
    };

    updateLocalState({ imageUrl: null, videoUrl: null, status: 'grounding' });

    try {
      // @google/genai guidelines: Create a new GoogleGenAI instance right before making an API call.
      const ai = new GoogleGenAI({ apiKey });

      // Step 1: Search Grounding (Lightweight Flash)
      // SYSTEM: Combine Title + Summary + Topics + Style for a rich visual metaphor.
      const categories = item.categories.map(c => c.name).join(', ');
      
      const groundingPrompt = `
        Act as an Art Director for a newspaper. 
        Article Title: "${item.title}"
        Description: "${item.summary}"
        Topics: ${categories}
        
        Task: Suggest 3 distinct visual subjects or metaphors for an editorial illustration.
        Art Style: ${styleEra}.
        Constraint: Output ONLY the 3 subjects separated by commas. No conversational text.
      `;

      let visualElements = "";
      try {
        const groundingResp = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: groundingPrompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        visualElements = groundingResp.text || `${item.primaryCategory?.name || 'Legal'}, Courtroom, Documents`;
      } catch (e) {
        visualElements = `${item.primaryCategory?.name || 'Legal'}, Justice, Architecture`;
      }

      // Step 2: Image Generation
      updateLocalState({ imageUrl: null, videoUrl: null, status: 'imagining' });

      // Construct a dense, descriptive prompt for the image model
      const imagePrompt = `
        Editorial illustration. 
        Style: ${styleEra}.
        Subject: ${visualElements}.
        Context: The image should conceptually represent "${item.title}".
        Aesthetics: High contrast, ink bleed textures, newspaper print quality, detailed lines.
        Negative Prompt: No text, no words, no letters, no distorted faces.
      `;

      const imageResp = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePrompt }] },
        config: {
          imageConfig: {
            aspectRatio: "4:3"
          }
        }
      });

      let base64Image = "";
      if (imageResp.candidates?.[0]?.content?.parts) {
        for (const part of imageResp.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      if (base64Image) {
        updateLocalState({ 
          imageUrl: `data:image/png;base64,${base64Image}`, 
          videoUrl: null, 
          status: 'ready',
          caption: visualElements
        });
      }

    } catch (err) {
      console.error("Editorial Generation Failed:", err);
      const errorStatus: GenerationStatus = 'error';
      updateLocalState({ 
        imageUrl: globalAssetCache[item.id]?.imageUrl || null, 
        videoUrl: globalAssetCache[item.id]?.videoUrl || null, 
        status: errorStatus 
      });
    } finally {
      pendingRequests.delete(item.id);
    }
  }, []);

  const animateEditorial = useCallback(async (itemId: string, itemTitle: string) => {
    const apiKey = process.env.API_KEY;
    const currentAsset = globalAssetCache[itemId];
    if (!currentAsset?.imageUrl || !apiKey) return;

    const filmingStatus: GenerationStatus = 'filming';
    setAssets(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status: filmingStatus }
    }));

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = currentAsset.imageUrl.split(',')[1];
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Subtle cinematic motion, slow pan over the illustration of: ${itemTitle}, preserving the art style.`,
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

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
         const vidResp = await fetch(`${downloadLink}&key=${apiKey}`);
         const vidBlob = await vidResp.blob();
         const vidUrl = URL.createObjectURL(vidBlob);

         const finalAsset: EditorialAssets = { 
           ...globalAssetCache[itemId], 
           videoUrl: vidUrl, 
           status: 'ready' 
         };
         globalAssetCache[itemId] = finalAsset;
         setAssets(prev => ({ ...prev, [itemId]: finalAsset }));
      }
    } catch (err: any) {
      if (err?.message?.includes("Requested entity was not found.")) {
        if (typeof window.aistudio !== 'undefined') {
          window.aistudio.openSelectKey();
        }
      }
      console.error("Video Generation Failed:", err);
      const readyStatus: GenerationStatus = 'ready';
      setAssets(prev => ({ 
        ...prev, 
        [itemId]: { ...globalAssetCache[itemId], status: readyStatus } 
      }));
    }
  }, []);

  return { assets, generateEditorialIllustration, animateEditorial };
};