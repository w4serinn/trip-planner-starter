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
  link: icon('<path d="M10 14a4 4 0 0 0 5.66 0l2-2a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-2 2a4 4 0 0 0 5.66 5.66l1-1"/>'),
  empty: icon('<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 12h5l1.5 2h5L16 12h5"/>', 40),
  menu: icon('<path d="M4 6h16M4 12h16M4 18h16"/>', 22),
  close: icon('<path d="M6 6l12 12M18 6L6 18"/>', 22),

  // 2026-08-20(docs/ROADMAP.md「68」): しおりタブのタイムラインマーカー用。
  // 足あと(道のりの1歩)・旗(次の予定の目印)。塗りつぶし表現のためfill/strokeを
  // 個別指定する(icon()デフォルトのstroke-onlyを上書き)。
  // 2026-08-21(docs/ROADMAP.md「75」): footprintは項目間の連結線上の軌跡装飾
  // (`80`)専用とし、バッジ自体は次の予定(flag)・過去(checkmark)・未来
  // (waypoint)の3種類に分けた。
  footprint: icon('<ellipse cx="12" cy="14" rx="4.2" ry="6.2" fill="currentColor" stroke="none"/><circle cx="8.4" cy="5.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="4.4" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.6" cy="5.6" r="1.3" fill="currentColor" stroke="none"/>', 14),
  flag: icon('<path d="M5 21V4"/><path d="M5 5h12l-3 3.5L17 12H5"/>', 14),
  checkmark: icon('<path d="M5 13l4 4L19 7"/>', 14),
  waypoint: icon('<circle cx="12" cy="12" r="7"/>', 14),
};
