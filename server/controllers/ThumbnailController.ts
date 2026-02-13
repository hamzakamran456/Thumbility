import type { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";
import path from "node:path";
import fs from "fs";
import { generateImage } from "../utils/generateImage.js"; // Import the separated function
import { buildThumbnailPrompt } from "../utils/buildThumbnailPrompt.js"; // Import prompt builder
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

const stylePrompts = {
  "Bold & Graphic":
    "eye-catching youtube thumbnail, bold typography, vibrant colors, dramatic lighting, high contrast, click worthy",
  "Tech/Futuristic":
    "futuristic youtube thumbnail, modern tech UI, neon glow, holographic elements, cyber style",
  Minimalist:
    "minimalist youtube thumbnail, clean layout, simple shapes, negative space",
  Photorealistic:
    "photorealistic youtube thumbnail, DSLR lighting, realistic shadows, high detail",
  Illustration:
    "illustrated youtube thumbnail, vector art, bold outlines, colorful cartoon style",
} as const;

type Style = keyof typeof stylePrompts;

const colorSchemaDescriptions = {
  vibrant: "vibrant energetic colors, high saturation",
  sunset: "sunset orange pink gradient tones",
  forest: "green earthy natural tones",
  neon: "neon blue pink cyberpunk glow",
  purple: "purple magenta modern palette",
  monochrome: "black and white dramatic contrast",
  ocean: "blue teal fresh tones",
  pastel: "soft pastel low saturation colors",
} as const;

type ColorScheme = keyof typeof colorSchemaDescriptions;

// GENERATE THUMBNAIL
export const generateThumbnail = async (req: Request, res: Response) => {
  try {
    const { userId } = req.session;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      title,
      prompt: user_prompt,
      style: styleKey,
      aspect_ratio,
      color_scheme: colorKey,
      text_overlay,
    }: {
      title: string;
      prompt?: string;
      style: Style;
      aspect_ratio?: string;
      color_scheme: ColorScheme;
      text_overlay?: string;
    } = req.body;

    if (!stylePrompts[styleKey] || !colorSchemaDescriptions[colorKey]) {
      return res.status(400).json({ message: "Invalid style or color scheme" });
    }

    // Build the final prompt using your builder function
    const finalPrompt = buildThumbnailPrompt({
      title,
      prompt: user_prompt || "none",
      style: stylePrompts[styleKey],
      aspect_ratio: aspect_ratio || "16:9",
      color_scheme: colorSchemaDescriptions[colorKey],
    });

    const thumbnail = await Thumbnail.create({
      userId,
      title,
      prompt_user: finalPrompt,
      user_prompt,
      style: styleKey,
      aspect_ratio,
      color_scheme: colorKey,
      text_overlay,
      isGenerating: true,
    });

    const imageBuffer = await generateImage(finalPrompt);

    const fileName = `${Date.now()}.png`;
    const filePath = path.join("images", fileName);

    fs.mkdirSync("images", { recursive: true });
    fs.writeFileSync(filePath, imageBuffer);

    const upload = await cloudinary.uploader.upload(filePath, {
      folder: "thumbnails",
    });

    fs.unlinkSync(filePath);

    thumbnail.image_url = upload.secure_url;
    thumbnail.isGenerating = false;
    await thumbnail.save();

    res.json({
      success: true,
      message: "Thumbnail Generated",
      thumbnail,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE THUMBNAIL
export const deleteThumbnail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.session;

    await Thumbnail.findOneAndDelete({ _id: id, userId });

    res.json({ success: true, message: "Thumbnail Deleted Successfully" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
