import { Field, ObjectType } from 'type-graphql';

@ObjectType('TranslationFreshness', {
  description: '현재 원문과 저장된 영어 번역 provenance를 비교한 필드별 최신 여부.',
})
export class TranslationFreshness {
  @Field(() => String, {
    description:
      '해당 필드의 Product, ProductFeature 또는 Magazine 종류. Product features 요청은 ProductFeature 행으로 반환된다.',
  })
  entityType: string;
  @Field(() => String, { description: '해당 필드를 소유하는 엔티티 ID.' }) entityId: string;
  @Field(() => String, { description: '비교한 원문 필드 이름.' }) field: string;
  @Field(() => String, {
    description:
      'current: 서버 원문 hash 일치 또는 원문 없는 optional 필드. stale: hash 불일치 또는 legacy null provenance. missing: 필요한 영어 번역 행이 없음.',
  })
  status: string;
}
