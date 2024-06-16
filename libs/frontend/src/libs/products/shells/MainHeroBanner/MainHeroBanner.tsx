import { ContentArea } from '@darun/ui-foundation';
import { SearchIcon } from '@darun/ui-icons';
import { Box, Flex, HStack, Input, Text, VStack } from '@kuma-ui/core';
import Image from 'next/image';
import { ProductsCount } from '../../components/ProductsCount';

export const MainHeroBanner = () => {
  return (
    <Flex background={'colors.dark.900'} position={'relative'} width={'100%'} overflow={'hidden'} py={'40px'}>
      <Flex position={'absolute'} top={0} bottom={0} right={-140} zIndex={20} width="100%">
        <Box
          as={Image}
          fill={true}
          src={'/images/main-hero-banner.png'}
          alt="hero banner"
          objectFit="contain"
          objectPosition="right"
          priority={true}
        />
      </Flex>
      <Flex zIndex={40} width={'100%'}>
        <ContentArea>
          <VStack py={'60px'} px={'12px'} gap={'24px'}>
            <VStack gap={'8px'}>
              <Text
                fontSize={['16px', '18px']}
                fontWeight={'fontWeights.medium'}
                letterSpacing={'-.4px'}
                color={'colors.dark.300'}
                as="h1"
              >
                다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다
              </Text>
              <Text
                fontSize={['28px', '32px']}
                fontWeight={'fontWeights.bold'}
                letterSpacing={'-.8px'}
                color={'colors.dark.100'}
                as="h1"
              >
                <ProductsCount />
                개의{' '}
                <Text as={'span'} color={'colors.brown.600'}>
                  다른
                </Text>{' '}
                서비스를 발견하세요
              </Text>
            </VStack>
            <HStack
              background={'#fff'}
              flexGrow={1}
              borderRadius={14}
              border="1px solid rgba(0, 0, 0, 0.15)"
              px={16}
              py={11}
              borderStyle="solid"
              gap={8}
              boxShadow="0px 2px 4px 0px rgba(0, 0, 0, 0.08)"
            >
              <SearchIcon size={18} />
              <Input
                width="100%"
                border="none"
                outline="none"
                placeholder="이곳을 눌러 빠르게 검색하세요."
                color="colors.dark.700"
                fontSize={15}
                letterSpacing={-0.1}
              />
            </HStack>
          </VStack>
        </ContentArea>
      </Flex>
    </Flex>
  );
};
