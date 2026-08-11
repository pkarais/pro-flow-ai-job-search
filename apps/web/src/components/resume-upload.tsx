"use client";

import { useState, type FormEvent } from "react";

type PreviewItem = {
  id: string;
  category: "experience" | "skills" | "projects" | "education" | "credentials" | "other";
  section: string;
  value: string;
};

export function ResumeUpload({ revision }: { revision: number }) {
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState("");

  async function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("preview");
    setError("");
    setItems([]);
    try {
      const response = await fetch("/api/career/resume-preview", { method: "POST", body: new FormData(event.currentTarget) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "The résumé could not be read.");
      const previewItems = body.data.items as PreviewItem[];
      setFileName(body.data.fileName);
      setItems(previewItems);
      setSelected(new Set(previewItems.map((item) => item.id)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The résumé could not be read.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmImport() {
    const chosen = items.filter((item) => selected.has(item.id));
    if (!chosen.length) return;
    setBusy("import");
    setError("");
    try {
      const response = await fetch("/api/career/resume-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: revision, fileName, items: chosen.map(({ category, section, value }) => ({ category, section, value })) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "The selected evidence could not be imported.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The selected evidence could not be imported.");
      setBusy(null);
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="resume-upload">
      <form className="operations-stack-form" onSubmit={(event) => void preview(event)}>
        <label>Résumé file
          <input accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" name="resume" required type="file" />
        </label>
        <p className="resume-upload__privacy">PDF or DOCX, up to 10 MB. The original file is used only for this preview and is not retained.</p>
        <button className="button button--primary" disabled={busy !== null}>
          {busy === "preview" ? "Reading résumé…" : "Preview résumé evidence"}
        </button>
      </form>

      {error ? <p className="save-status--error" role="alert">{error}</p> : null}
      {items.length ? (
        <div className="resume-preview">
          <div className="resume-preview__header">
            <div><strong>Review before importing</strong><p>{selected.size} of {items.length} items selected from {fileName}</p></div>
            <div className="decision-actions">
              <button className="button button--secondary" onClick={() => setSelected(new Set(items.map((item) => item.id)))} type="button">Select all</button>
              <button className="button button--secondary" onClick={() => setSelected(new Set())} type="button">Clear</button>
            </div>
          </div>
          <div className="resume-preview__items">
            {items.map((item) => (
              <label className="resume-preview__item" key={item.id}>
                <input checked={selected.has(item.id)} onChange={() => toggle(item.id)} type="checkbox" />
                <span><small>{item.section}</small>{item.value}</span>
              </label>
            ))}
          </div>
          <button className="button button--primary" disabled={busy !== null || !selected.size} onClick={() => void confirmImport()} type="button">
            {busy === "import" ? "Importing selected evidence…" : `Confirm and import ${selected.size} item${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
