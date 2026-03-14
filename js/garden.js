/* ============================================
   ガーデン可視化 — マイクラ風ブロック表示
   5段階: 0=土, 1=種, 2=苗木, 3=花, 4=桜木
   ============================================ */

const Garden = (() => {
  const STAGE_IMAGES = {
    2: 'images/garden-sapling.png',
    3: 'images/garden-flower.png',
    4: 'images/garden-tree.png',
  };

  function _createPlotElement(stage, size) {
    size = size || 28;
    const block = document.createElement('div');
    block.className = 'garden-block garden-stage-' + Math.min(stage, 4);
    block.style.width = size + 'px';
    block.style.height = size + 'px';

    if (stage >= 2 && STAGE_IMAGES[stage]) {
      const img = document.createElement('img');
      img.src = STAGE_IMAGES[stage];
      img.alt = '';
      img.width = size - 4;
      img.height = size - 4;
      block.appendChild(img);
    }

    return block;
  }

  function renderPreview(containerId, maxPlots) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    maxPlots = maxPlots || 30;
    const plots = GameState.getGardenPlots();
    const entries = Object.entries(plots);

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

      const block = _createPlotElement(stage, 28);
      plotEl.appendChild(block);

      const label = document.createElement('span');
      label.className = 'garden-plot-label';
      label.textContent = char;
      plotEl.appendChild(label);

      container.appendChild(plotEl);
    });

    if (entries.length > maxPlots) {
      const more = document.createElement('div');
      more.className = 'garden-more';
      more.textContent = '+' + (entries.length - maxPlots);
      container.appendChild(more);
    }
  }

  return { renderPreview, createPlotElement: _createPlotElement };
})();
