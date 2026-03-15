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
    GameState.init();
    KanjiRenderer.init('hanzi-target');
    Feedback.init();

    _updateHomeScreen();
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
      _updateHomeScreen();
    });

    document.getElementById('btn-back-select').addEventListener('click', function () {
      if (StrokeGuide.isActive()) StrokeGuide.exitStepMode();
      if (KanjiRenderer.isQuizActive()) KanjiRenderer.cancelQuiz();
      _showScreen('select');
      _buildCategoryTabs();
      _buildKanjiGrid();
    });

    document.getElementById('btn-stroke-order').addEventListener('click', function () {
      if (!currentKanjiChar) return;
      if (StrokeGuide.isActive()) {
        StrokeGuide.exitStepMode();
      } else {
        StrokeGuide.enterStepMode();
      }
    });

    document.getElementById('btn-clear').addEventListener('click', function () {
      if (!currentKanjiChar) return;
      if (StrokeGuide.isActive()) StrokeGuide.exitStepMode();
      KanjiRenderer.setKanji(currentKanjiChar);
      setTimeout(function () {
        KanjiRenderer.startQuiz(_onQuizComplete);
      }, 300);
    });

    document.getElementById('btn-done').addEventListener('click', _onDone);

    // 設定画面
    document.getElementById('btn-settings').addEventListener('click', function () {
      _showScreen('settings');
      _initSettingsScreen();
    });

    document.getElementById('btn-back-settings').addEventListener('click', function () {
      _showScreen('home');
      _updateHomeScreen();
    });

    document.getElementById('btn-copy-device-id').addEventListener('click', function () {
      _copyToClipboard(CloudSync.getDeviceId(), this);
    });
    document.getElementById('btn-upload').addEventListener('click', _handleUpload);
    document.getElementById('btn-download').addEventListener('click', _handleDownload);
    document.getElementById('btn-generate-code').addEventListener('click', _handleGenerateCode);
    document.getElementById('btn-redeem-code').addEventListener('click', _handleRedeemCode);

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

  // --- ホーム画面の更新 ---
  function _updateHomeScreen() {
    Mascot.renderTo('home-mascot', 'happy', 120);

    var level = GameState.getLevel();
    var xpProgress = GameState.getXPProgress();

    var levelBadge = document.getElementById('level-badge');
    levelBadge.innerHTML =
      '<span class="level-num">' + level.level + '</span>' +
      '<span>' + level.title + '</span>';

    document.getElementById('xp-bar-fill').style.width = xpProgress.percent + '%';
    document.getElementById('xp-label').textContent = xpProgress.current + ' / ' + xpProgress.needed + ' XP';

    var streakDisplay = document.getElementById('streak-display');
    var streak = GameState.getStreak();
    if (streak > 0) {
      streakDisplay.innerHTML =
        '<div class="streak-counter"><span class="streak-fire">🔥</span> ' +
        streak + 'にちれんぞく！</div>';
    } else {
      streakDisplay.innerHTML = '';
    }

    var statsEl = document.getElementById('home-stats');
    var practiced = Progress.getPracticedCount();
    var totalStars = Progress.getTotalStars();
    var total = KANJI_DATA.length;
    statsEl.innerHTML =
      '<div class="stat-badge"><span class="stat-label">れんしゅう</span> <span class="stat-value">' + practiced + '/' + total + '</span></div>' +
      '<div class="stat-badge"><span class="stat-label">おほし</span> <span class="stat-value">' + totalStars + 'こ</span></div>';

    Garden.renderPreview('garden-grid', 30);
  }

  // --- カテゴリタブ ---
  function _buildCategoryTabs() {
    var container = document.getElementById('category-tabs');
    container.innerHTML = '';

    CATEGORIES.forEach(function (cat) {
      var tab = document.createElement('button');
      var unlocked = GameState.isUnlocked(cat.id);

      tab.className = 'tab' + (cat.id === currentCategory ? ' active' : '');

      if (!unlocked) {
        tab.classList.add('locked');
        var requiredXP = GameState.getUnlockXP(cat.id);
        tab.innerHTML = cat.label + '<span class="tab-unlock-info">' + requiredXP + 'XP</span>';
      } else {
        tab.textContent = cat.label;
      }

      tab.addEventListener('click', function () {
        if (!unlocked) return;
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
          badge.appendChild(_createStarSVG(12));
        }
        cell.appendChild(badge);
      }

      cell.addEventListener('click', function () {
        _startPractice(kanji, idx);
      });

      grid.appendChild(cell);
    });
  }

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

    var infoEl = document.getElementById('kanji-info');
    infoEl.innerHTML =
      '<div class="kanji-display">' + kanji.char + '</div>' +
      '<div class="kanji-reading">' +
        '<div>' + (kanji.on ? 'おんよみ: ' + kanji.on : '') + '</div>' +
        '<div>' + (kanji.kun ? 'くんよみ: ' + kanji.kun : '') + '</div>' +
        '<div>' + kanji.strokes + 'かく</div>' +
      '</div>' +
      '<div class="kanji-example">' + kanji.example + '</div>';

    _updateComboDisplay();

    document.getElementById('practice-title').textContent =
      '「' + kanji.char + '」のれんしゅう';

    _showScreen('practice');

    requestAnimationFrame(function () {
      KanjiRenderer.setKanji(kanji.char);
      setTimeout(function () {
        KanjiRenderer.startQuiz(_onQuizComplete);
      }, 500);
    });
  }

  function _updateComboDisplay() {
    var comboEl = document.getElementById('combo-counter');
    var combo = GameState.getCombo();
    if (combo >= 2) {
      comboEl.textContent = '🔥 ' + combo + 'れんぞく';
      comboEl.classList.add('active');
    } else {
      comboEl.classList.remove('active');
    }
  }

  // --- quiz完了コールバック ---
  function _onQuizComplete(summary) {
    _handleResult(summary.totalMistakes || 0);
  }

  function _onDone() {
    var result = KanjiRenderer.getQuizResult();
    _handleResult(result ? (result.totalMistakes || 0) : 99);
  }

  // --- 結果処理（フィードバック→XP→レベルアップ→バッジのシーケンス） ---
  function _handleResult(totalMistakes) {
    var stars = Feedback.show(totalMistakes);
    Progress.setStars(currentKanjiChar, stars);

    // GameState更新 — XP計算、レベルアップ、バッジ判定
    var gameResult = GameState.onKanjiPracticed(currentKanjiChar, stars);

    // XP表示
    Feedback.showXP(gameResult.xpGained);
    Feedback.showCombo(gameResult.combo);
    _updateComboDisplay();

    // レベルアップ & バッジのシーケンス
    if (gameResult.levelUp || (gameResult.newUnlocks && gameResult.newUnlocks.length > 0) || gameResult.newBadges.length > 0) {
      _schedulePostFeedback(gameResult);
    }
  }

  function _schedulePostFeedback(gameResult) {
    var btnNext = document.getElementById('btn-next');
    var btnRetry = document.getElementById('btn-retry');

    var origNextHandler = function () {
      Feedback.hide();
      _showPostFeedbackSequence(gameResult, function () {
        _goToNextKanji();
      });
    };

    var origRetryHandler = function () {
      Feedback.hide();
      _showPostFeedbackSequence(gameResult, function () {
        KanjiRenderer.setKanji(currentKanjiChar);
        setTimeout(function () {
          KanjiRenderer.startQuiz(_onQuizComplete);
        }, 300);
      });
    };

    // 一時的にイベントを差し替え
    var newNext = btnNext.cloneNode(true);
    var newRetry = btnRetry.cloneNode(true);
    btnNext.parentNode.replaceChild(newNext, btnNext);
    btnRetry.parentNode.replaceChild(newRetry, btnRetry);

    newNext.addEventListener('click', origNextHandler);
    newRetry.addEventListener('click', origRetryHandler);
  }

  function _showPostFeedbackSequence(gameResult, onComplete) {
    var steps = [];

    if (gameResult.levelUp) {
      steps.push(function (next) {
        Feedback.showLevelUp(gameResult.newLevel, gameResult.newTitle, next);
      });
    }

    if (gameResult.newUnlocks) {
      gameResult.newUnlocks.forEach(function (unlock) {
        steps.push(function (next) {
          Feedback.showCategoryUnlock(unlock, next);
        });
      });
    }

    gameResult.newBadges.forEach(function (badge) {
      steps.push(function (next) {
        Feedback.showBadge(badge, next);
      });
    });

    function runSteps(i) {
      if (i >= steps.length) {
        _restoreButtons();
        if (onComplete) onComplete();
        return;
      }
      steps[i](function () { runSteps(i + 1); });
    }

    runSteps(0);
  }

  function _restoreButtons() {
    var btnNext = document.getElementById('btn-next');
    var btnRetry = document.getElementById('btn-retry');

    var newNext = btnNext.cloneNode(true);
    var newRetry = btnRetry.cloneNode(true);
    btnNext.parentNode.replaceChild(newNext, btnNext);
    btnRetry.parentNode.replaceChild(newRetry, btnRetry);

    newNext.addEventListener('click', function () {
      Feedback.hide();
      _goToNextKanji();
    });

    newRetry.addEventListener('click', function () {
      Feedback.hide();
      KanjiRenderer.setKanji(currentKanjiChar);
      setTimeout(function () {
        KanjiRenderer.startQuiz(_onQuizComplete);
      }, 300);
    });
  }

  // --- クリップボードコピー ---
  function _copyToClipboard(text, btnEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        _showCopyFeedback(btnEl);
      });
    } else {
      // フォールバック: 一時的な textarea を使う
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      _showCopyFeedback(btnEl);
    }
  }

  function _showCopyFeedback(btnEl) {
    if (!btnEl) return;
    var orig = btnEl.textContent;
    btnEl.textContent = 'コピーした!';
    setTimeout(function () { btnEl.textContent = orig; }, 1500);
  }

  // --- 設定画面 ---
  function _initSettingsScreen() {
    document.getElementById('settings-device-id').textContent = CloudSync.getDeviceId();
    document.getElementById('sync-status').textContent = '';
    document.getElementById('sync-status').className = 'settings-status';
    document.getElementById('transfer-status').textContent = '';
    document.getElementById('transfer-status').className = 'settings-status';
    document.getElementById('transfer-code-display').textContent = '';
    document.getElementById('transfer-code-input').value = '';
  }

  function _handleUpload() {
    var statusEl = document.getElementById('sync-status');
    statusEl.textContent = 'アップロードちゅう...';
    statusEl.className = 'settings-status';

    CloudSync.upload().then(function (result) {
      if (result.success) {
        statusEl.textContent = 'アップロードしました (' + new Date(result.savedAt).toLocaleString('ja-JP') + ')';
        statusEl.className = 'settings-status success';
      } else {
        statusEl.textContent = result.error || 'アップロードにしっぱいしました';
        statusEl.className = 'settings-status error';
      }
    });
  }

  function _handleDownload() {
    if (!confirm('ダウンロードすると、いまのデータがうわがきされます。よろしいですか？')) return;

    var statusEl = document.getElementById('sync-status');
    statusEl.textContent = 'ダウンロードちゅう...';
    statusEl.className = 'settings-status';

    CloudSync.download().then(function (result) {
      if (result.success && result.data) {
        CloudSync.applySaveData(result.data);
        GameState.init();
        statusEl.textContent = 'ダウンロードしました';
        statusEl.className = 'settings-status success';
      } else {
        statusEl.textContent = result.error || 'ダウンロードにしっぱいしました';
        statusEl.className = 'settings-status error';
      }
    });
  }

  function _handleGenerateCode() {
    var statusEl = document.getElementById('transfer-status');
    statusEl.textContent = '';
    statusEl.className = 'settings-status';

    CloudSync.generateTransferCode().then(function (result) {
      var displayEl = document.getElementById('transfer-code-display');
      if (result.success) {
        displayEl.innerHTML =
          '<div>' + result.code + '</div>' +
          '<button class="btn-copy" id="btn-copy-transfer-code">コピー</button>' +
          '<span class="transfer-code-expires">24じかんゆうこう</span>';
        document.getElementById('btn-copy-transfer-code').addEventListener('click', function () {
          _copyToClipboard(result.code, this);
        });
      } else {
        statusEl.textContent = result.error || 'コードのはっこうにしっぱいしました';
        statusEl.className = 'settings-status error';
      }
    });
  }

  function _handleRedeemCode() {
    var codeInput = document.getElementById('transfer-code-input');
    var code = codeInput.value.trim();
    var statusEl = document.getElementById('transfer-status');

    if (!/^\d{6}$/.test(code)) {
      statusEl.textContent = '6けたのすうじをにゅうりょくしてください';
      statusEl.className = 'settings-status error';
      return;
    }

    if (!confirm('ひきつぎすると、いまのデータがうわがきされます。よろしいですか？')) return;

    statusEl.textContent = 'ひきつぎちゅう...';
    statusEl.className = 'settings-status';

    CloudSync.redeemTransferCode(code).then(function (result) {
      if (result.success && result.data) {
        CloudSync.applySaveData(result.data);
        GameState.init();
        codeInput.value = '';
        statusEl.textContent = 'ひきつぎかんりょう！';
        statusEl.className = 'settings-status success';
      } else {
        statusEl.textContent = result.error || 'ひきつぎにしっぱいしました';
        statusEl.className = 'settings-status error';
      }
    });
  }

  // --- 次の漢字へ ---
  function _goToNextKanji() {
    if (filteredKanji.length === 0) return;
    var nextIndex = currentKanjiIndex + 1;
    if (nextIndex >= filteredKanji.length) nextIndex = 0;
    _startPractice(filteredKanji[nextIndex], nextIndex);
  }
})();
