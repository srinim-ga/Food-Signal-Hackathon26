/**
 * Shared "Ask your server" card: deduplicated, ranked questions with one-tap
 * copy actions (Section 4.5.1 - reduce user effort).
 */
import type { ServerQuestion } from "@food-signal/shared";

export function SharedQuestions({ questions }: { questions: ServerQuestion[] }) {
  if (questions.length === 0) return null;

  const copyAll = () => {
    const text = questions.map((q) => q.text).join("\n");
    void navigator.clipboard?.writeText(text);
  };

  return (
    <section className="card shared-questions" aria-labelledby="ask-server-heading">
      <div className="shared-questions-header">
        <h2 id="ask-server-heading">Ask your server</h2>
        <button className="btn-secondary" onClick={copyAll}>
          Copy all
        </button>
      </div>
      <ul>
        {questions.map((q) => (
          <li key={q.id}>
            <span>{q.text}</span>
            <button
              className="btn-link"
              aria-label={`Copy question: ${q.text}`}
              onClick={() => navigator.clipboard?.writeText(q.text)}
            >
              Copy
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
