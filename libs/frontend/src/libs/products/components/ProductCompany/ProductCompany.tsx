'use client';

import { bind } from '@croco/utils-structure-react';
import { Chip } from '@darun/ui-foundation';
import { Grid, VStack, Text, Flex, HStack } from '@kuma-ui/core';
import { useProductCompany } from './useProductCompany';

export const ProductCompany = bind(useProductCompany, ({ company }) => (
  <VStack>
    <Grid gridTemplateColumns="repeat(2, 1fr)" gap="8px">
      <VStack gap="12px">
        <VStack gap="4px" width={'fit-content'}>
          <Text color="colors.dark.500" fontWeight="fontWeights.bold" fontSize="16px" letterSpacing="-2.4%">
            기본 정보
          </Text>
          <Flex height="2px" bg="colors.dark.400" />
        </VStack>
        <VStack gap="6px">
          <HStack>
            <Flex width="64px">
              <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                국적
              </Text>
            </Flex>
            <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
              {company?.region}
            </Text>
          </HStack>
          <HStack>
            <Flex width="64px">
              <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                상태
              </Text>
            </Flex>
            <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
              {company?.type}
            </Text>
          </HStack>
          <HStack>
            <Flex width="64px">
              <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                주소
              </Text>
            </Flex>
            <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
              {company?.address}
            </Text>
          </HStack>
          <HStack>
            <Flex width="64px">
              <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                고용 인원
              </Text>
            </Flex>
            <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
              {company?.size} (명)
            </Text>
          </HStack>
          <HStack>
            <Flex width="64px">
              <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                설립일
              </Text>
            </Flex>
            <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
              {company?.startAt}
            </Text>
          </HStack>
        </VStack>
      </VStack>
      <VStack gap="12px">
        <VStack gap="4px" width={'fit-content'}>
          <Text color="colors.dark.500" fontWeight="fontWeights.bold" fontSize="16px" letterSpacing="-2.4%">
            기업 타겟
          </Text>
          <Flex height="2px" bg="colors.dark.400" />
        </VStack>
        <HStack gap="4px">
          <Chip variant="square" color="filledGray">
            asasd
          </Chip>
        </HStack>
      </VStack>
    </Grid>
  </VStack>
));
