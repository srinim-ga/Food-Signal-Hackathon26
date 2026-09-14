/**
 * Screen 2: Menu upload (MVP Requirements Section 3 / 4.2).
 *
 * Supports image/PDF upload (with mobile camera capture) and a pasted-text
 * fallback (FR-010/011/012). Shows staged progress during analysis (FR-004) and
 * offers a sample-menu fallback for reliable demos (FR-042).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AnalyzeRequest, MenuInput } from "@food-signal/shared";
import { useSession } from "../state/SessionContext";
import { analyzeMenu, ApiClientError } from "../api/client";
import { readMenuFile } from "../utils/fileReader";

const PROGRESS_STAGES = [
  "Reading menu",
  "Finding dishes",
  "Identifying ingredients",
  "Comparing with your profile",
  "Preparing questions to ask the restaurant",
];

const SAMPLE_MENU = [
  "Pesto Pasta - basil pesto with parmesan",
  "Shrimp Ramen - noodles in a rich broth",
  "Grilled Chicken Salad - greens with house dressing",
  "Palak Paneer - spinach and cottage cheese curry",
  "Vegetable Biryani - fragrant spiced rice",
].join("\n");

export function MenuPage() {
  const navigate = useNavigate();
  const { profile, setResult } = useSession();

  const [menuText, setMenuText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<number>(-1);
  const [error, setError] = useState<string | undefined>();

  const analyzing = stage >= 0;

  const buildMenuInput = async (): Promise<MenuInput> => {
    if (file) {
      const read = await readMenuFile(file);
      return { sourceType: read.sourceType, fileName: read.fileName, content: read.base64, mimeType: read.mimeType };
    }
    return { sourceType: "text", content: menuText.trim() };
  };

  const runAnalysis = async (menu: MenuInput) => {
    setError(undefined);
    setStage(0);
    // Advance the visible progress stages while the request is in flight.
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, PROGRESS_STAGES.length - 1)), 600);
    try {
      const request: AnalyzeRequest = { profile, menu };
      const result = await analyzeMenu(request);
      setResult(result);
      navigate("/results");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Analysis failed. Please try again.";
      setError(message);
      setStage(-1);
    } finally {
      clearInterval(timer);
    }
  };

  const handleAnalyze = async () => {
    if (!file && menuText.trim().length === 0) {
      setError("Upload a menu image or paste menu text first.");
      return;
    }
    try {
      const menu = await buildMenuInput();
      await runAnalysis(menu);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the menu.");
    }
  };

  const handleSample = () => runAnalysis({ sourceType: "text", content: SAMPLE_MENU });

  if (analyzing) {
    return (
      <section className="card" aria-live="polite" aria-busy="true">
        <h1>Analyzing menu…</h1>
        <ol className="progress">
          {PROGRESS_STAGES.map((label, i) => (
            <li key={label} className={i <= stage ? "done" : ""}>
              {label}
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className="card" aria-labelledby="menu-heading">
      <h1 id="menu-heading">Upload a menu</h1>

      <div className="field">
        <label htmlFor="menuFile">Menu image or PDF</label>
        {/* capture="environment" opens the camera on supported mobile devices (FR-025 compat). */}
        <input
          id="menuFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && <span className="hint">Selected: {file.name}</span>}
      </div>

      <div className="divider">or</div>

      <div className="field">
        <label htmlFor="menuText">Paste menu text</label>
        <textarea
          id="menuText"
          rows={6}
          placeholder="Paste the menu here…"
          value={menuText}
          onChange={(e) => setMenuText(e.target.value)}
          maxLength={30000}
        />
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="actions">
        <button className="btn-primary" onClick={handleAnalyze}>
          Analyze menu
        </button>
        <button className="btn-secondary" onClick={handleSample}>
          Try a sample menu
        </button>
        <button className="btn-link" onClick={() => navigate("/")}>
          Back to profile
        </button>
      </div>
    </section>
  );
}
