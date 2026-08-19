// 再利用可能なカレンダー日付選択コンポーネント(docs/ROADMAP.md「27. カスタムカレンダー
// ピッカーの導入」)。単一選択モード("YYYY-MM-DD"文字列を返す。既存の<input type="date">の
// 置き換え用)と複数選択モード(タップで選択/解除でき、選択済み日付の配列を返す)を
// オプションで切り替えられる。時間帯選択は対象外(日付のみ)。
// 日付グリッド生成(buildMonthGrid等)はDOM非依存の純粋関数として切り出し、
// src/datePicker.test.jsで検証する。

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toDateString(year, month, day) {
  // monthは0始まり(Dateオブジェクトの慣習に合わせる)。
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function parseDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month: month - 1, day };
}

// 指定した年月のカレンダーグリッドを生成する(前月・翌月の日は含めず、月初の曜日
// オフセット分をnullで埋めた7列分の配列にする)。
export function buildMonthGrid(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function addMonths(year, month, delta) {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

function todayDateString() {
  const today = new Date();
  return toDateString(today.getFullYear(), today.getMonth(), today.getDate());
}

// container(空のDOM要素)にカレンダーUIを描画する。
// options.mode: 'single'(既定) | 'multi'
// options.value: singleなら"YYYY-MM-DD"文字列かnull、multiなら文字列配列
// options.onChange(value): 選択が変わるたびに呼ばれる(valueの形はmodeに準じる)
export function createDatePicker(container, options = {}) {
  const mode = options.mode === 'multi' ? 'multi' : 'single';
  const onChange = options.onChange || (() => {});
  const todayStr = todayDateString();

  let selected = mode === 'multi' ? new Set(options.value || []) : (options.value || null);

  const initialAnchor = mode === 'multi'
    ? (options.value && options.value.length > 0 ? options.value[options.value.length - 1] : todayStr)
    : (options.value || todayStr);
  const { year: initialYear, month: initialMonth } = parseDateString(initialAnchor);

  let viewYear = initialYear;
  let viewMonth = initialMonth;

  function currentValue() {
    return mode === 'multi' ? [...selected].sort() : selected;
  }

  function isSelected(dateStr) {
    return mode === 'multi' ? selected.has(dateStr) : selected === dateStr;
  }

  function selectDate(dateStr) {
    if (mode === 'multi') {
      if (selected.has(dateStr)) selected.delete(dateStr);
      else selected.add(dateStr);
    } else {
      selected = selected === dateStr ? null : dateStr;
    }
    onChange(currentValue());
    render();
  }

  function render() {
    container.innerHTML = '';
    container.classList.add('date-picker');

    const header = document.createElement('div');
    header.className = 'date-picker-header';

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'date-picker-nav';
    prevButton.textContent = '‹';
    prevButton.setAttribute('aria-label', '前の月');
    prevButton.addEventListener('click', () => {
      ({ year: viewYear, month: viewMonth } = addMonths(viewYear, viewMonth, -1));
      render();
    });

    const label = document.createElement('span');
    label.className = 'date-picker-label';
    label.textContent = `${viewYear}年${viewMonth + 1}月`;

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'date-picker-nav';
    nextButton.textContent = '›';
    nextButton.setAttribute('aria-label', '次の月');
    nextButton.addEventListener('click', () => {
      ({ year: viewYear, month: viewMonth } = addMonths(viewYear, viewMonth, 1));
      render();
    });

    header.appendChild(prevButton);
    header.appendChild(label);
    header.appendChild(nextButton);
    container.appendChild(header);

    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'date-picker-grid date-picker-weekdays';
    for (const weekdayLabel of WEEKDAY_LABELS) {
      const cell = document.createElement('span');
      cell.textContent = weekdayLabel;
      weekdayRow.appendChild(cell);
    }
    container.appendChild(weekdayRow);

    const grid = document.createElement('div');
    grid.className = 'date-picker-grid';
    for (const day of buildMonthGrid(viewYear, viewMonth)) {
      if (day === null) {
        grid.appendChild(document.createElement('span'));
        continue;
      }
      const dateStr = toDateString(viewYear, viewMonth, day);
      const dayButton = document.createElement('button');
      dayButton.type = 'button';
      dayButton.className = 'date-picker-day';
      if (dateStr === todayStr) dayButton.classList.add('date-picker-today');
      if (isSelected(dateStr)) dayButton.classList.add('date-picker-selected');
      dayButton.textContent = String(day);
      dayButton.dataset.date = dateStr;
      dayButton.addEventListener('click', () => selectDate(dateStr));
      grid.appendChild(dayButton);
    }
    container.appendChild(grid);
  }

  render();

  return {
    getValue: currentValue,
    setValue(value) {
      selected = mode === 'multi' ? new Set(value || []) : (value || null);
      render();
    },
    destroy() {
      container.innerHTML = '';
      container.classList.remove('date-picker');
    },
  };
}
