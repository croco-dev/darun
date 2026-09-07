'use client';

import { Button, ExternalLink } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import Image from 'next/image';
import Link from 'next/link';
import { useProductLinks } from './useProductLinks';

export const ProductLinks = bind(useProductLinks, ({ links }) => (
  <>
    {links.map((link, index) => {
      const isPrimary = index === 0;
      return (
        <Link key={link.id} href={link.link} target="_blank" rel="noopener noreferrer" className="group">
          <Button
            variant="shadow"
            color={isPrimary ? 'primary' : 'secondary'}
            size="md"
            className="transition-all duration-200"
          >
            <div className="flex items-center justify-center gap-2">
              <Image
                src={link.iconUrl}
                alt={link.title}
                width={18}
                height={18}
                className="shrink-0 rounded-sm object-contain"
                unoptimized
              />
              <div className="flex flex-col items-start gap-0">
                <span className="w-max break-keep text-sm font-semibold text-current">{link.title}</span>
                {isPrimary && <span className="break-keep text-xs text-dark-300">{link.displayLink}</span>}
              </div>
              <ExternalLink
                size={14}
                className={`shrink-0 transition-opacity ${
                  isPrimary ? 'text-dark-400 group-hover:text-white' : 'text-dark-400 group-hover:text-dark-800'
                }`}
              />
            </div>
          </Button>
        </Link>
      );
    })}
  </>
));
