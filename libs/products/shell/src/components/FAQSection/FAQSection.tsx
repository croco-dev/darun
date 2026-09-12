'use client';

import { SectionHeader } from '@darun/ui';
import { ChevronDown } from 'lucide-react';
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
    <section id="faq" className="flex w-full flex-col gap-4 scroll-mt-32 md:gap-5">
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
    <div className="w-full overflow-hidden rounded-card-lg border border-dark-150/80 bg-white shadow-card transition-all duration-200 hover:border-dark-300 hover:shadow-card-hover">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 bg-transparent p-5 text-left transition-colors duration-200 hover:bg-surface-100 active:bg-surface-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
      >
        <p className="flex-1 text-base font-semibold leading-snug tracking-tight text-dark-900 break-keep">
          {question}
        </p>
        <div
          aria-hidden="true"
          className={`shrink-0 rounded-full bg-surface-100 p-1.5 text-dark-500 transition-all duration-300 ease-out group-hover:bg-surface-200/80 group-hover:text-dark-900 motion-reduce:transition-none motion-reduce:transform-none ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          <ChevronDown size={16} className="stroke-[2.25]" />
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
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none"
      >
        <div ref={panelRef} className="border-t border-dark-150/70 bg-surface-50/50 px-5 pb-5 pt-4 text-dark-600">
          <p className="whitespace-pre-wrap text-sm leading-relaxed break-keep sm:text-base">{answer}</p>
        </div>
      </section>
    </div>
  );
}
