"use client";

import { Box, Flex, Heading, Text } from "@kuma-ui/core";
import { ContainedButton } from "@darun/ui-foundation";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
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
    <Flex
      flexDir="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      p={24}
      gap={24}
    >
      <Heading as="h2" fontSize="24px" fontWeight="bold">
        문제가 발생했습니다
      </Heading>
      <Text color="#666" textAlign="center">
        일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </Text>

      <ContainedButton onClick={() => reset()}>다시 시도</ContainedButton>

      {isDev && (
        <Box
          mt={32}
          p={16}
          bg="#f5f5f5"
          borderRadius={8}
          maxWidth="800px"
          width="100%"
          overflow="auto"
          fontFamily="monospace"
          fontSize="12px"
        >
          <Text fontWeight="bold" mb={8}>
            {error.name}: {error.message}
          </Text>
          <pre>{error.stack}</pre>
          {error.digest && (
            <Text mt={8} color="#666">
              Digest: {error.digest}
            </Text>
          )}
        </Box>
      )}
    </Flex>
  );
}
