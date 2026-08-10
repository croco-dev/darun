'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { useId, useState, useRef, useEffect } from 'react';

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  const t = useTranslations('ProductDetail');

  if (!items || items.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-5 py-4 md:py-6">
      <SectionHeader title={t('faq.title')} />
      <div className="flex w-full flex-col gap-3">
        {items.map(item => (
          <FAQAccordionItem key={`${item.question}-${item.answer}`} question={item.question} answer={item.answer} />
        ))}
      </div>
    </section>
  );
}

function FAQAccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrollHeight, setScrollHeight] = useState(0);
  const id = useId();
  const buttonId = `faq-button-${id}`;
  const panelId = `faq-panel-${id}`;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current) {
      setScrollHeight(panelRef.current.scrollHeight);
    }
  }, [isOpen, answer]);

  return (
    <div className="w-full overflow-hidden rounded-card border border-dark-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between bg-transparent p-5 text-left transition-colors hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <p className="flex-1 pr-4 text-base font-semibold text-dark-900">{question}</p>
        <div
          aria-hidden="true"
          className={`text-dark-400 transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
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
          maxHeight: isOpen ? `${scrollHeight}px` : '0px',
          opacity: isOpen ? 1 : 0,
        }}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none"
      >
        <div ref={panelRef} className="px-5 pb-5 pt-0 text-dark-700 leading-relaxed">
          <p className="whitespace-pre-wrap">{answer}</p>
        </div>
      </section>
    </div>
  );
}
