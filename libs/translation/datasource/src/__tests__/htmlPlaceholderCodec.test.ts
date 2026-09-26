import { describe, expect, it } from 'vitest';
import { decodeHtml, encodeHtml } from '../codecs/htmlPlaceholderCodec';

describe('htmlPlaceholderCodec', () => {
  it('correctly encodes and decodes simple HTML text', () => {
    const original = '<p>안녕하세요 세계</p>';
    const { encodedText, placeholders } = encodeHtml(original);

    expect(encodedText).toBe('⟦HTML_0000⟧안녕하세요 세계⟦HTML_0001⟧');
    expect(placeholders.get('⟦HTML_0000⟧')).toBe('<p>');
    expect(placeholders.get('⟦HTML_0001⟧')).toBe('</p>');

    const translatedEncoded = '⟦HTML_0000⟧Hello world⟦HTML_0001⟧';
    const decoded = decodeHtml(translatedEncoded, placeholders);

    expect(decoded).toBe('<p>Hello world</p>');
  });

  it('handles nested tags and attributes properly', () => {
    const original =
      '<div class="wrapper"><p>중요한 <a href="https://example.com" target="_blank">링크</a>입니다.</p></div>';
    const { encodedText, placeholders } = encodeHtml(original);

    expect(placeholders.size).toBe(6);

    const translatedEncoded =
      '⟦HTML_0000⟧⟦HTML_0001⟧This is an important ⟦HTML_0002⟧link⟦HTML_0003⟧.⟦HTML_0004⟧⟦HTML_0005⟧';
    const decoded = decodeHtml(translatedEncoded, placeholders);

    expect(decoded).toBe(
      '<div class="wrapper"><p>This is an important <a href="https://example.com" target="_blank">link</a>.</p></div>'
    );
  });

  it('returns plain text unmodified when there are no HTML tags', () => {
    const plain = '일반 텍스트입니다.';
    const { encodedText, placeholders } = encodeHtml(plain);

    expect(encodedText).toBe(plain);
    expect(placeholders.size).toBe(0);

    const decoded = decodeHtml('Just plain text.', placeholders);
    expect(decoded).toBe('Just plain text.');
  });

  it('throws when placeholder count does not match (dropped tag)', () => {
    const original = '<p>문장 1</p><p>문장 2</p>';
    const { placeholders } = encodeHtml(original);

    // Dropped one </p>
    const translatedMissing = '⟦HTML_0000⟧Sentence 1⟦HTML_0001⟧⟦HTML_0002⟧Sentence 2';

    expect(() => decodeHtml(translatedMissing, placeholders)).toThrow(
      /HTML placeholder count mismatch/
    );
  });

  it('throws when an unexpected placeholder is introduced', () => {
    const original = '<p>내용</p>';
    const { placeholders } = encodeHtml(original);

    const translatedWithExtra = '⟦HTML_0000⟧Content⟦HTML_0001⟧⟦HTML_0099⟧';

    expect(() => decodeHtml(translatedWithExtra, placeholders)).toThrow(
      /HTML placeholder count mismatch/
    );
  });

  it('throws when a placeholder token is missing even if count somehow matches', () => {
    const original = '<p>내용</p>';
    const { placeholders } = encodeHtml(original);

    // Two tokens, but token 0 is duplicated and token 1 is missing
    const translatedDuplicated = '⟦HTML_0000⟧Content⟦HTML_0000⟧';

    expect(() => decodeHtml(translatedDuplicated, placeholders)).toThrow(
      /HTML placeholder missing/
    );
  });
});
