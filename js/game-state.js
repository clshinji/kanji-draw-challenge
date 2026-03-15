/* ============================================
   ゲーム状態管理 — XP・レベル・ストリーク・バッジ
   ============================================ */

const GameState = (() => {
  const STORAGE_KEY = 'kanji-game-state';
  const OLD_STORAGE_KEY = 'kanji-practice-progress';

  const LEVELS = [
    { level: 1, title: 'かんじのたまご', xpRequired: 0 },
    { level: 2, title: 'かんじのひよこ', xpRequired: 50 },
    { level: 3, title: 'もじよみけんしゅう', xpRequired: 130 },
    { level: 4, title: 'ふでづかい', xpRequired: 250 },
    { level: 5, title: 'かんじたんけんか', xpRequired: 420 },
    { level: 6, title: 'もじのまほうつかい', xpRequired: 650 },
    { level: 7, title: 'ふでのたつじん', xpRequired: 950 },
    { level: 8, title: 'かんじはかせ', xpRequired: 1350 },
    { level: 9, title: 'もじのゆうしゃ', xpRequired: 1850 },
    { level: 10, title: 'かんじマスター', xpRequired: 2500 },
  ];

  const CATEGORY_UNLOCK = {
    shizen: 0,
    karada: 0,
    kazu: 0,
    dousa: 100,
    gakkou: 250,
    jikan: 400,
    basho: 600,
    sonota: 850,
  };

  const BADGES = [
    { id: 'first_kanji', name: 'はじめのいっぽ', desc: 'はじめてかんじをれんしゅうした', icon: '🌱', check: s => s.totalPracticed >= 1 },
    { id: 'ten_kanji', name: '10もじたっせい', desc: '10このかんじをれんしゅうした', icon: '🌿', check: s => s.totalPracticed >= 10 },
    { id: 'fifty_kanji', name: '50もじたっせい', desc: '50このかんじをれんしゅうした', icon: '🌳', check: s => s.totalPracticed >= 50 },
    { id: 'hundred_kanji', name: '100もじたっせい', desc: '100このかんじをれんしゅうした', icon: '🏆', check: s => s.totalPracticed >= 100 },
    { id: 'perfect_3', name: 'パーフェクト3', desc: '3かいれんぞくでかんぺき', icon: '⭐', check: s => s.maxCombo >= 3 },
    { id: 'perfect_5', name: 'パーフェクト5', desc: '5かいれんぞくでかんぺき', icon: '🌟', check: s => s.maxCombo >= 5 },
    { id: 'perfect_10', name: 'パーフェクト10', desc: '10かいれんぞくでかんぺき', icon: '💫', check: s => s.maxCombo >= 10 },
    { id: 'streak_3', name: '3にちれんぞく', desc: '3にちれんぞくでれんしゅうした', icon: '🔥', check: s => s.maxStreak >= 3 },
    { id: 'streak_7', name: '1しゅうかん', desc: '7にちれんぞくでれんしゅうした', icon: '🎯', check: s => s.maxStreak >= 7 },
    { id: 'xp_500', name: '500XPたっせい', desc: '500XPをためた', icon: '💎', check: s => s.totalXP >= 500 },
    { id: 'all_stars', name: 'ぜんぶ★3', desc: 'すべてのかんじで★3をとった', icon: '👑', check: s => s.allPerfect },
  ];

  let state = null;

  function _defaultState() {
    return {
      totalXP: 0,
      combo: 0,
      maxCombo: 0,
      streak: 0,
      maxStreak: 0,
      lastPracticeDate: null,
      badges: [],
      gardenPlots: {},
      totalPracticed: 0,
      practiceToday: 0,
      todayDate: null,
    };
  }

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  function _migrateOldData() {
    try {
      const raw = localStorage.getItem(OLD_STORAGE_KEY);
      if (!raw) return;
      const oldData = JSON.parse(raw);
      let totalXP = 0;
      let practiced = 0;

      Object.keys(oldData).forEach(char => {
        const entry = oldData[char];
        const stars = entry.stars || 0;
        if (stars > 0) {
          practiced++;
          // Award retroactive XP
          const xp = stars === 3 ? 15 : stars === 2 ? 10 : 5;
          totalXP += xp;
          // Set garden stage based on stars
          const stage = stars === 3 ? 4 : stars === 2 ? 2 : 1;
          state.gardenPlots[char] = stage;
        }
      });

      state.totalXP = totalXP;
      state.totalPracticed = practiced;
      _save();
    } catch {}
  }

  function init() {
    const loaded = _load();
    if (loaded) {
      state = loaded;
    } else {
      state = _defaultState();
      _migrateOldData();
    }
    _updateStreak();
    _save();
  }

  function _updateStreak() {
    const today = _todayStr();

    if (state.todayDate !== today) {
      state.practiceToday = 0;
      state.todayDate = today;
    }

    if (!state.lastPracticeDate) return;

    const last = new Date(state.lastPracticeDate);
    const now = new Date(today);
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      // Streak broken
      state.streak = 0;
    }
    // diffDays === 1: streak continues (will be incremented on practice)
    // diffDays === 0: same day, no change
  }

  function _todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /**
   * Called when a kanji is practiced
   * @returns {{ xpGained, levelUp, newLevel, newTitle, newBadges, combo }}
   */
  function onKanjiPracticed(char, stars) {
    const today = _todayStr();
    const isFirstTime = !state.gardenPlots[char];

    // XP calculation
    let xp = stars === 3 ? 15 : stars === 2 ? 10 : 5;

    // First-time bonus
    if (isFirstTime) {
      xp += 5;
      state.totalPracticed++;
    }

    // Combo tracking
    if (stars === 3) {
      state.combo++;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;
      // Combo bonus: combo × 2, max +10
      xp += Math.min(state.combo * 2, 10);
    } else {
      state.combo = 0;
    }

    // Streak tracking
    if (state.lastPracticeDate !== today) {
      const last = state.lastPracticeDate ? new Date(state.lastPracticeDate) : null;
      const now = new Date(today);
      if (last) {
        const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          state.streak++;
        } else if (diffDays > 1) {
          state.streak = 1;
        }
      } else {
        state.streak = 1;
      }
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;
      // Streak bonus
      if (state.streak > 1) xp += 5;
      state.lastPracticeDate = today;
    }

    state.practiceToday++;
    state.todayDate = today;

    var lockedBefore = [];
    Object.keys(CATEGORY_UNLOCK).forEach(function (catId) {
      if (CATEGORY_UNLOCK[catId] > 0 && state.totalXP < CATEGORY_UNLOCK[catId]) {
        lockedBefore.push(catId);
      }
    });

    const oldLevel = getLevel();

    state.totalXP += xp;

    var newUnlocks = [];
    lockedBefore.forEach(function (catId) {
      if (state.totalXP >= CATEGORY_UNLOCK[catId]) {
        var cat = CATEGORIES.find(function (c) { return c.id === catId; });
        newUnlocks.push({ id: catId, label: cat ? cat.label : catId });
      }
    });

    const newLevel = getLevel();

    // Garden growth
    const currentStage = state.gardenPlots[char] || 0;
    let newStage = currentStage;
    if (stars === 3) {
      newStage = Math.min(currentStage + 1, 4);
    } else if (stars === 2 && currentStage < 2) {
      newStage = Math.min(currentStage + 1, 2);
    } else if (currentStage === 0) {
      newStage = 1;
    }
    state.gardenPlots[char] = newStage;

    // Check for new badges
    const checkState = {
      totalPracticed: state.totalPracticed,
      maxCombo: state.maxCombo,
      maxStreak: state.maxStreak,
      totalXP: state.totalXP,
      allPerfect: _checkAllPerfect(),
    };

    const newBadges = [];
    BADGES.forEach(badge => {
      if (!state.badges.includes(badge.id) && badge.check(checkState)) {
        state.badges.push(badge.id);
        newBadges.push(badge);
      }
    });

    _save();

    return {
      xpGained: xp,
      levelUp: newLevel.level > oldLevel.level,
      newLevel: newLevel.level,
      newTitle: newLevel.title,
      newBadges,
      newUnlocks,
      combo: state.combo,
    };
  }

  function _checkAllPerfect() {
    if (typeof KANJI_DATA === 'undefined') return false;
    return KANJI_DATA.every(k => (state.gardenPlots[k.char] || 0) >= 4);
  }

  function getLevel() {
    let current = LEVELS[0];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (state.totalXP >= LEVELS[i].xpRequired) {
        current = LEVELS[i];
        break;
      }
    }
    return current;
  }

  function getXPProgress() {
    const current = getLevel();
    const currentIdx = LEVELS.indexOf(current);
    const nextLevel = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;

    if (!nextLevel) {
      return { current: state.totalXP, needed: state.totalXP, percent: 100 };
    }

    const xpInLevel = state.totalXP - current.xpRequired;
    const xpNeeded = nextLevel.xpRequired - current.xpRequired;
    return {
      current: xpInLevel,
      needed: xpNeeded,
      percent: Math.min(100, Math.floor((xpInLevel / xpNeeded) * 100)),
    };
  }

  function getTotalXP() {
    return state.totalXP;
  }

  function getStreak() {
    return state.streak;
  }

  function getCombo() {
    return state.combo;
  }

  function getBadges() {
    return state.badges.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
  }

  function getGardenPlots() {
    return state.gardenPlots;
  }

  function getGardenStage(char) {
    return state.gardenPlots[char] || 0;
  }

  function isUnlocked(categoryId) {
    if (categoryId === 'all') return true;
    const required = CATEGORY_UNLOCK[categoryId];
    if (required === undefined) return true;
    return state.totalXP >= required;
  }

  function getUnlockXP(categoryId) {
    return CATEGORY_UNLOCK[categoryId] || 0;
  }

  function getAllBadgeDefinitions() {
    return BADGES;
  }

  return {
    init,
    onKanjiPracticed,
    getLevel,
    getXPProgress,
    getTotalXP,
    getStreak,
    getCombo,
    getBadges,
    getGardenPlots,
    getGardenStage,
    isUnlocked,
    getUnlockXP,
    getAllBadgeDefinitions,
    LEVELS,
  };
})();
