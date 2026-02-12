'use client';

import { Box } from '@kuma-ui/core';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '../../i18n/navigation';

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const nextLocale = locale === 'ko' ? 'en' : 'ko';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Box
      as="button"
      onClick={toggle}
      border="1px solid #E2E8F0"
      borderRadius="8px"
      padding="6px 12px"
      bg="white"
      cursor="pointer"
      fontSize="14px"
      fontWeight="600"
      color="#1A202C"
      _hover={{ bg: '#F7FAFC' }}
      transition="all 0.2s"
    >
      {locale === 'ko' ? '🇰🇷 KO' : '🇺🇸 EN'}
    </Box>
  );
};
