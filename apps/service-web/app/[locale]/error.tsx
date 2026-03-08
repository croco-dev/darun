"use client";

import { Button } from "@darun/ui";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 gap-6">
      <h2 className="text-2xl font-bold">
        문제가 발생했습니다
      </h2>
      <p className="text-[#666] text-center">
        일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>

      <Button onClick={() => reset()}>다시 시도</Button>

      {isDev && (
        <div className="mt-8 p-4 bg-[#f5f5f5] rounded-lg max-w-2xl w-full overflow-auto font-mono text-xs">
          <p className="font-bold mb-2">
            {error.name}: {error.message}
          </p>
          <pre>{error.stack}</pre>
          {error.digest && (
            <p className="mt-2 text-[#666]">
              Digest: {error.digest}
            </p>
          )}
        </div>
    </div>
}
