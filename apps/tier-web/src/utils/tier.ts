const TIER_BADGE_STYLES = {
  1: 'border-[color:var(--tier-1-border)] bg-[color:var(--tier-1-bg)] text-[color:var(--tier-1-fg)]',
  2: 'border-[color:var(--tier-2-border)] bg-[color:var(--tier-2-bg)] text-[color:var(--tier-2-fg)]',
  3: 'border-[color:var(--tier-3-border)] bg-[color:var(--tier-3-bg)] text-[color:var(--tier-3-fg)]',
  0: 'border-[color:var(--tier-0-border)] bg-[color:var(--tier-0-bg)] text-[color:var(--tier-0-fg)]',
} as const;

export function getTierBadgeColor(tier: number | null): string {
  if (tier === 1 || tier === 2 || tier === 3) {
    return TIER_BADGE_STYLES[tier];
  }

  return TIER_BADGE_STYLES[0];
}

export function getTierLabel(tier: number | null): string {
  if (tier === 1 || tier === 2 || tier === 3) {
    return `${tier}티어`;
  }

  return '티어 없음';
}

export function getTierDescription(tier: string): string {
  switch (tier) {
    case '1':
      return '가장 먼저 살펴볼 만한 대응 앱들입니다.';
    case '2':
      return '핵심 흐름은 안정적이지만 완성도 차이가 있는 앱들입니다.';
    case '3':
      return '부분 대응 상태를 확인할 수 있는 앱들입니다.';
    default:
      return '아직 티어가 정리되지 않았거나 비교 중인 앱들입니다.';
  }
}
