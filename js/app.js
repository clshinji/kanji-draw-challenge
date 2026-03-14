/* ============================================
   アプリ初期化・画面遷移・メインロジック
   HanziWriter quiz() モード対応
   ============================================ */

(function () {
  'use strict';

  let currentScreen = 'home';
  let currentCategory = 'all';
  let currentKanjiChar = null;
  let currentKanjiIndex = -1;
  let filteredKanji = [];

  // --- 初期化 ---
  document.addEventListener('DOMContentLoaded', function () {
    KanjiRenderer.init('hanzi-target');
    Feedback.init();
    _updateHomeStats();
    _buildCategoryTabs();
    _buildKanjiGrid();
    _bindEvents();
  });

  // --- イベントバインド ---
  function _bindEvents() {
    document.getElementById('btn-start').addEventListener('click', function () {
      _showScreen('select');
    });

    document.getElementById('btn-back-home').addEventListener('click', function () {
      _showScreen('home');
      _updateHomeStats();
    });

    document.getElementById('btn-back-select').addEventListener('click', function () {
      if (StrokeGuide.isActive()) StrokeGuide.exitStepMode();
      if (KanjiRenderer.isQuizActive()) KanjiRenderer.cancelQuiz();
      _showScreen('select');
      _buildKanjiGrid();
    });

    // 書き順ボタン（トグル）
    document.getElementById('btn-stroke-order').addEventListener('click', function () {
      if (!currentKanjiChar) return;
      if (StrokeGuide.isActive()) {
        StrokeGuide.exitStepMode();
      } else {
        StrokeGuide.enterStepMode();
      }
    });

    // けすボタン — quiz()を再開始
    document.getElementById('btn-clear').addEventListener('click', function () {
      if (!currentKanjiChar) return;
      if (StrokeGuide.isActive()) StrokeGuide.exitStepMode();
      KanjiRenderer.setKanji(currentKanjiChar);
      // 少し待ってからquiz開始（HanziWriterの初期化完了を待つ）
      setTimeout(function () {
        KanjiRenderer.startQuiz(_onQuizComplete);
      }, 300);
    });

    // できた！ボタン
    document.getElementById('btn-done').addEventListener('click', _onDone);

    document.getElementById('btn-retry').addEventListener('click', function () {
      Feedback.hide();
      KanjiRenderer.setKanji(currentKanjiChar);
      setTimeout(function () {
        KanjiRenderer.startQuiz(_onQuizComplete);
      }, 300);
    });

    document.getElementById('btn-next').addEventListener('click', function () {
      Feedback.hide();
      _goToNextKanji();
    });
  }

  // --- 画面遷移 ---
  function _showScreen(name) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.remove('active');
    });
    document.getElementById('screen-' + name).classList.add('active');
    currentScreen = name;
  }

  // --- ホーム画面の統計 ---
  function _updateHomeStats() {
    var statsEl = document.getElementById('home-stats');
    var practiced = Progress.getPracticedCount();
    var totalStars = Progress.getTotalStars();
    var total = KANJI_DATA.length;

    statsEl.innerHTML =
      '<div class="stat-badge"><span class="stat-label">れんしゅう</span> <span class="stat-value">' + practiced + '/' + total + '</span></div>' +
      '<div class="stat-badge"><span class="stat-label">おほし</span> <span class="stat-value">' + totalStars + 'こ</span></div>';
  }

  // --- カテゴリタブ ---
  function _buildCategoryTabs() {
    var container = document.getElementById('category-tabs');
    container.innerHTML = '';

    CATEGORIES.forEach(function (cat) {
      var tab = document.createElement('button');
      tab.className = 'tab' + (cat.id === currentCategory ? ' active' : '');
      tab.textContent = cat.label;
      tab.addEventListener('click', function () {
        currentCategory = cat.id;
        container.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        _buildKanjiGrid();
      });
      container.appendChild(tab);
    });
  }

  // --- 漢字グリッド ---
  function _buildKanjiGrid() {
    var grid = document.getElementById('kanji-grid');
    grid.innerHTML = '';

    filteredKanji = currentCategory === 'all'
      ? KANJI_DATA
      : KANJI_DATA.filter(function (k) { return k.category === currentCategory; });

    filteredKanji.forEach(function (kanji, idx) {
      var cell = document.createElement('button');
      cell.className = 'kanji-cell';
      cell.textContent = kanji.char;

      var stars = Progress.getStars(kanji.char);
      if (stars > 0) {
        var badge = document.createElement('span');
        badge.className = 'star-badge star-' + stars;
        for (var i = 0; i < stars; i++) {
          var starSvg = _createStarSVG(12);
          badge.appendChild(starSvg);
        }
        cell.appendChild(badge);
      }

      cell.addEventListener('click', function () {
        _startPractice(kanji, idx);
      });

      grid.appendChild(cell);
    });
  }

  /** 星SVGを生成 */
  function _createStarSVG(size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.style.display = 'inline-block';
    svg.style.verticalAlign = 'middle';
    var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9');
    polygon.setAttribute('fill', 'currentColor');
    svg.appendChild(polygon);
    return svg;
  }

  // --- 練習開始 ---
  function _startPractice(kanji, index) {
    currentKanjiChar = kanji.char;
    currentKanjiIndex = index;

    // 情報パネル更新
    var infoEl = document.getElementById('kanji-info');
    infoEl.innerHTML =
      '<div class="kanji-display">' + kanji.char + '</div>' +
      '<div class="kanji-reading">' +
        '<div>' + (kanji.on ? 'おんよみ: ' + kanji.on : '') + '</div>' +
        '<div>' + (kanji.kun ? 'くんよみ: ' + kanji.kun : '') + '</div>' +
        '<div>' + kanji.strokes + 'かく</div>' +
      '</div>' +
      '<div class="kanji-example">' + kanji.example + '</div>';

    // タイトル更新
    document.getElementById('practice-title').textContent =
      '「' + kanji.char + '」のれんしゅう';

    _showScreen('practice');

    // HanziWriter初期化 + quiz開始
    requestAnimationFrame(function () {
      KanjiRenderer.setKanji(kanji.char);
      // 少し待ってからquizモード開始
      setTimeout(function () {
        KanjiRenderer.startQuiz(_onQuizComplete);
      }, 500);
    });
  }

  // --- quiz完了コールバック ---
  function _onQuizComplete(summary) {
    var totalMistakes = summary.totalMistakes || 0;
    var stars = Feedback.show(totalMistakes);
    Progress.setStars(currentKanjiChar, stars);
  }

  // --- できた！（quiz途中でも結果を表示） ---
  function _onDone() {
    var result = KanjiRenderer.getQuizResult();
    if (result) {
      // quiz完了済み
      var stars = Feedback.show(result.totalMistakes || 0);
      Progress.setStars(currentKanjiChar, stars);
    } else {
      // quiz途中 — 「がんばったね」として1星を付与
      var stars = Feedback.show(99);
      Progress.setStars(currentKanjiChar, stars);
    }
  }

  // --- 次の漢字へ ---
  function _goToNextKanji() {
    if (filteredKanji.length === 0) return;

    var nextIndex = currentKanjiIndex + 1;
    if (nextIndex >= filteredKanji.length) {
      nextIndex = 0;
    }

    _startPractice(filteredKanji[nextIndex], nextIndex);
  }
})();
