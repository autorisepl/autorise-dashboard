"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pl">
      <body>
        <div style={{ padding: 40, fontFamily: "system-ui" }}>
          <h1>Wystąpił błąd</h1>
          <p>Spróbuj odświeżyć stronę. Błąd został zgłoszony automatycznie.</p>
        </div>
      </body>
    </html>
  );
}
