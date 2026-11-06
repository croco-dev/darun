export const contentHtml = `<p>출처 <a href="https://example.com/docs?a=1&amp;b=2"><strong>설명서</strong></a></p>
<p><img src="https://example.com/screen.png" alt="검색 결과 화면"></p>
<ol start="3"><li><p>설치</p><ul><li>환경 확인</li></ul></li><li>실행</li></ol>`;

// Deliberately literal: the oracle must not use the production converter.
export const contentMarkdown = `출처 [**설명서**](https://example.com/docs?a=1&b=2)

![검색 결과 화면](https://example.com/screen.png)

3. 설치

   * 환경 확인
4. 실행`;
