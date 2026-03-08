import { ProductInformation, ProductUserAction } from "../../components";

type ProductSummaryProps = { slug: string };

export const ProductSummary = ({ slug }: ProductSummaryProps) => (
  <div className="py-4 flex justify-between items-center">
    <ProductInformation slug={slug} />
    <ProductUserAction slug={slug} />
  </div>
);
