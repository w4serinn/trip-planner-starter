import { defineConfig } from 'vite';

// GitHub Pages(publicリポジトリ)へのデプロイを見据えたサブパス。
// docs/firestore-design.md「ホスティング方針」参照。
const base = '/trip-planner-starter/';

// SPA化(docs/ROADMAP.md「第2期: UI刷新」)完了に伴い、旧A〜HのマルチページMPAは廃止。
// ルートのindex.html(旧app.html)がSPAシェルとして唯一のエントリーポイント。

export default defineConfig({
  base,
});
