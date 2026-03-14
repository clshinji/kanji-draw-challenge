/* ============================================
   HanziWriter ラッパー
   KanjiRenderer — HanziWriter.create() をラップ
   ============================================ */

const KanjiRenderer = (() => {
  let writer = null;
  let currentChar = null;
  let _targetId = null;
  let _quizActive = false;
  let _quizResult = null;

  function init(targetId) {
    _targetId = targetId;
  }

  function setKanji(char) {
    if (writer) {
      // 既存のwriterを破棄
      writer = null;
    }
    currentChar = char;
    _quizActive = false;
    _quizResult = null;

    const target = document.getElementById(_targetId);
    target.innerHTML = '';

    const size = Math.min(target.clientWidth, target.clientHeight);

    writer = HanziWriter.create(_targetId, char, {
      width: size,
      height: size,
      padding: 20,
      showOutline: true,
      showCharacter: false,
      strokeColor: '#3D3832',
      outlineColor: '#D4E8DC',
      highlightColor: '#F2956B',
      drawingColor: '#3D3832',
      drawingWidth: 6,
      highlightOnComplete: true,
      showHintAfterMisses: 2,
      highlightCompleteColor: '#5A8F6E',
      charDataLoader: _charDataLoader,
    });
  }

  function _charDataLoader(char, onLoad, onError) {
    fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0/' + char + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Not found: ' + char);
        return r.json();
      })
      .then(onLoad)
      .catch(function () {
        // 日本語データにない場合、中国語データにフォールバック
        fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/' + char + '.json')
          .then(function (r) {
            if (!r.ok) throw new Error('Not found: ' + char);
            return r.json();
          })
          .then(onLoad)
          .catch(onError);
      });
  }

  function startQuiz(onComplete) {
    if (!writer) return;
    _quizActive = true;
    _quizResult = null;

    writer.quiz({
      onComplete: function (summary) {
        _quizActive = false;
        _quizResult = summary;
        if (onComplete) onComplete(summary);
      },
    });
  }

  function cancelQuiz() {
    if (!writer || !_quizActive) return;
    _quizActive = false;
    // quiz をキャンセルして漢字を再表示
    setKanji(currentChar);
  }

  function animateCharacter(onComplete) {
    if (!writer) return;
    writer.animateCharacter({
      onComplete: onComplete || function () {},
    });
  }

  function showCharacter() {
    if (!writer) return;
    writer.showCharacter();
  }

  function hideCharacter() {
    if (!writer) return;
    writer.hideCharacter();
  }

  function showOutline() {
    if (!writer) return;
    writer.showOutline();
  }

  function isQuizActive() {
    return _quizActive;
  }

  function getQuizResult() {
    return _quizResult;
  }

  function getCurrentKanji() {
    return currentChar;
  }

  function getWriter() {
    return writer;
  }

  return {
    init,
    setKanji,
    startQuiz,
    cancelQuiz,
    animateCharacter,
    showCharacter,
    hideCharacter,
    showOutline,
    isQuizActive,
    getQuizResult,
    getCurrentKanji,
    getWriter,
  };
})();
