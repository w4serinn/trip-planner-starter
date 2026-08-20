// テキスト中に含まれるURL(http/https)を検出し、安全なリンクに変換して表示する
// 共通関数(docs/ROADMAP.md「65」)。行き先決め候補・宿泊候補・確定宿泊・しおり項目の
// 「メモ」・概要タブの集合メモは、いずれも読み取り専用の要素(<p>等)として表示される
// プレーンテキストのため、この関数でリンク化できる(常時編集可能な<textarea>で表示する
// 雑多メモ・企画メモには適用できない。詳細はdocs/ROADMAP.md「65」検討事項参照)。
// テキストの分割(tokenizeLinks)はDOM非依存の純粋関数として切り出し、
// src/linkify.test.jsで検証する(src/datePicker.jsと同じ考え方)。
import { isSafeUrl } from './url.js';

const URL_PATTERN = /https?:\/\/[^\s]+/g;
// URLの直後に付きがちな句読点・閉じ括弧は、文の一部とみなしリンクに含めない。
const TRAILING_PUNCTUATION = /[.,;:!?)\]}、。」』]+$/;

// textを、URLらしき部分とそれ以外のプレーンテキスト部分のトークン列に分割する。
// { type: 'text', value } | { type: 'url', value, safe }
export function tokenizeLinks(text) {
  const tokens = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index;
    const trailingMatch = match[0].match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch ? trailingMatch[0] : '';
    const url = trailing ? match[0].slice(0, -trailing.length) : match[0];
    if (!url) continue;

    if (start > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    tokens.push({ type: 'url', value: url, safe: isSafeUrl(url) });
    if (trailing) {
      tokens.push({ type: 'text', value: trailing });
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
}

// tokenizeLinks()の結果をDOMノード(テキストノード/<a>要素)の配列に変換する。
export function linkifyToNodes(text) {
  return tokenizeLinks(text).map((token) => {
    if (token.type === 'url' && token.safe) {
      const link = document.createElement('a');
      link.className = 'inline-link';
      link.href = token.value;
      link.textContent = token.value;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return link;
    }
    return document.createTextNode(token.value);
  });
}

// 既存の要素にlinkifyToNodes()の結果をまとめて追加するヘルパー。
export function appendLinkifiedText(element, text) {
  for (const node of linkifyToNodes(text)) {
    element.appendChild(node);
  }
}
