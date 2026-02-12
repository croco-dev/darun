'use client';

import { bind } from '@croco/utils-structure-react';
import { Grid, VStack, Text, Flex, HStack } from '@kuma-ui/core';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useProductCompany } from './useProductCompany';

type ProductCompanyViewProps = {
  company: ReturnType<typeof useProductCompany>['company'];
};

export const ProductCompany = bind(useProductCompany, ({ company }: ProductCompanyViewProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <VStack>
      <Grid gridTemplateColumns={['1fr', 'repeat(2, 1fr)']} gap="8px">
        <VStack gap="12px">
          <VStack gap="4px" width={'fit-content'}>
            <Text color="colors.dark.500" fontWeight="fontWeights.bold" fontSize="16px" letterSpacing="-2.4%">
              {t('company.basicInfo')}
            </Text>
            <Flex height="2px" bg="colors.dark.400" />
          </VStack>
          <VStack gap="6px">
            {company?.name && (
              <HStack>
                <Flex width="70px">
                  <Text fontWeight={'fontWeights.bold'} color={'colors.dark.700'} letterSpacing="-2.4%">
                    {t('company.field.name')}
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
                    {t('company.field.status')}
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
                    {t('company.field.address')}
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
                    {t('company.field.foundedAt')}
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
  );
});
