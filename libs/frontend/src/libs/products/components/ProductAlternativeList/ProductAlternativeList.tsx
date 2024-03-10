import { bind } from '@croco/utils-structure-react';
import { Flex, Grid, HStack, Text, VStack } from '@kuma-ui/core';
import { ProductItem } from '@products/uis';
import { useProductAlternativeList } from './useProductAlternativeList';

export const ProductAlternativeList = bind(useProductAlternativeList, ({}) => (
  <VStack>
    <Flex
      px="18px"
      py="16px"
      borderRadius="8px"
      border="1px solid rgba(0, 0, 0, 0.12)"
      bg="#fff"
      boxShadow="0px 2px 8px 0px rgba(0, 0, 0, 0.08)"
    >
      <VStack gap="12px" w={'100%'}>
        <HStack>
          <ProductItem
            name={'네이버페이'}
            summary={'간단하고 제한 없는 결제 방식을 많은 가맹점을 보유하고 있는 간편 결제 서비스.'}
            logoSize={'small'}
            tagVariant={'circle'}
            tags={['결제', '간편결제']}
          />
        </HStack>
        <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
        <VStack gap={'24px'}>
          <VStack gap={'12px'}>
            <VStack gap="4px" width={'fit-content'}>
              <Text color="colors.dark.500" fontWeight="fontWeights.bold" fontSize="16px" letterSpacing="-2.4%">
                기본 정보
              </Text>
              <Flex height="2px" bg="colors.dark.400" />
            </VStack>
            <Text color="colors.dark.700" fontSize="14px" lineHeight={'18px'} maxWidth={'800px'}>
              네이버페이는 간편결제 서비스 뿐만 아니라 자산 관리 서비스도 제공합니다. 토스와 마찬가지로 금융감독원
              마이데이터 연동을 통해 보유한 예적금, 증권, 포인트 등을 간편하게 조회하고 얼마나 소비하였는지에 대한 통계
              데이터도 제공합니다.
              <br /> 네이버 앱이 아닌 자체 어플리케이션도 제공합니다.
            </Text>
          </VStack>
          <VStack gap={'12px'}>
            <VStack gap="4px" width={'fit-content'}>
              <Text color="colors.dark.500" fontWeight="fontWeights.bold" fontSize="16px" letterSpacing="-2.4%">
                기능
              </Text>
              <Flex height="2px" bg="colors.dark.400" />
            </VStack>
            <Grid gridTemplateColumns="repeat(3, 1fr)" gap={6}>
              {['', '', ''].map((_, index) => (
                <HStack alignItems={'center'} gap={'12px'} w={'100%'} key={index}>
                  <Flex
                    width={'42px'}
                    height={'42px'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    bg={'colors.dark.100'}
                    borderStyle={'solid'}
                    borderWidth={'1px'}
                    borderColor={'rgba(0, 0, 0, 0.1)'}
                    borderRadius={'8px'}
                    flexShrink={0}
                  >
                    <Text fontSize={'20px'}>💎</Text>
                  </Flex>
                  <VStack>
                    <Text
                      color={'colors.dark.800'}
                      fontWeight={'fontWeights.semibold'}
                      fontSize={'15px'}
                      letterSpacing={'-.072px'}
                    >
                      asdasdasdasdasdasdasdasdasd
                    </Text>
                    <Text
                      color={'colors.dark.600'}
                      fontWeight={'fontWeights.normal'}
                      fontSize={'13px'}
                      letterSpacing={'-.05px'}
                      lineBreak={'anywhere'}
                    >
                      asdasdasdasdasdasdasddasdasdasdasdasdasddasdasdasdasdasdasddasdasdasdasdasdasddasdasdasdasdasdasd
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </Grid>
          </VStack>
        </VStack>
      </VStack>
    </Flex>
  </VStack>
));
