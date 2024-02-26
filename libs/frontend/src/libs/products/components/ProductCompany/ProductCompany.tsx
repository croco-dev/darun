import { bind } from '@croco/utils-structure-react';
import { Chip } from '@darun/ui-foundation';
import { Grid, VStack, Text, Flex, HStack } from '@kuma-ui/core';
import React from 'react';
import { useProductCompany } from './useProductComany';

export const ProductCompany = bind(useProductCompany, ({}) => (
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
              대한민국
            </Text>
          </HStack>
          <HStack>
            <Flex width="64px">
              <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                국적
              </Text>
            </Flex>
            <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
              대한민국
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
