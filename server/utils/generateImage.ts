import axios from "axios";

export const generateImage = async (prompt: string) => {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey)
    throw new Error("HF_API_KEY is not set in environment variables");

  const MODEL = "black-forest-labs/FLUX.1-schnell";
  const API_URL = `https://router.huggingface.co/hf-inference/models/${MODEL}`;

  const response = await axios.post(
    API_URL,
    {
      inputs: prompt,
      // Uncomment to enforce aspect ratio (e.g., for 16:9 thumbnails; adjust based on your needs)
      // parameters: {
      //   num_inference_steps: 4,
      //   guidance_scale: 0.0,
      //   width: 1280,
      //   height: 720,
      // },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "image/png", // Required for binary image response
      },
      responseType: "arraybuffer",
      timeout: 120000, // 2 minutes for safety
    },
  );

  return Buffer.from(response.data);
};
