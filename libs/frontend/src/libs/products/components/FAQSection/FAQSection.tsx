'use client';

import { Box, Flex, Text, VStack } from '@kuma-ui/core';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  const t = useTranslations('ProductDetail');

  if (!items || items.length === 0) return null;

  return (
    <VStack gap={24} py={40} width="100%">
      <Text as="h2" fontSize={24} fontWeight={700} color="colors.dark.900">
        {t('faq.title')}
      </Text>
      <VStack gap={12} width="100%">
        {items.map((item, index) => (
          <FAQAccordionItem key={index} question={item.question} answer={item.answer} />
        ))}
      </VStack>
    </VStack>
  );
}

function FAQAccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box
      border="1px solid"
      borderColor="colors.dark.100"
      borderRadius={12}
      overflow="hidden"
      bg="colors.white"
      width="100%"
    >
      <Flex
        as="button"
        alignItems="center"
        justifyContent="space-between"
        width="100%"
        p={20}
        bg="transparent"
        border="none"
        cursor="pointer"
        onClick={() => setIsOpen(!isOpen)}
        textAlign="left"
        _hover={{ bg: 'colors.dark.50' }}
        transition="background 0.2s"
      >
        <Text fontSize={16} fontWeight={600} color="colors.dark.900" flex={1} pr={16}>
          {question}
        </Text>
        <Box
          color="colors.dark.400"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Box>
      </Flex>
      <Box
        style={{
          maxHeight: isOpen ? '500px' : '0px',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.3s ease-in-out',
        }}
        overflow="hidden"
      >
        <Box p={20} pt={0} color="colors.dark.700" lineHeight={1.6}>
          <Text whiteSpace="pre-wrap">{answer}</Text>
        </Box>
      </Box>
    </Box>
  );
}
