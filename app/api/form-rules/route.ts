import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const lowerText = text.toLowerCase();

    const { data: rules, error } = await supabase
      .from("form_rules")
      .select("*")
      .eq("case_type", "family")
      .order("priority", { ascending: true });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const matchedForms = new Set<string>();

    for (const rule of rules || []) {
      const keywords = (rule.trigger_words || "").toLowerCase();

      if (!keywords) continue;

      const keywordList = keywords.split(",").map((k: string) => k.trim());

      const matched = keywordList.some((k: string) => lowerText.includes(k));

      if (matched) {
        if (rule.required_forms) {
          rule.required_forms
            .split(",")
            .forEach((f: string) => matchedForms.add(f.trim()));
        }

        if (rule.optional_forms) {
          rule.optional_forms
            .split(",")
            .forEach((f: string) => matchedForms.add(f.trim()));
        }
      }
    }

    return NextResponse.json({
      forms: Array.from(matchedForms),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}