interface ThumbnailInput {
  title: string;
  prompt: string;
  style: string;
  aspect_ratio: string;
  color_scheme: string;
}

export const buildThumbnailPrompt = (data: ThumbnailInput) => {
  return `
YouTube thumbnail design.

Main text: "${data.title}"
Visual elements: ${data.prompt}

Design style: ${data.style}
Color scheme: ${data.color_scheme}
Aspect ratio: ${data.aspect_ratio}

Highly detailed, professional YouTube thumbnail,
big bold readable text,
high contrast,
click-worthy,
modern tech style,
sharp lighting,
no blur,
no watermark,
no logo,
studio quality
`;
};