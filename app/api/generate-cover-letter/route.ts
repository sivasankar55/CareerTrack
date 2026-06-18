import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { company_name, role_title, job_description_raw } = await request.json();

    if (!company_name || !role_title) {
      return NextResponse.json(
        { error: "Company name and role title are required" },
        { status: 400 },
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "LLM service not configured" },
        { status: 500 },
      );
    }

    const prompt = `You are a professional cover letter writer. Write a concise, professional cover letter (3-4 paragraphs) tailored to the following job application.

Company: ${company_name}
Role: ${role_title}
${job_description_raw ? `Job Description:\n${job_description_raw}` : ""}

The cover letter should:
- Be addressed to "Dear Hiring Manager"
- Express enthusiasm for the company and role
- Highlight relevant skills (reference the job description if provided)
- Be 3-4 paragraphs
- End with a professional closing

Return ONLY the cover letter text with no preamble.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a professional cover letter writer. Return only the cover letter text with no preamble or explanation." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", errText);
      return NextResponse.json(
        { error: "Couldn't generate cover letter" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const coverLetter = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ cover_letter: coverLetter.trim() });
  } catch (err) {
    console.error("Cover letter generation error:", err);
    return NextResponse.json(
      { error: "Couldn't generate cover letter" },
      { status: 500 },
    );
  }
}
