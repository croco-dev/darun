# GraphQL API Auth Policy

이 문서는 resolver 작성 시 인증/인가 entrypoint 선택 기준을 정의한다.

## 핵심 원칙

- **role gate는 `@Authorized`** 데코레이터로 처리한다.
- **user id 확보는 context 함수**(`getUserIdOrThrow` / `getUserId`)로 처리한다.
- 두 관심사를 섞지 않는다. `@Authorized`가 없는 resolver에서 `getUserIdOrThrow`를 호출해 인가를 대신하지 않는다.

---

## Resolver 타입별 허용 패턴

### 1. Admin-only (관리자 전용)

관리자만 접근 가능한 mutation/query.

```typescript
@Authorized([AuthRole.Admin])
@Mutation(() => SomePayload)
async someAdminMutation(@Arg('input') input: SomeInput): Promise<SomePayload> {
  // context 주입 불필요. 인가는 @Authorized가 처리.
}
```

**규칙:**
- `@Authorized([AuthRole.Admin])` 필수.
- `@Ctx()`는 user id가 비즈니스 로직에 필요할 때만 추가한다.
- `createAuthChecker()`가 `getRoles()`를 호출해 role 검증을 수행한다. resolver 내부에서 role을 직접 확인하지 않는다.

**현재 사용 예시:**
- `createProduct`, `editProduct`, `publishProduct` (ProductCoreMutationResolver, ProductPublishMutationResolver)
- `createMagazine`, `publishMagazine`, `editMagazine` (MagazineMutationResolver)
- `createCompany`, `allCompanies`, `searchCompanies` (Company resolvers)
- `allProducts`, `tempProductBySlug` (ProductQueryResolver)
- `requestTranslation` (TranslationMutationResolver)
- `createProductFeature` (FeatureMutationResolver)
- `signImageUpload` (ImageMutationResolver)

---

### 2. Admin-only + user id 필요

관리자 전용이면서 비즈니스 로직에 user id가 필요한 경우.

```typescript
@Authorized([AuthRole.Admin])
@Mutation(() => SomePayload)
async someAdminMutation(
  @Arg('input') input: SomeInput,
  @Ctx() ctx: GraphQLContext
): Promise<SomePayload> {
  const userId = await ctx.getUserIdOrThrow();
  // userId를 도메인 로직에 전달
}
```

**규칙:**
- `@Authorized([AuthRole.Admin])`이 먼저 role을 검증한다.
- `getUserIdOrThrow()`는 user id를 도메인 로직에 넘기기 위해 사용한다. 인가 목적으로 사용하지 않는다.
- `@Authorized`가 이미 인증된 사용자임을 보장하므로 `getUserIdOrThrow()`는 실질적으로 throw하지 않는다.

**현재 사용 예시:**
- `createMagazine` (MagazineMutationResolver) - `authorId` 설정에 사용

---

### 3. Public (인증 불필요)

누구나 접근 가능한 query/mutation.

```typescript
@Query(() => [Product])
async recentProducts(@Arg('first', () => Int) first: number): Promise<Product[]> {
  // @Authorized 없음. context 주입 불필요.
}
```

**규칙:**
- `@Authorized` 데코레이터를 붙이지 않는다.
- context를 주입하지 않는다.

**현재 사용 예시:**
- `recentProducts`, `rankedProducts`, `product`, `productBySlug`, `productsCount`, `searchProducts`, `productsByCategory` (ProductQueryResolver)
- `magazine`, `magazineBySlug` (MagazineQueryResolver)
- `feature` (FeatureQueryResolver)
- `hello` (HealthResolver)

---

### 4. Public + optional auth (익명 허용, 인증 시 추가 동작)

인증 여부에 따라 동작이 달라지는 경우.

```typescript
@Mutation(() => SomePayload)
async someMutation(@Ctx() ctx: GraphQLContext): Promise<SomePayload> {
  const userId = await ctx.getUserId(); // undefined if not authenticated
  // userId 유무에 따라 분기
}
```

**규칙:**
- `@Authorized` 없음.
- `getUserId()`를 사용한다. `getUserIdOrThrow()`를 사용하면 미인증 요청이 차단된다.

**현재 사용 예시:**
- 현재 코드베이스에 이 패턴을 사용하는 resolver는 없다. 향후 "로그인 시 개인화" 같은 기능에 적용한다.

---

### 5. IP 기반 (인증 불필요, IP 필수)

사용자 인증 없이 IP로 중복을 방지하는 경우.

```typescript
@Mutation(() => SomePayload)
async someMutation(@Ctx() ctx: GraphQLContext): Promise<SomePayload> {
  if (!ctx.clientIp) {
    throw new Error('Client IP is required');
  }
  // ctx.clientIp 사용
}
```

**규칙:**
- `@Authorized` 없음.
- `ctx.clientIp`를 직접 확인한다.

**현재 사용 예시:**
- `upvoteProduct` (ProductMutationResolver)

---

### 6. Public + no auth check (인증 없는 mutation)

인증 없이 누구나 실행 가능한 mutation.

```typescript
@Mutation(() => SomePayload)
async someMutation(@Arg('input') input: SomeInput): Promise<SomePayload> {
  // @Authorized 없음. context 불필요.
}
```

**규칙:**
- `@Authorized` 없음.
- 이 패턴은 의도적으로 열어둔 것임을 PR에 명시한다.

**현재 사용 예시:**
- 현재 코드베이스에 이 패턴을 사용하는 resolver는 없다. 향후 "로그인 시 개인화" 같은 기능에 적용한다.

---

## Context 함수 사용 기준

| 함수 | 반환 | 사용 시점 |
|------|------|-----------|
| `getUserId()` | `Promise<string \| undefined>` | 익명 접근을 허용하되 인증 여부에 따라 동작을 분기할 때 |
| `getUserIdOrThrow()` | `Promise<string>` | user id가 비즈니스 로직에 반드시 필요할 때. 인가 목적으로 사용하지 않는다. |
| `getRoles()` | `Promise<string[]>` | resolver 내부에서 직접 호출하지 않는다. `createAuthChecker()`가 내부적으로 사용한다. |

---

## `@Authorized` 동작 방식

`createAuthChecker()`는 `libs/shared/utils-apollo-server`에 정의되어 있다.

```typescript
// libs/shared/utils-apollo-server/src/libs/createAuthChecker/createAuthChecker.ts
export const createAuthChecker = (): AuthChecker<GraphQLContext> => {
  return async (resolverData, roles) => {
    const userRoles = await resolverData.context.getRoles();
    return userRoles.some(userRole => roles.includes(userRole));
  };
};
```

- `@Authorized([AuthRole.Admin])`은 `getRoles()`가 반환한 배열에 `'admin'`이 포함되어 있는지 확인한다.
- 미인증 요청(`authToken` 없음)은 `getRoles()`가 빈 배열을 반환하므로 자동으로 차단된다.
- 현재 정의된 role은 `AuthRole.Admin = 'admin'` 하나다.

---

## Out of Scope

다음 항목은 이 문서의 범위 밖이다. 별도 스트림에서 다룬다.

- **Input validation 전면 개편**: `@IsNotEmpty`, `class-validator` 등 validation 레이어 정비는 별도 태스크로 분리한다.
- **새 AuthRole 추가**: `AuthRole` enum 확장은 별도 설계 검토가 필요하다.
- **Rate limiting / IP throttling**: `upvoteProduct`의 IP 기반 중복 방지 외 추가 rate limiting은 별도 인프라 레이어에서 처리한다.
