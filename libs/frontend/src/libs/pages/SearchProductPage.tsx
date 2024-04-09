import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack, Text } from '@kuma-ui/core';
import { SearchProductResult } from '../search/shells/SearchProductResult';

type Props = { searchParams: { [key: string]: string | string[] | undefined } };

export function SearchProductPage({ searchParams }: Props) {
  if (!searchParams.query) {
    return (
      <Layout>
        <VStack as={'main'} width={'100%'} py={'32px'}>
          <ContentArea>
            <VStack gap={'12px'}>
              <Text
                fontWeight={'fontWeights.semibold'}
                color={'colors.dark.800'}
                fontSize={'22px'}
                letterSpacing={'-.2px'}
                textAlign={'center'}
              >
                위 검색 창에 검색어를 입력해주세요.
              </Text>
              <Text fontWeight={'fontWeights.medium'} color={'colors.dark.500'} fontSize={'16px'} textAlign={'center'}>
                ex) 서비스 이름: ‘토스’, ‘네이버’ 혹은 카테고리: ‘금융’, ‘영상’ 등...
              </Text>
            </VStack>
          </ContentArea>
        </VStack>
      </Layout>
    );
  }

  return (
    <Layout>
      <VStack as={'main'} width={'100%'} py={'20px'}>
        <ContentArea>
          <VStack gap="20px">
            <Text fontWeight={'fontWeights.semibold'} fontSize={'22px'} letterSpacing={'-.2px'}>
              ‘{searchParams.query}’ 검색 결과
            </Text>
            <SearchProductResult query={searchParams.query as string} />
          </VStack>
        </ContentArea>
      </VStack>
    </Layout>
  );
}
