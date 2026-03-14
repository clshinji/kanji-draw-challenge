/* ============================================
   書き順ガイド — HanziWriter animateCharacter 利用
   ============================================ */

const StrokeGuide = (() => {
  let active = false;

  function enterStepMode() {
    if (active) return;
    active = true;

    const writer = KanjiRenderer.getWriter();
    if (!writer) {
      active = false;
      return;
    }

    // quiz中なら一旦キャンセル
    if (KanjiRenderer.isQuizActive()) {
      KanjiRenderer.cancelQuiz();
    }

    // 書き順アニメーションを再生
    KanjiRenderer.animateCharacter(function () {
      // アニメーション完了後、お手本を表示してからquizモードに戻す
      setTimeout(function () {
        if (active) {
          active = false;
          // 元の状態に戻す（outlineを表示してquiz待機状態）
          KanjiRenderer.setKanji(KanjiRenderer.getCurrentKanji());
        }
      }, 600);
    });
  }

  function exitStepMode() {
    if (!active) return;
    active = false;

    // 漢字を再セット（アニメーションキャンセル＋元の状態に戻す）
    const char = KanjiRenderer.getCurrentKanji();
    if (char) {
      KanjiRenderer.setKanji(char);
    }
  }

  function isActive() {
    return active;
  }

  return {
    enterStepMode,
    exitStepMode,
    isActive,
  };
})();
