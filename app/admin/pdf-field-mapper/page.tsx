"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type InventoryRow = {
  id: string;
  form_id: string | null;
  form_number: string | null;
  official_title: string | null;
  court_type: string | null;
  file_path: string;
  page_count: number | null;
  strategy: string | null;
};

type OverlayField = {
  field_key: string;
  field_label: string;
  page_number: number;
  x_position: number;
  y_position: number;
  font_size: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const FIELD_KEYS = [
  { key: "plaintiffName", label: "Plaintiff / Applicant name" },
  { key: "plaintiffAddress", label: "Plaintiff / Applicant address" },
  { key: "plaintiffPhone", label: "Plaintiff / Applicant phone" },
  { key: "plaintiffEmail", label: "Plaintiff / Applicant email" },
  { key: "defendantName", label: "Defendant / Respondent name" },
  { key: "defendantAddress", label: "Defendant / Respondent address" },
  { key: "defendantPhone", label: "Defendant / Respondent phone" },
  { key: "defendantEmail", label: "Defendant / Respondent email" },
  { key: "courtLocation", label: "Court location" },
  { key: "courtFileNumber", label: "Court file / claim number" },
  { key: "amountClaimed", label: "Amount claimed" },
  { key: "facts", label: "Facts / claim details" },
  { key: "requestedResult", label: "Requested result" },
];

export default function PdfFieldMapperPage() {
  const [forms, setForms] = useState<InventoryRow[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [fields, setFields] = useState<OverlayField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedForm = useMemo(() => {
    return forms.find((form) => form.file_path === selectedFilePath) || null;
  }, [forms, selectedFilePath]);

  const pdfUrl = useMemo(() => {
    if (!selectedFilePath) return "";

    const { data } = supabase.storage
      .from("court-forms")
      .getPublicUrl(selectedFilePath);

    return data.publicUrl;
  }, [selectedFilePath]);

  useEffect(() => {
    async function loadForms() {
      setLoading(true);

      const { data, error } = await supabase
        .from("pdf_form_inventory")
        .select(`
          id,
          form_id,
          form_number,
          official_title,
          court_type,
          file_path,
          page_count,
          strategy
        `)
        .order("court_type", { ascending: true })
        .order("form_number", { ascending: true });

      if (error) {
        alert(`Could not load forms: ${error.message}`);
        setLoading(false);
        return;
      }

      const rows = (data || []) as InventoryRow[];

      setForms(rows);

      if (rows.length > 0) {
        setSelectedFilePath(rows[0].file_path);
      }

      setLoading(false);
    }

    loadForms();
  }, []);

  useEffect(() => {
    async function loadMappings() {
      if (!selectedFilePath) return;

      const { data, error } = await supabase
        .from("pdf_overlay_fields")
        .select(`
          field_key,
          field_label,
          page_number,
          x_position,
          y_position,
          font_size
        `)
        .eq("file_path", selectedFilePath)
        .order("field_key", { ascending: true });

      if (error) {
        alert(`Could not load mappings: ${error.message}`);
        return;
      }

      setFields((data || []) as OverlayField[]);
    }

    loadMappings();
  }, [selectedFilePath]);

  function addField() {
    const unused = FIELD_KEYS.find(
      (item) => !fields.some((field) => field.field_key === item.key)
    );

    if (!unused) {
      alert("All standard fields already added.");
      return;
    }

    setFields((current) => [
      ...current,
      {
        field_key: unused.key,
        field_label: unused.label,
        page_number: 1,
        x_position: 100,
        y_position: 700,
        font_size: 11,
      },
    ]);
  }

  function updateField(
    index: number,
    updates: Partial<OverlayField>
  ) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index
          ? { ...field, ...updates }
          : field
      )
    );
  }

  function removeField(index: number) {
    setFields((current) =>
      current.filter((_, fieldIndex) => fieldIndex !== index)
    );
  }

  async function saveMappings() {
    if (!selectedForm) return;

    if (fields.length === 0) {
      alert("No mappings to save.");
      return;
    }

    setSaving(true);

    const rows = fields.map((field) => ({
      form_id: selectedForm.form_id,
      file_path: selectedForm.file_path,
      field_key: field.field_key,
      field_label: field.field_label,
      page_number: field.page_number,
      x_position: field.x_position,
      y_position: field.y_position,
      font_size: field.font_size,
    }));

    const { error } = await supabase
      .from("pdf_overlay_fields")
      .upsert(rows, {
        onConflict: "file_path,field_key",
      });

    setSaving(false);

    if (error) {
      alert(`Could not save mappings: ${error.message}`);
      return;
    }

    alert(`Saved ${rows.length} mapping(s).`);
  }

  return (
    <main
      style={{
        padding: "28px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: "34px",
          marginBottom: "10px",
        }}
      >
        CourtSimplified PDF Field Mapper
      </h1>

      <p
        style={{
          color: "#555",
          marginBottom: "22px",
        }}
      >
        Map overlay text positions onto official Ontario court PDFs.
      </p>

      {loading ? (
        <p>Loading forms...</p>
      ) : (
        <>
          <section style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Select official PDF form
            </label>

            <select
              value={selectedFilePath}
              onChange={(event) =>
                setSelectedFilePath(event.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                fontSize: "16px",
              }}
            >
              {forms.map((form) => (
                <option
                  key={form.file_path}
                  value={form.file_path}
                >
                  {form.court_type} — {form.form_number} —{" "}
                  {form.official_title}
                </option>
              ))}
            </select>
          </section>

          {selectedForm && (
            <section
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "18px",
                marginBottom: "24px",
                background: "#fafafa",
              }}
            >
              <h2
                style={{
                  fontSize: "24px",
                  marginBottom: "10px",
                }}
              >
                {selectedForm.form_number} —{" "}
                {selectedForm.official_title}
              </h2>

              <p>
                <strong>File path:</strong>{" "}
                {selectedForm.file_path}
              </p>

              <p>
                <strong>Strategy:</strong>{" "}
                {selectedForm.strategy}
              </p>
            </section>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 520px",
              gap: "24px",
              alignItems: "start",
            }}
          >
            <section>
              <h2
                style={{
                  fontSize: "24px",
                  marginBottom: "12px",
                }}
              >
                PDF Preview
              </h2>

              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  style={{
                    width: "100%",
                    height: "780px",
                    border: "1px solid #ccc",
                    borderRadius: "10px",
                    background: "white",
                  }}
                />
              ) : (
                <p>No PDF selected.</p>
              )}
            </section>

            <section>
              <h2
                style={{
                  fontSize: "24px",
                  marginBottom: "12px",
                }}
              >
                Overlay Fields
              </h2>

              <button
                onClick={addField}
                style={{
                  padding: "12px 18px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#0f766e",
                  color: "white",
                  fontWeight: 700,
                  marginBottom: "18px",
                  cursor: "pointer",
                }}
              >
                Add overlay field
              </button>

              <div
                style={{
                  display: "grid",
                  gap: "14px",
                }}
              >
                {fields.map((field, index) => (
                  <div
                    key={`${field.field_key}-${index}`}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "10px",
                      padding: "14px",
                      background: "white",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontWeight: 700,
                        marginBottom: "6px",
                      }}
                    >
                      Field
                    </label>

                    <select
                      value={field.field_key}
                      onChange={(event) => {
                        const selected = FIELD_KEYS.find(
                          (item) =>
                            item.key === event.target.value
                        );

                        updateField(index, {
                          field_key: event.target.value,
                          field_label:
                            selected?.label ||
                            event.target.value,
                        });
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        marginBottom: "12px",
                      }}
                    >
                      {FIELD_KEYS.map((item) => (
                        <option
                          key={item.key}
                          value={item.key}
                        >
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                      }}
                    >
                      <label>
                        Page
                        <input
                          type="number"
                          value={field.page_number}
                          onChange={(event) =>
                            updateField(index, {
                              page_number: Number(
                                event.target.value
                              ),
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "8px",
                          }}
                        />
                      </label>

                      <label>
                        Font size
                        <input
                          type="number"
                          value={field.font_size}
                          onChange={(event) =>
                            updateField(index, {
                              font_size: Number(
                                event.target.value
                              ),
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "8px",
                          }}
                        />
                      </label>

                      <label>
                        X Position
                        <input
                          type="number"
                          value={field.x_position}
                          onChange={(event) =>
                            updateField(index, {
                              x_position: Number(
                                event.target.value
                              ),
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "8px",
                          }}
                        />
                      </label>

                      <label>
                        Y Position
                        <input
                          type="number"
                          value={field.y_position}
                          onChange={(event) =>
                            updateField(index, {
                              y_position: Number(
                                event.target.value
                              ),
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "8px",
                          }}
                        />
                      </label>
                    </div>

                    <button
                      onClick={() => removeField(index)}
                      style={{
                        marginTop: "12px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        background: "white",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={saveMappings}
                disabled={saving}
                style={{
                  marginTop: "22px",
                  padding: "14px 22px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#134e4a",
                  color: "white",
                  fontWeight: 700,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save overlay mappings"}
              </button>
            </section>
          </div>
        </>
      )}
    </main>
  );
}