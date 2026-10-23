# service-web 

> darun.io web service

상품·비교 메타데이터 조회는 문자열 인자를 캐시 키로 사용해 같은 요청에서 중복 실행하지 않습니다. `/sitemap.xml`은 전체 공개 상품을 100개씩 조회해 사이트맵 인덱스를 만들고, 각 `/sitemap/{cursor}~{partition}.xml`은 해당 페이지 한 번만 조회합니다. 상품 ID는 ULID를 포함하며 5,000개 이후의 상품도 포함합니다. 대안 페이지 유무는 관계 전체 대신 존재 여부로 조회합니다.

`pnpm --filter service-web test`는 5,001개 상품의 ULID 커서, 분할 크기·XML 직렬화, 진행되지 않는 커서와 잘못된 파티션을 검사합니다.