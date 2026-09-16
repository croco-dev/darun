export const TAG_TRANSLATIONS: Record<string, string> = {
  '개발자 도구': 'Developer Tools',
  '건강 및 피트니스': 'Health & Fitness',
  게임: 'Games',
  교육: 'Education',
  금융: 'Finance',
  내비게이션: 'Navigation',
  뉴스: 'News',
  라이프스타일: 'Lifestyle',
  비즈니스: 'Business',
  '사진 및 비디오': 'Photo & Video',
  생산성: 'Productivity',
  '소셜 네트워킹': 'Social Networking',
  쇼핑: 'Shopping',
  엔터테인먼트: 'Entertainment',
  유틸리티: 'Utilities',
  '음식 및 음료': 'Food & Drink',
  참고: 'Reference',
  이커머스: 'E-commerce',
  배달: 'Delivery',
  커머스: 'Commerce',
  중고거래: 'Secondhand Trading',
  패션: 'Fashion',
  뷰티: 'Beauty',
  여행: 'Travel',
  숙박: 'Accommodation',
  부동산: 'Real Estate',
  음악: 'Music',
  동영상: 'Video',
  인공지능: 'AI',
  보안: 'Security',
  클라우드: 'Cloud',
  협업: 'Collaboration',
  디자인: 'Design',
  마케팅: 'Marketing',
  데이터: 'Data',
  채용: 'Hiring',
  커뮤니티: 'Community',
};

export const LINK_TITLE_TRANSLATIONS: Record<string, string> = {
  '공식 홈페이지': 'Official Website',
  홈페이지: 'Website',
  웹사이트: 'Website',
  고객센터: 'Customer Support',
  문의하기: 'Contact Us',
  블로그: 'Blog',
  다운로드: 'Download',
  앱스토어: 'App Store',
  구글플레이: 'Google Play',
  문서: 'Documentation',
  '가격 안내': 'Pricing',
};

export const COMPANY_TYPE_TRANSLATIONS: Record<string, string> = {
  주식회사: 'Corporation',
  유한회사: 'Limited Liability Company',
  유한책임회사: 'LLC',
  합자회사: 'Limited Partnership',
  합명회사: 'General Partnership',
  개인사업자: 'Sole Proprietorship',
  비영리법인: 'Non-profit Organization',
  사단법인: 'Incorporated Association',
  재단법인: 'Incorporated Foundation',
};

export const COMPANY_ADDRESS_TRANSLATIONS: Record<string, string> = {
  '미국 워싱턴주': 'Washington, United States',
  '미국 캘리포니아주': 'California, United States',
  '미국 델라웨어주': 'Delaware, United States',
  '미국 뉴욕주': 'New York, United States',
  미국: 'United States',
};

export function getLocalizedTag(tag: string, locale = 'ko'): string {
  if (locale === 'en') {
    return TAG_TRANSLATIONS[tag] ?? tag;
  }
  return tag;
}

export function getLocalizedLinkTitle(title: string, locale = 'ko'): string {
  if (locale === 'en') {
    return LINK_TITLE_TRANSLATIONS[title] ?? title;
  }
  return title;
}

export function getLocalizedCompanyType(type?: string | null, locale = 'ko'): string | undefined {
  if (!type) return undefined;
  if (locale === 'en') {
    return COMPANY_TYPE_TRANSLATIONS[type] ?? type;
  }
  return type;
}

export function getLocalizedCompanyAddress(address?: string | null, locale = 'ko'): string | undefined {
  if (!address) return undefined;
  if (locale === 'en') {
    return COMPANY_ADDRESS_TRANSLATIONS[address] ?? address;
  }
  return address;
}
