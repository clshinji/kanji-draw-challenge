/* ============================================
   フィードバック・ご褒美演出
   常に肯定的、否定なし
   HanziWriter quiz() の結果に連携
   ============================================ */

const Feedback = (() => {
  let particleCanvas, particleCtx;
  let particles = [];
  let particleAnimId = null;

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

    let stars, msg, stampContent;

    if (totalMistakes === 0) {
      stars = 3;
      msg = 'すごい！かんぺき！';
      stampContent = _createHanamaru();
    } else if (totalMistakes <= 3) {
      stars = 2;
      msg = 'じょうずにかけたね！';
      stampContent = _createDoubleCircle();
    } else {
      stars = 1;
      msg = 'がんばったね！';
      stampContent = _createSmiley();
    }

    stamp.innerHTML = '';
    if (stampContent instanceof Element) {
      stamp.appendChild(stampContent);
    }
    message.textContent = msg;

    // SVG星を生成
    starsEl.innerHTML = '';
    for (let i = 0; i < stars; i++) {
      const starSvg = _createStarSVG();
      starsEl.appendChild(starSvg);
    }

    overlay.classList.add('active');

    if (totalMistakes <= 3) {
      _startParticles(stars);
    }

    return stars;
  }

  function hide() {
    const overlay = document.getElementById('feedback-overlay');
    overlay.classList.remove('active');
    _stopParticles();
  }

  /** 星SVGを生成 */
  function _createStarSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '32');
    svg.classList.add('feedback-star-icon');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9');
    polygon.setAttribute('fill', '#E8B931');
    svg.appendChild(polygon);
    return svg;
  }

  /** 二重丸SVGを生成（2星用） */
  function _createDoubleCircle() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '100');

    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outer.setAttribute('cx', '60');
    outer.setAttribute('cy', '60');
    outer.setAttribute('r', '50');
    outer.setAttribute('fill', 'none');
    outer.setAttribute('stroke', '#EE6C4D');
    outer.setAttribute('stroke-width', '5');
    svg.appendChild(outer);

    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('cx', '60');
    inner.setAttribute('cy', '60');
    inner.setAttribute('r', '35');
    inner.setAttribute('fill', 'none');
    inner.setAttribute('stroke', '#EE6C4D');
    inner.setAttribute('stroke-width', '4');
    svg.appendChild(inner);

    return svg;
  }

  /** にっこりマークSVGを生成（1星用） */
  function _createSmiley() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '100');

    // 顔の丸
    const face = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    face.setAttribute('cx', '60');
    face.setAttribute('cy', '60');
    face.setAttribute('r', '50');
    face.setAttribute('fill', '#FFFCF7');
    face.setAttribute('stroke', '#E8B931');
    face.setAttribute('stroke-width', '4');
    svg.appendChild(face);

    // 左目
    const eyeL = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    eyeL.setAttribute('cx', '42');
    eyeL.setAttribute('cy', '48');
    eyeL.setAttribute('r', '5');
    eyeL.setAttribute('fill', '#2D2A26');
    svg.appendChild(eyeL);

    // 右目
    const eyeR = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    eyeR.setAttribute('cx', '78');
    eyeR.setAttribute('cy', '48');
    eyeR.setAttribute('r', '5');
    eyeR.setAttribute('fill', '#2D2A26');
    svg.appendChild(eyeR);

    // 口（笑顔の曲線）
    const mouth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mouth.setAttribute('d', 'M38 68 Q60 90 82 68');
    mouth.setAttribute('fill', 'none');
    mouth.setAttribute('stroke', '#2D2A26');
    mouth.setAttribute('stroke-width', '3.5');
    mouth.setAttribute('stroke-linecap', 'round');
    svg.appendChild(mouth);

    return svg;
  }

  /** 花丸SVGを生成 */
  function _createHanamaru() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('width', '120');
    svg.setAttribute('height', '120');
    svg.classList.add('hanamaru');

    const petalColors = ['#FFB7C5', '#FF9EAF', '#FFC8D5', '#FFD4E0', '#FFAFC2'];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const cx = 60 + Math.cos(angle) * 25;
      const cy = 60 + Math.sin(angle) * 25;
      const petal = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      petal.setAttribute('cx', cx);
      petal.setAttribute('cy', cy);
      petal.setAttribute('rx', '20');
      petal.setAttribute('ry', '26');
      petal.setAttribute('fill', petalColors[i]);
      petal.setAttribute('transform', 'rotate(' + (i * 72) + ', ' + cx + ', ' + cy + ')');
      petal.setAttribute('opacity', '0.85');
      svg.appendChild(petal);
    }

    const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    center.setAttribute('cx', '60');
    center.setAttribute('cy', '60');
    center.setAttribute('r', '18');
    center.setAttribute('fill', '#FFE066');
    svg.appendChild(center);

    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', '60');
    ring.setAttribute('cy', '60');
    ring.setAttribute('r', '38');
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', '#FF6B8A');
    ring.setAttribute('stroke-width', '4');
    svg.appendChild(ring);

    const ring2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring2.setAttribute('cx', '60');
    ring2.setAttribute('cy', '60');
    ring2.setAttribute('r', '45');
    ring2.setAttribute('fill', 'none');
    ring2.setAttribute('stroke', '#FF6B8A');
    ring2.setAttribute('stroke-width', '3');
    ring2.setAttribute('opacity', '0.5');
    svg.appendChild(ring2);

    return svg;
  }

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
    const colors = ['#E8B931', '#EE6C4D', '#3D5A80', '#5B9A6F', '#FFD700', '#FF6B8A'];

    for (let i = 0; i < numParticles; i++) {
      const isStarShape = Math.random() < 0.3;
      particles.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        isStar: isStarShape,
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
      p.rotation += p.rotSpeed;

      if (p.y > window.innerHeight + 20) {
        p.opacity -= 0.05;
      }

      if (p.opacity <= 0) continue;
      alive++;

      particleCtx.save();
      particleCtx.translate(p.x, p.y);
      particleCtx.rotate(p.rotation);
      particleCtx.globalAlpha = p.opacity;

      if (p.isStar) {
        _drawStar(particleCtx, 0, 0, p.size, p.color);
      } else {
        particleCtx.fillStyle = p.color;
        particleCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }

      particleCtx.restore();
    }

    if (alive > 0) {
      particleAnimId = requestAnimationFrame(_animateParticles);
    }
  }

  function _drawStar(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const outerX = x + Math.cos(angle) * size;
      const outerY = y + Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(outerX, outerY);
      else ctx.lineTo(outerX, outerY);

      const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
      const innerX = x + Math.cos(innerAngle) * size * 0.4;
      const innerY = y + Math.sin(innerAngle) * size * 0.4;
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
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

  return { init, show, hide };
})();
