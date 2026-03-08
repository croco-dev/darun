"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "../../i18n/navigation";

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const nextLocale = locale === "ko" ? "en" : "ko";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="cursor-pointer rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-semibold text-[#1A202C] transition-colors duration-200 hover:bg-[#F7FAFC]"
    >
      {locale === "ko" ? "🇰🇷 KO" : "🇺🇸 EN"}
    </button>
  );
};
