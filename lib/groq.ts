import Groq from "groq-sdk";
import { createHash } from "crypto";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

type ExtractionResult = {
  company_name: string;
  role_title: string;
  location: string | null;
  key_requirements: string[];
};

const EXTRACTION_PROMPT = `You are a job description parser. Given a job description, extract the following fields and return ONLY valid JSON with no preamble:
{
  "company_name": "string",
  "role_title": "string",
  "location": "string or null",
  "key_requirements": ["string", "string", "..."]
}`;

export function hashJd(text: string): string {
  return createHash("sha256")
    .update(text.trim().toLowerCase())
    .digest("hex");
}

export async function extractFromJd(
  jdText: string,
): Promise<ExtractionResult> {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: jdText },
    ],
    temperature: 0.1,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  return JSON.parse(cleaned) as ExtractionResult;
}
