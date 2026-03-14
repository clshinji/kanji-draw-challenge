/* ============================================
   進捗管理 (localStorage)
   ============================================ */

const Progress = (() => {
  const STORAGE_KEY = 'kanji-practice-progress';

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function _save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full or unavailable
    }
  }

  /** 漢字の星数を取得 (0-3) */
  function getStars(char) {
    const data = _load();
    return data[char]?.stars || 0;
  }

  /** 漢字の星数を更新（既存より高い場合のみ） */
  function setStars(char, stars) {
    const data = _load();
    const current = data[char]?.stars || 0;
    if (stars > current) {
      data[char] = {
        stars,
        lastPracticed: Date.now(),
        count: (data[char]?.count || 0) + 1,
      };
    } else {
      data[char] = {
        ...data[char],
        lastPracticed: Date.now(),
        count: (data[char]?.count || 0) + 1,
      };
    }
    _save(data);
  }

  /** 練習済み漢字数を取得 */
  function getPracticedCount() {
    const data = _load();
    return Object.keys(data).length;
  }

  /** 全体の星の合計を取得 */
  function getTotalStars() {
    const data = _load();
    return Object.values(data).reduce((sum, v) => sum + (v.stars || 0), 0);
  }

  /** 全進捗データを取得 */
  function getAll() {
    return _load();
  }

  /** 進捗リセット */
  function reset() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { getStars, setStars, getPracticedCount, getTotalStars, getAll, reset };
})();
