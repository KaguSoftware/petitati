"use client";

/**
 * Last-resort boundary for a crash in the root layout itself, where fonts, styles, translations
 * and the theme are not available. Plain inline HTML in the three shop languages, so the visitor
 * gets a way out instead of a white page.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", background: "#faf8f3", color: "#17323d" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center", display: "grid", gap: 12 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Something went wrong</h1>
          <p style={{ margin: 0 }}>Bir şeyler ters gitti · <span dir="rtl">مشکلی پیش آمد</span></p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={reset} style={{ padding: "10px 18px", borderRadius: 10, border: 0, background: "#157fa1", color: "#fff", fontSize: 16, cursor: "pointer" }}>
              Try again · Tekrar dene · <span dir="rtl">دوباره</span>
            </button>
            {/* A full page load, not a client navigation: the router may be what crashed. */}
            <button type="button" onClick={() => window.location.assign(window.location.origin)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #c9c3b6", background: "transparent", color: "inherit", fontSize: 16, cursor: "pointer" }}>
              Home
            </button>
          </div>
          {error.digest && (
            <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
              Ref <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
