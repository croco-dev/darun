import { MagazineFeatureSection } from '@darun/magazines-shell';
import {
  CategoryNavigationSection,
  MainHeroBanner,
  RecentProductSection,
  TrendingProductSection,
} from '@darun/products-shell';

export default function HomePage() {
  return (
    <main>
      <MainHeroBanner />
      <CategoryNavigationSection />
      <TrendingProductSection />
      <MagazineFeatureSection articles={[]} />
      <RecentProductSection />
    </main>
  );
}
