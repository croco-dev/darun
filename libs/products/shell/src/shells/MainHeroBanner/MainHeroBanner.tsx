"use client";

import { ContentArea } from "@darun/ui";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ProductsCount } from "../../components/ProductsCount";
export const MainHeroBanner = () => {
  const t = useTranslations("Main");

  return (
    <div className="relative w-full overflow-hidden py-10 mb-5 rounded-3xl border shadow-sm bg-dark-900">
      <div className="absolute top-0 bottom-0 -right-[120px] -md:right-32 z-20 w-[200%] md:w-full opacity-[0.35] md:opacity-1">
        <Image
          fill={true}
          src={"/images/main-hero-banner.png"}
          alt="hero banner"
          objectFit="contain"
          objectPosition="right"
          priority={true}
        />
      </div>
      <div className="z-40 flex w-full">
        <ContentArea>
          <div className="inline-flex flex-col py-5 px-0 md:px-3 w-full gap-6 text-center md:text-left">
            <div className="flex flex-col gap-2">
              <span
                className={`text-sm md:text-lg font-medium text-center md:text-left tracking-tight text-dark-300 m-0`}
              >
                {t("hero.description")}
              </span>
              <h1
                className={`text-2xl md:text-4xl font-bold tracking-tighter text-dark-100 text-center md:text-left m-0`}
              >
                <ProductsCount />
                {t("hero.title.countSuffix")}{" "}
                <span className={`text-brown-600`}>
                  {t("hero.title.highlight")}
                </span>{" "}
                {t("hero.title.ending")}
              </h1>
            </div>
          </div>
        </ContentArea>
      </div>
    </div>
  );
};
