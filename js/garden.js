/* ============================================
   ガーデン可視化 — 漢字 = 植物プロット
   5段階: 0=土, 1=種, 2=芽, 3=花, 4=木
   ============================================ */

const Garden = (() => {
  const STAGE_COLORS = {
    0: { main: '#C4A882', accent: '#B09070' },  // 土
    1: { main: '#A0845C', accent: '#8B7355' },  // 種
    2: { main: '#7BC67E', accent: '#5A8F6E' },  // 芽
    3: { main: '#F5A0B8', accent: '#E8839E' },  // 花
    4: { main: '#5A8F6E', accent: '#3D6B4E' },  // 木
  };

  function _createPlotSVG(stage, size) {
    size = size || 28;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);

    // Ground
    const ground = _el('ellipse', { cx: 20, cy: 36, rx: 14, ry: 5, fill: '#C4A882' });
    svg.appendChild(ground);

    if (stage === 0) {
      // Empty plot - just dirt mound
      const dirt = _el('ellipse', { cx: 20, cy: 33, rx: 10, ry: 4, fill: '#B09070' });
      svg.appendChild(dirt);
    } else if (stage === 1) {
      // Seed - small dot
      const seed = _el('circle', { cx: 20, cy: 30, r: 3, fill: '#A0845C' });
      svg.appendChild(seed);
      const seedHighlight = _el('circle', { cx: 19, cy: 29, r: 1, fill: '#C4A882' });
      svg.appendChild(seedHighlight);
    } else if (stage === 2) {
      // Sprout - small green stem with two leaves
      const stem = _el('line', { x1: 20, y1: 34, x2: 20, y2: 22, stroke: '#5A8F6E', 'stroke-width': 2, 'stroke-linecap': 'round' });
      svg.appendChild(stem);
      const leafL = _el('path', { d: 'M20 26 Q14 22 17 18', fill: 'none', stroke: '#7BC67E', 'stroke-width': 2, 'stroke-linecap': 'round' });
      svg.appendChild(leafL);
      const leafR = _el('path', { d: 'M20 24 Q26 20 23 16', fill: 'none', stroke: '#7BC67E', 'stroke-width': 2, 'stroke-linecap': 'round' });
      svg.appendChild(leafR);
    } else if (stage === 3) {
      // Bloom - stem with flower
      const stem = _el('line', { x1: 20, y1: 34, x2: 20, y2: 16, stroke: '#5A8F6E', 'stroke-width': 2, 'stroke-linecap': 'round' });
      svg.appendChild(stem);
      const leafL = _el('path', { d: 'M20 28 Q13 24 16 20', fill: 'none', stroke: '#7BC67E', 'stroke-width': 2, 'stroke-linecap': 'round' });
      svg.appendChild(leafL);
      const leafR = _el('path', { d: 'M20 24 Q27 20 24 16', fill: 'none', stroke: '#7BC67E', 'stroke-width': 2, 'stroke-linecap': 'round' });
      svg.appendChild(leafR);
      // Petals
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const px = 20 + Math.cos(angle) * 5;
        const py = 12 + Math.sin(angle) * 5;
        const petal = _el('circle', { cx: px, cy: py, r: 4, fill: '#F5A0B8', opacity: 0.9 });
        svg.appendChild(petal);
      }
      const center = _el('circle', { cx: 20, cy: 12, r: 3, fill: '#F5D060' });
      svg.appendChild(center);
    } else if (stage === 4) {
      // Tree - full grown
      const trunk = _el('rect', { x: 17, y: 22, width: 6, height: 14, rx: 2, fill: '#8B6B4A' });
      svg.appendChild(trunk);
      // Canopy
      const canopy1 = _el('circle', { cx: 20, cy: 16, r: 10, fill: '#5A8F6E' });
      svg.appendChild(canopy1);
      const canopy2 = _el('circle', { cx: 14, cy: 20, r: 7, fill: '#6BA07A' });
      svg.appendChild(canopy2);
      const canopy3 = _el('circle', { cx: 26, cy: 20, r: 7, fill: '#6BA07A' });
      svg.appendChild(canopy3);
      // Small fruits/sparkle
      const fruit1 = _el('circle', { cx: 16, cy: 14, r: 2, fill: '#F2956B' });
      svg.appendChild(fruit1);
      const fruit2 = _el('circle', { cx: 24, cy: 18, r: 2, fill: '#F5D060' });
      svg.appendChild(fruit2);
    }

    return svg;
  }

  /**
   * Render garden preview to container
   * @param {string} containerId
   * @param {number} maxPlots - maximum plots to show
   */
  function renderPreview(containerId, maxPlots) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    maxPlots = maxPlots || 30;
    const plots = GameState.getGardenPlots();
    const entries = Object.entries(plots);

    // Sort: higher stages first, then alphabetically
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    const shown = entries.slice(0, maxPlots);

    if (shown.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'garden-empty-message';
      emptyMsg.textContent = 'れんしゅうするとおにわがそだつよ！';
      container.appendChild(emptyMsg);
      return;
    }

    shown.forEach(([char, stage]) => {
      const plotEl = document.createElement('div');
      plotEl.className = 'garden-plot';
      plotEl.title = char;

      const svgIcon = _createPlotSVG(stage, 28);
      plotEl.appendChild(svgIcon);

      const label = document.createElement('span');
      label.className = 'garden-plot-label';
      label.textContent = char;
      plotEl.appendChild(label);

      container.appendChild(plotEl);
    });

    // Show count if more exist
    if (entries.length > maxPlots) {
      const more = document.createElement('div');
      more.className = 'garden-more';
      more.textContent = '+' + (entries.length - maxPlots);
      container.appendChild(more);
    }
  }

  function _el(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
  }

  return { renderPreview, createPlotSVG: _createPlotSVG };
})();
