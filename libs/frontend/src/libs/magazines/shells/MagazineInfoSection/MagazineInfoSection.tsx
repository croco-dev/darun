import { VStack, Text, Image, HStack } from '@kuma-ui/core';

type MagazineInfoSectionProps = { slug: string };

export const MagazineInfoSection = ({ slug }: MagazineInfoSectionProps) => {
  return (
    <VStack py={['24px', '44px', '44px']} borderRadius="24px" position={'relative'} overflow={'hidden'}>
      <Image
        borderRadius="24px"
        position={'absolute'}
        top={0}
        left={0}
        right={0}
        bottom={0}
        width={'100%'}
        height={'100%'}
        zIndex={5}
        objectFit={'cover'}
        src={
          'https://images.unsplash.com/photo-1738683987578-e8a796a9de27?q=80&w=3687&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        }
      />
      <VStack
        position={'absolute'}
        top={0}
        left={0}
        right={0}
        bottom={0}
        background={'rgba(0, 0, 0, 0.6)'}
        zIndex={10}
      ></VStack>
      <VStack gap={'20px'} zIndex={15} px={['28px', '28px', '44px']}>
        <HStack
          border={'1px solid rgba(255, 255, 255, 0.6)'}
          py={'4px'}
          px={'12px'}
          borderRadius="100px"
          width={'fit-content'}
        >
          <Text
            fontSize={['12px', '14px', '14px']}
            fontWeight={400}
            letterSpacing={'-.36px'}
            color={'rgba(255, 255 , 255, 0.8)'}
          >
            다른 매거진
          </Text>
        </HStack>
        <VStack gap={'12px'}>
          <Text
            fontSize={['24px', '24px', '36px']}
            fontWeight={600}
            letterSpacing={'-.6px'}
            color={'#fff'}
            lineHeight={1.4}
          >
            넷플릭스의 가격 인상 발표, 대안 서비스는 뭐가 있을까?
          </Text>
          <Text
            fontSize={['14px', '16px', '16px']}
            fontWeight={400}
            letterSpacing={'-.2px'}
            color={'rgba(255, 255 , 255, 0.7)'}
            lineHeight={1.3}
          >
            넷플릭스의 연이은 구독 가격 상승에 부담을 느끼는 소비자들이 늘어나고 있다.
          </Text>
          <Text
            fontSize={['14px', '16px', '16px']}
            fontWeight={400}
            letterSpacing={'-.24px'}
            color={'rgba(255, 255 , 255, 0.8)'}
          >
            2025.02.18 ∙ by 도다
          </Text>
        </VStack>
      </VStack>
    </VStack>
  );
};
