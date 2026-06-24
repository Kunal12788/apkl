import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imagePath, expectedPieces, workType } = await req.json();

    if (!imagePath || expectedPieces === undefined) {
      return new Response(JSON.stringify({ success: false, reason: "Missing imagePath or expectedPieces" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Initialize Supabase client with admin privileges to download file
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Fetch the image from the bucket
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('task_images')
      .download(imagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download image from storage: ${downloadError?.message || "File not found"}`);
    }

    // Convert file arrayBuffer to base64
    const buffer = await fileData.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // 3. Invoke Gemini Vision API securely
    const prompt = `
      You are a high-security AI image scanner for verifying gold and silver work orders.
      Analyze the attached photo and determine the following:
      1. Is this a genuine physical photo of gold/silver jewelry or items?
         - Set success to false if:
           - The photo is completely blank, dark, blurry, or uniform/solid-color.
           - It is a screenshot, a digital drawing, or a picture taken of a computer/phone screen displaying a photo (look for moire patterns, screen bezels, pixels, glare).
      2. Count the number of distinct items (pieces) in the image.
      3. Mark the center point of each piece.

      The user expects to see exactly ${expectedPieces} pieces in this image (representing ${workType} items).
      If the actual item count matches ${expectedPieces} (or is close enough, e.g., 9-11 items for expected 10), and the photo is a real physical photo, return success: true. Otherwise, return success: false and explain why.

      Format your response strictly as JSON (do not include markdown wrapping like \`\`\`json):
      {
        "success": boolean,
        "detected_count": number,
        "coordinates": [{"x": number, "y": number}],
        "reason": string
      }
    `;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Parse response
    let aiData;
    try {
      // Clean possible markdown wrapper if any
      const cleanedText = textResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      aiData = JSON.parse(cleanedText);
    } catch {
      aiData = { success: false, reason: "Invalid response formatting from AI model.", raw: textResponse };
    }

    return new Response(JSON.stringify(aiData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, reason: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
