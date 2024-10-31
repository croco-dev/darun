import { ContentArea } from '@darun/ui-foundation';
import { Box, Flex, Text, VStack } from '@kuma-ui/core';
import Image from 'next/image';
import { ProductsCount } from '../../components/ProductsCount';

export const MainHeroBanner = () => {
  return (
    <Flex
      background={'colors.dark.900'}
      position={'relative'}
      width={'100%'}
      overflow={'hidden'}
      py={'40px'}
      mb={'20px'}
      borderRadius={'24px'}
      border="1px"
      boxShadow="0px 2px 4px 0px rgba(0, 0, 0, 0.08)"
    >
      <Flex
        position={'absolute'}
        top={[0, 0]}
        bottom={0}
        right={[-100, -120]}
        zIndex={20}
        width={['200%', '100%']}
        opacity={[0.35, 1]}
      >
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
          <VStack
            display={'inline-flex'}
            py={[20, 20]}
            px={[0, '12px']}
            width={'100%'}
            gap={'24px'}
            textAlign={['center', 'left']}
          >
            <VStack gap={'8px'}>
              <Text
                fontSize={['14px', '18px']}
                fontWeight={'fontWeights.medium'}
                textAlign={['center', 'left']}
                letterSpacing={'-.4px'}
                color={'colors.dark.300'}
                margin={0}
                as="span"
              >
                다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다
              </Text>
              <Text
                fontSize={['24px', '32px']}
                fontWeight={'fontWeights.bold'}
                letterSpacing={'-.8px'}
                color={'colors.dark.100'}
                textAlign={['center', 'left']}
                as="h1"
                margin={0}
              >
                <ProductsCount />
                개의{' '}
                <Text as={'span'} color={'colors.brown.600'}>
                  다른
                </Text>{' '}
                서비스를 발견하세요
              </Text>
            </VStack>
          </VStack>
        </ContentArea>
      </Flex>
    </Flex>
  );
};
