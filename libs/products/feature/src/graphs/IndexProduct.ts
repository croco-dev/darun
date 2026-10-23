import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType('IndexProductPayload')
export class IndexProductPayload {
  @Field(() => String)
  intentId: string;

  @Field(() => String)
  productId: string;

  @Field(() => String)
  sourceRevision: string;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => String, { nullable: true })
  dispatchStatus?: string;

  @Field(() => String, { nullable: true })
  translationJobId?: string;

  @Field(() => String, { nullable: true })
  translationJobStatus?: string;

  @Field(() => String, { nullable: true })
  translationDispatchStatus?: string;
}

@ObjectType('ProductContentSyncOverview', {
  description: '관리자용 Product 원문 revision과 종류별 최신 동기화 의도 및 연결 번역 작업 상태.',
})
export class ProductContentSyncOverview {
  @Field(() => String, { description: '조회한 Product의 ID.' }) productId: string;
  @Field(() => String, {
    description: '현재 전역 원문 revision의 무손실 10진수 문자열. 각 intent revision과 다를 수 있다.',
  })
  sourceRevision: string;
  @Field(() => String, { description: '최신 검색 intent 상태. intent가 없으면 not_required.' }) searchStatus: string;
  @Field(() => String, {
    description:
      '최신 번역 의도의 등록 상태. registered는 job 등록만 뜻하며 영어 번역 완료는 translationJobStatus로 확인한다. 의도가 없으면 not_required, 대체된 의도는 superseded.',
  })
  translationDispatchStatus: string;
  @Field(() => IndexProductPayload, {
    nullable: true,
    description: '종류가 search인 최신 intent. 검색 의도가 없으면 null이며 전역 revision으로 필터하지 않는다.',
  })
  searchIntent?: IndexProductPayload;
  @Field(() => IndexProductPayload, {
    nullable: true,
    description:
      '종류가 translation인 최신 intent. 번역 의도가 없으면 null이며 검색 전용 후속 revision은 이를 대체하지 않는다.',
  })
  translationIntent?: IndexProductPayload;
  @Field(() => String, {
    nullable: true,
    description: '최신 번역 intent에 연결된 logical job ID. 수동 retry 성공 시 새 ID로 바뀌며 번역 의도가 없으면 null.',
  })
  translationJobId?: string;
  @Field(() => String, {
    nullable: true,
    description: '연결된 번역 job의 실제 상태. completed만 번역 저장 완료를 뜻하며 연결 job이 없으면 null.',
  })
  translationJobStatus?: string;
  @Field(() => String, {
    nullable: true,
    description: '연결된 번역 job의 dispatcher/실행 예약 상태. 연결 job이 없으면 null이며 등록 상태와 다르다.',
  })
  translationJobDispatchStatus?: string;
}

@InputType('IndexProductInput')
export class IndexProductInput {
  @Field()
  slug: string;
}
