'use client';

import { WriteMagazine } from '@darun/magazines-feature';

export const MagazineWriteSection = () => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3">
      <WriteMagazine />
    </div>
  </div>
);
