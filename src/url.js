// URLをリンクの`href`に使う前の安全確認。
// `<input type="url">`のブラウザ標準検証は構文の妥当性しか見ておらず、
// `javascript:`等のスキームも通してしまうため、ここでhttp/https以外を弾く。
export function isSafeUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
