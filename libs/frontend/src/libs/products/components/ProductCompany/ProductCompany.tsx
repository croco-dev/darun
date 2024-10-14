'use client';

import { bind } from '@croco/utils-structure-react';
import { Grid, VStack, Text, Flex, HStack } from '@kuma-ui/core';
import { format } from 'date-fns';
import { useProductCompany } from './useProductCompany';

export const ProductCompany = bind(useProductCompany, ({ company }) => (
  <VStack>
    <Grid gridTemplateColumns={['1fr', 'repeat(2, 1fr)']} gap="8px">
      <VStack gap="12px">
        <VStack gap="4px" width={'fit-content'}>
          <Text color="colors.dark.500" fontWeight="fontWeights.bold" fontSize="16px" letterSpacing="-2.4%">
            기본 정보
          </Text>
          <Flex height="2px" bg="colors.dark.400" />
        </VStack>
        <VStack gap="6px">
          {company?.name && (
            <HStack>
              <Flex width="70px">
                <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                  이름
                </Text>
              </Flex>
              <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
                {company.name}
              </Text>
            </HStack>
          )}
          {company?.type && (
            <HStack>
              <Flex width="70px">
                <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                  상태
                </Text>
              </Flex>
              <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
                {company.type}
              </Text>
            </HStack>
          )}
          {company?.address && (
            <HStack>
              <Flex width="70px">
                <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                  주소
                </Text>
              </Flex>
              <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
                {company.address}
              </Text>
            </HStack>
          )}
          {company?.startAt && (
            <HStack>
              <Flex width="70px">
                <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                  설립일
                </Text>
              </Flex>
              <Text fontWeight={'fontWeights.regular'} color={'colors.dark.600'}>
                {format(company.startAt, 'yyyy. MM. dd')}
              </Text>
            </HStack>
          )}
        </VStack>
      </VStack>
    </Grid>
  </VStack>
));
