import {
  ProductScreenshot,
  ProductScreenshotRepository,
} from "@darun/products-domain";
import { ProductScreenshotRepositoryToken } from "@darun/products-domain";
import { Drizzle } from "@darun/provider-database";
import { DrizzleToken } from "@darun/provider-database";
import DataLoader from "dataloader";
import { eq, inArray } from "drizzle-orm";
import { groupBy } from "es-toolkit";
import { Inject, Service } from "typedi";
import { productScreenshots } from "../entities/ProductScreenshotsSchema";

@Service(ProductScreenshotRepositoryToken)
export class PostgresqlProductScreenshotRepository implements ProductScreenshotRepository {
  private productIdLoader: DataLoader<string, ProductScreenshot[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productScreenshots)
          .where(inArray(productScreenshots.productId, [...productIds]));

        const groupByDocs = groupBy(docs, (doc) => doc.productId);
        return productIds.map((productId) => groupByDocs[productId] || []);
      },
      {
        cache: true,
      },
    );
  }

  insert(productScreenshot: ProductScreenshot): Promise<ProductScreenshot> {
    return this.db
      .transaction(async (tx) => {
        const inserted = await tx
          .insert(productScreenshots)
          .values(productScreenshot)
          .returning();

        if (!inserted[0]) {
          throw new Error("Failed to insert product screenshot");
        }
        return inserted[0];
      })
      .then((result) => {
        this.productIdLoader.clearAll();
        return result;
      });
  }

  async findManyByProductIdSortByPriorityDesc(
    productId: string,
  ): Promise<ProductScreenshot[]> {
    return this.productIdLoader.load(productId);
  }

  async findById(id: string): Promise<ProductScreenshot | null> {
    const result = await this.db
      .select()
      .from(productScreenshots)
      .where(eq(productScreenshots.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  async deleteById(id: string): Promise<void> {
    await this.db
      .delete(productScreenshots)
      .where(eq(productScreenshots.id, id));
    this.productIdLoader.clearAll();
  }
}
