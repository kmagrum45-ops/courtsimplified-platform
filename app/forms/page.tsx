"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CourtPath = "family" | "small-claims" | "civil";

type FormItem = {
  id: string;
  file_path: string;
  court_type: CourtPath;
  file_type: "pdf" | "docx";
  form_number: string;
  official_title: string | null;
  purpose: string | null;
  procedure_stage: string | null;
  form_group: string | null;
  is_active: boolean;
};

function getCourtPath(value: string | null): CourtPath {
  if (value === "civil") return "civil";
  if (value === "small-claims") return "small-claims";
  return "family";
}

function getPageTitle(path: CourtPath) {
  if (path === "civil") return "Ontario Civil Court Forms";
  if (path === "small-claims") return "Ontario Small Claims Court Forms";
  return "Ontario Family Court Forms";
}

function normalize(value: string | null | undefined) {
  return String(value || "").toLowerCase();
}

export default function FormsPage() {
  const searchParams = useSearchParams();
  const path = getCourtPath(searchParams.get("path"));

  const [forms, setForms] = useState<FormItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadForms() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("court_form_library")
        .select(
          "id, file_path, court_type, file_type, form_number, official_title, purpose, procedure_stage, form_group, is_active"
        )
        .eq("court_type", path)
        .eq("is_active", true)
        .order("form_number", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setForms([]);
      } else {
        setForms((data || []) as FormItem[]);
      }

      setLoading(false);
    }

    loadForms();
  }, [path]);

  function openForm(filePath: string) {
    const { data } = supabase.storage
      .from("court-forms")
      .getPublicUrl(filePath);

    window.open(data.publicUrl, "_blank");
  }

  const filteredForms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return forms;

    return forms.filter((form) => {
      const text = [
        form.form_number,
        form.official_title,
        form.purpose,
        form.procedure_stage,
        form.form_group,
        form.file_path,
        form.file_type,
      ]
        .map(normalize)
        .join(" ");

      return text.includes(q);
    });
  }, [forms, search]);

  const title = getPageTitle(path);

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px" }}>
      <p style={{ letterSpacing: "8px", color: "#3c8277", fontWeight: 700 }}>
        {title.toUpperCase()}
      </p>

      <h1 style={{ fontSize: "52px", margin: "10px 0" }}>
        Search court forms
      </h1>

      <p style={{ fontSize: "20px", lineHeight: 1.6, color: "#555" }}>
        Search by form number, title, purpose, court step, or file type.
      </p>

      <section
        style={{
          marginTop: "30px",
          padding: "24px",
          border: "1px solid #ddd",
          borderRadius: "18px",
          background: "#fff",
        }}
      >
        <label style={{ display: "block", fontWeight: 700, marginBottom: "10px" }}>
          Search forms
        </label>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search forms..."
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid #ccc",
            fontSize: "16px",
          }}
        />

        <p style={{ marginTop: "14px", color: "#666" }}>
          Showing {filteredForms.length} of {forms.length} forms.
        </p>
      </section>

      {loading && <p style={{ marginTop: "30px" }}>Loading forms...</p>}

      {!loading && errorMessage && (
        <section style={{ marginTop: "30px", color: "red" }}>
          {errorMessage}
        </section>
      )}

      {!loading && !errorMessage && (
        <section style={{ marginTop: "30px", display: "grid", gap: "14px" }}>
          {filteredForms.map((form) => (
            <article
              key={form.id}
              style={{
                padding: "22px",
                border: "1px solid #ddd",
                borderRadius: "18px",
                background: "#fff",
              }}
            >
              <h2 style={{ margin: 0 }}>{form.form_number}</h2>

              <p style={{ fontWeight: 700, fontSize: "18px" }}>
                {form.official_title || "Court form"}
              </p>

              {form.purpose && <p>{form.purpose}</p>}

              <p style={{ color: "#666" }}>
                {[form.procedure_stage, form.form_group, form.file_type?.toUpperCase()]
                  .filter(Boolean)
                  .join(" • ")}
              </p>

              <button
                onClick={() => openForm(form.file_path)}
                style={{
                  marginTop: "12px",
                  padding: "12px 18px",
                  borderRadius: "999px",
                  border: "none",
                  background: "#2f7d67",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {form.file_type === "docx" ? "Download Word form" : "Open form"}
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}