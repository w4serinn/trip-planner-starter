// 軽量なインラインSVGアイコン集(外部ライブラリ・CDN依存なし)。
// currentColorで塗り/線の色を継承するため、呼び出し側の要素のcolorプロパティで
// 見た目を制御できる(タブの非選択/選択状態の色分けなど)。
function icon(body, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export const icons = {
  overview: icon('<path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/>'),
  scratch: icon('<path d="M4 20l1-4L15 6a2 2 0 0 1 3 3L8 19l-4 1z"/>'),
  notes: icon('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
  destinations: icon('<path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
  schedule: icon('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>'),
  lodging: icon('<path d="M3 19v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 19h18M6 10V7a2 2 0 0 1 2-2h3v5"/>'),
  itinerary: icon('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.5" fill="currentColor" stroke="none"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>', 16),
  chevron: icon('<path d="M9 6l6 6-6 6"/>', 20),
  empty: icon('<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 12h5l1.5 2h5L16 12h5"/>', 40),
};
