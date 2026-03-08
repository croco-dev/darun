"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  const t = useTranslations("ProductDetail");

  if (!items || items.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-6 py-10">
      <h2 className="text-2xl font-bold text-dark-900">{t("faq.title")}</h2>
      <div className="flex w-full flex-col gap-3">
        {items.map((item) => (
          <FAQAccordionItem
            key={`${item.question}-${item.answer}`}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </div>
    </div>
  );
}

function FAQAccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();
  const buttonId = `faq-button-${id}`;
  const panelId = `faq-panel-${id}`;

  return (
    <div className="w-full overflow-hidden rounded-[12px] border border-dark-100 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between bg-transparent p-5 text-left transition-colors hover:bg-dark-50"
      >
        <p className="flex-1 pr-4 text-base font-semibold text-dark-900">
          {question}
        </p>
        <div
          className="text-dark-400"
          aria-hidden="true"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            focusable="false"
            aria-hidden="true"
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>
      <section
        id={panelId}
        aria-labelledby={buttonId}
        aria-hidden={!isOpen}
        style={{
          maxHeight: isOpen ? "500px" : "0px",
          opacity: isOpen ? 1 : 0,
          transition: "all 0.3s ease-in-out",
        }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-5 pt-0 text-dark-700 leading-[1.6]">
          <p className="whitespace-pre-wrap">{answer}</p>
        </div>
      </section>
    </div>
  );
}
