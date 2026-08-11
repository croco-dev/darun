'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import Image from 'next/image';
import Link from 'next/link';
import { useProductLinks } from './useProductLinks';

export const ProductLinks = bind(useProductLinks, ({ links }) => (
  <>
    {links.map((link, index) => (
      <Link key={link.id} href={link.link} target="_blank" rel="noopener noreferrer">
        <Button variant={index === 0 ? 'shadow' : 'text'} color={index === 0 ? 'primary' : 'secondary'}>
          <div className="flex items-center justify-center gap-2 px-0.5 py-0.5">
            <Image src={link.iconUrl} alt={link.title} width={20} height={20} className="shrink-0 rounded-sm" />
            <div className="flex flex-col items-start gap-0">
              <span className="w-max break-keep text-sm font-semibold text-current">{link.title}</span>
              {index === 0 && <span className="break-keep text-xs text-dark-400">{link.displayLink}</span>}
            </div>
          </div>
        </Button>
      </Link>
    ))}
  </>
));
