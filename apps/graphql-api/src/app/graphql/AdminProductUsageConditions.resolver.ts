import { PostgresqlProductUsageConditions } from '@darun/products-datasource';
import { normalizeProductUsageConditions } from '@darun/products-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { GraphQLError } from 'graphql';
import { Arg, Authorized, Ctx, Field, ID, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import type { GraphQLContext } from '../../functions/context';

@ObjectType('AdminProductUsageCondition')
@InputType('AdminProductUsageConditionInput')
class UsageCondition {
  @Field(() => String)
  statement: string;

  @Field(() => String)
  sourceUrl: string;

  @Field(() => String)
  excerpt: string;

  @Field(() => String)
  checkedOn: string;
}

@InputType('SaveAdminProductUsageConditionsInput')
class SaveUsageConditionsInput {
  @Field(() => ID)
  productId: string;

  @Field(() => String, { nullable: true })
  expectedRevision?: string | null;

  @Field(() => [UsageCondition])
  items: UsageCondition[];
}

@ObjectType('AdminProductUsageConditions')
class UsageConditions {
  @Field(() => ID)
  productId: string;

  @Field(() => String, { nullable: true })
  revision: string | null;

  @Field(() => ID, { nullable: true })
  editorId: string | null;

  @Field(() => [UsageCondition])
  items: UsageCondition[];
}

@Resolver()
@Service()
export class AdminProductUsageConditionsResolver {
  constructor(private readonly conditions: PostgresqlProductUsageConditions) {}

  @Authorized([AuthRole.Admin])
  @Query(() => UsageConditions, {
    name: 'adminProductUsageConditions',
    nullable: true,
  })
  async getConditions(@Arg('slug', () => String) slug: string): Promise<UsageConditions | null> {
    const row = await this.conditions.findBySlug(slug);
    if (!row) return null;
    return {
      productId: row.productId,
      revision: row.conditions?.revision ?? null,
      editorId: row.conditions?.editorId ?? null,
      items: row.conditions?.items ?? [],
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => UsageConditions, { name: 'saveAdminProductUsageConditions' })
  async saveConditions(
    @Arg('input', () => SaveUsageConditionsInput)
    input: SaveUsageConditionsInput,
    @Ctx() context: GraphQLContext
  ): Promise<UsageConditions> {
    const editorId = await context.getUserIdOrThrow();
    const items = normalizeProductUsageConditions(input.items);
    if (!items || !input.productId || input.productId.includes('\0') || input.productId.length > 26) {
      throw new GraphQLError('사용 조건의 개수, 문장, 출처, 발췌, 확인 날짜를 확인해 주세요.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const snapshot = await this.conditions.save({
      productId: input.productId,
      expectedRevision: input.expectedRevision ?? null,
      editorId,
      items,
    });
    if (!snapshot) {
      throw new GraphQLError('사용 조건이 변경되었습니다. 최신 조건을 확인한 뒤 다시 저장해 주세요.', {
        extensions: { code: 'PRODUCT_USAGE_CONDITIONS_STALE' },
      });
    }
    return { productId: input.productId, ...snapshot };
  }
}
