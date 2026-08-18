// グループ参加用の合言葉を生成するロジック。
// 0/O, 1/I/L など見間違えやすい文字を除外した文字種のみを使う。
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MIN_LENGTH = 6;
const MAX_LENGTH = 8;

export function generatePassphrase(length = MAX_LENGTH) {
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new RangeError(`合言葉の長さは${MIN_LENGTH}〜${MAX_LENGTH}文字で指定してください`);
  }

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues, (value) => CHARSET[value % CHARSET.length]).join('');
}
