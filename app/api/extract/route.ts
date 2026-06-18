import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractFromJd, hashJd } from "@/lib/groq";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jd_text } = await request.json();

    if (!jd_text || typeof jd_text !== "string" || jd_text.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "Couldn't parse that job description — try pasting just the text, not the whole page",
        },
        { status: 400 },
      );
    }

    const jdHash = hashJd(jd_text);

    const { data: cached } = await supabase
      .from("extraction_cache")
      .select("extracted_json")
      .eq("jd_hash", jdHash)
      .maybeSingle();

    if (cached) {
      return NextResponse.json(cached.extracted_json);
    }

    const result = await extractFromJd(jd_text);

    await supabase
      .from("extraction_cache")
      .upsert({
        jd_hash: jdHash,
        extracted_json: result,
      })
      .maybeSingle();

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't parse that job description — try pasting just the text, not the whole page",
      },
      { status: 500 },
    );
  }
}
