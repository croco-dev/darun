'use client';

import { bind } from '@croco/utils-structure-react';
import { css, Text, VStack } from '@kuma-ui/core';
import { useProductDescription } from './useProductDescription';

export const ProductDescription = bind(useProductDescription, ({ description }) => (
  <VStack>
    <Text
      className={DescriptionContentStyle}
      whiteSpace="pre-wrap"
      lineHeight={'1.5'}
      color={'colors.dark.800'}
      dangerouslySetInnerHTML={{ __html: description.replace(/<p><\/p>/gi, `<p class="blank"></p>`) }}
    />
  </VStack>
));

const DescriptionContentStyle = css`
  color: #2b2b2b;
  line-height: 1.5;
  word-break: auto-phrase;
  word-wrap: break-word;
  & p {
    margin: 4px 0;
  }
  & hr {
    margin: 16px 0;
    border: 0;
    border-top: 1px solid #e5e5e5;
  }
  & h1,
  & h2,
  & h3 {
    margin-top: 20px;
    margin-bottom: 8px;
    font-weight: 600;
  }
  & h1 {
    font-size: 20px;
  }
  & h2 {
    font-size: 18px;
  }
  & h3 {
    font-size: 16px;
  }
  & ul,
  & ol {
    padding-left: 16px;
  }
  & .blank {
    height: 4px;
  }
  & code {
    padding: 2px 4px;
    background-color: #f7f7f7;
    border-radius: 4px;
    margin: 0 2px;
    font-size: 95%;
  }
`;
