/* ============================================
   フィードバック・ご褒美演出（マイクラ風）
   常に肯定的、否定なし
   HanziWriter quiz() の結果に連携
   ============================================ */

const Feedback = (() => {
  let particleCanvas, particleCtx;
  let particles = [];
  let particleAnimId = null;
  let _lastResult = null;

  function init() {
    particleCanvas = document.getElementById('canvas-particles');
  }

  /**
   * quiz結果からフィードバックを表示
   * @param {number} totalMistakes - quiz()から取得したミス数
   * @returns {number} stars - 1-3
   */
  function show(totalMistakes) {
    const overlay = document.getElementById('feedback-overlay');
    const stamp = document.getElementById('feedback-stamp');
    const message = document.getElementById('feedback-message');
    const starsEl = document.getElementById('feedback-stars');

    let stars, msg, stampSrc;

    if (totalMistakes === 0) {
      stars = 3;
      msg = 'すごい！かんぺき！';
      stampSrc = 'images/stamp-diamond.png';
    } else if (totalMistakes <= 3) {
      stars = 2;
      msg = 'じょうずにかけたね！';
      stampSrc = 'images/stamp-gold.png';
    } else {
      stars = 1;
      msg = 'がんばったね！';
      stampSrc = 'images/stamp-iron.png';
    }

    stamp.innerHTML = '';
    const stampImg = document.createElement('img');
    stampImg.src = stampSrc;
    stampImg.alt = '';
    stampImg.width = 120;
    stampImg.height = 120;
    stampImg.style.imageRendering = 'pixelated';
    stamp.appendChild(stampImg);

    message.textContent = msg;

    // 星をXPオーブ画像で生成
    starsEl.innerHTML = '';
    for (let i = 0; i < stars; i++) {
      const starImg = document.createElement('img');
      starImg.src = 'images/star-xp.png';
      starImg.alt = '';
      starImg.width = 32;
      starImg.height = 32;
      starImg.style.imageRendering = 'pixelated';
      starImg.classList.add('feedback-star-icon');
      starsEl.appendChild(starImg);
    }

    overlay.classList.add('active');

    if (totalMistakes <= 3) {
      _startParticles(stars);
    }

    _lastResult = { stars, totalMistakes };
    return stars;
  }

  /**
   * XP獲得アニメーションを表示
   */
  function showXP(xpGained) {
    const xpEl = document.getElementById('feedback-xp');
    if (!xpEl) return;
    xpEl.textContent = '+' + xpGained + ' XP';
    xpEl.style.display = 'flex';
    xpEl.style.animation = 'none';
    xpEl.offsetHeight;
    xpEl.style.animation = 'bounce-in 0.5s ease-out 0.4s both';
  }

  /**
   * コンボ表示
   */
  function showCombo(combo) {
    const comboEl = document.getElementById('feedback-combo');
    if (!comboEl || combo < 2) {
      if (comboEl) comboEl.classList.remove('active');
      return;
    }
    comboEl.textContent = combo + 'れんぞく！🔥';
    comboEl.classList.add('active');
    comboEl.style.animation = 'none';
    comboEl.offsetHeight;
    comboEl.style.animation = 'combo-pop 0.4s ease-out 0.6s both';
  }

  /**
   * レベルアップ演出
   */
  function showLevelUp(level, title, onClose) {
    const overlay = document.getElementById('levelup-overlay');
    if (!overlay) { if (onClose) onClose(); return; }

    Mascot.renderTo('levelup-mascot', 'celebrating', 100);

    document.getElementById('levelup-level').textContent = 'Lv.' + level;
    document.getElementById('levelup-title').textContent = title;

    overlay.classList.add('active');

    const btn = document.getElementById('btn-levelup-ok');
    const handler = function () {
      overlay.classList.remove('active');
      btn.removeEventListener('click', handler);
      if (onClose) setTimeout(onClose, 300);
    };
    btn.addEventListener('click', handler);
  }

  /**
   * バッジポップアップ
   */
  function showBadge(badge, onClose) {
    const popup = document.getElementById('badge-popup');
    if (!popup) { if (onClose) onClose(); return; }

    document.getElementById('badge-icon').textContent = badge.icon;
    document.getElementById('badge-name').textContent = badge.name;
    document.getElementById('badge-desc').textContent = badge.desc;

    popup.classList.add('active');

    const btn = document.getElementById('btn-badge-ok');
    const handler = function () {
      popup.classList.remove('active');
      btn.removeEventListener('click', handler);
      if (onClose) setTimeout(onClose, 300);
    };
    btn.addEventListener('click', handler);
  }

  function hide() {
    const overlay = document.getElementById('feedback-overlay');
    overlay.classList.remove('active');
    _stopParticles();

    const xpEl = document.getElementById('feedback-xp');
    if (xpEl) xpEl.style.display = 'none';
    const comboEl = document.getElementById('feedback-combo');
    if (comboEl) comboEl.classList.remove('active');

    _lastResult = null;
  }

  /* --- パーティクル（ブロック型のみ） --- */

  function _startParticles(stars) {
    const dpr = window.devicePixelRatio || 1;
    particleCanvas.width = window.innerWidth * dpr;
    particleCanvas.height = window.innerHeight * dpr;
    particleCanvas.style.width = window.innerWidth + 'px';
    particleCanvas.style.height = window.innerHeight + 'px';
    particleCtx = particleCanvas.getContext('2d');
    particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    particles = [];

    const numParticles = stars === 3 ? 60 : 30;
    const colors = ['#FFD700', '#5D8C3E', '#8B6B3D', '#5FE3E3', '#FFB7C5', '#A0A0A0'];

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
      });
    }

    _animateParticles();
  }

  function _animateParticles() {
    if (!particleCtx) return;

    particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let alive = 0;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;

      if (p.y > window.innerHeight + 20) {
        p.opacity -= 0.05;
      }

      if (p.opacity <= 0) continue;
      alive++;

      particleCtx.save();
      particleCtx.globalAlpha = p.opacity;
      particleCtx.fillStyle = p.color;
      // ブロック型のみ（回転なし）
      particleCtx.fillRect(
        p.x - p.size / 2,
        p.y - p.size / 2,
        p.size,
        p.size
      );
      particleCtx.restore();
    }

    if (alive > 0) {
      particleAnimId = requestAnimationFrame(_animateParticles);
    }
  }

  function _stopParticles() {
    if (particleAnimId) {
      cancelAnimationFrame(particleAnimId);
      particleAnimId = null;
    }
    particles = [];
    if (particleCtx) {
      particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  return { init, show, hide, showXP, showCombo, showLevelUp, showBadge };
})();
