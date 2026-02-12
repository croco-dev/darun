import { ContentArea } from "@darun/ui-foundation";
import { Layout } from "@darun/ui-layout";
import { Box, HStack, VStack } from "@kuma-ui/core";

const Skeleton = ({
  width = "100%",
  height = "20px",
  radius = "4px",
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
}) => (
  <Box
    width={width}
    height={height}
    borderRadius={radius}
    bg="#f3f4f6"
    style={{ animation: "pulse 1.5s ease-in-out infinite" }}
  />
);

export default function Loading() {
  return (
    <Layout>
      <VStack as="main" width="100%" mt={32} gap={20}>
        <ContentArea>
          <VStack gap={16} mb={32}>
            <Skeleton height={200} radius="8px" />
            <HStack gap={16}>
              <Skeleton width="60%" height={24} />
              <Skeleton width="30%" height={24} />
            </HStack>
          </VStack>

          <VStack gap={16}>
            {Array.from({ length: 4 }).map((_, i) => (
              <HStack key={i} gap={16} width="100%">
                <Skeleton width={80} height={80} radius="8px" />
                <VStack flex={1} gap={8} justify="center">
                  <Skeleton width="80%" height={20} />
                  <Skeleton width="40%" height={16} />
                </VStack>
              </HStack>
            ))}
          </VStack>
        </ContentArea>
      </VStack>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Layout>
  );
}
