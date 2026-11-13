/* ============================================
   ガーデン可視化 — マイクラ風ブロック表示
   5段階: 0=土, 1=種, 2=苗木, 3=花, 4=桜木
   + 詳細画面 + 装飾配置
   ============================================ */

const Garden = (() => {
  const STAGE_IMAGES = {
    2: 'images/garden-sapling.png',
    3: 'images/garden-flower.png',
    4: 'images/garden-tree.png',
  };

  const STAGE_NAMES = ['つち', 'たね', 'なえ', 'はな', 'き'];

  // 装飾スロット定義 (固定グリッド)
  const DECO_SLOTS = [
    { id: 'slot-1', label: '1' },
    { id: 'slot-2', label: '2' },
    { id: 'slot-3', label: '3' },
    { id: 'slot-4', label: '4' },
    { id: 'slot-5', label: '5' },
    { id: 'slot-6', label: '6' },
  ];

  var editMode = false;
  var selectedItem = null;

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

  function renderDetail(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    var plots = GameState.getGardenPlots();
    var entries = Object.entries(plots);
    entries.sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });

    if (entries.length === 0) {
      var emptyMsg = document.createElement('div');
      emptyMsg.className = 'garden-empty-message';
      emptyMsg.textContent = 'れんしゅうするとおにわがそだつよ！';
      container.appendChild(emptyMsg);
    } else {
      // Group by stage
      var groups = {};
      entries.forEach(function (entry) {
        var stage = entry[1];
        if (!groups[stage]) groups[stage] = [];
        groups[stage].push(entry);
      });

      var stageOrder = [4, 3, 2, 1, 0];
      stageOrder.forEach(function (stage) {
        if (!groups[stage] || groups[stage].length === 0) return;
        var section = document.createElement('div');
        section.className = 'garden-detail-section';

        var header = document.createElement('h3');
        header.className = 'garden-detail-section-title';
        header.textContent = STAGE_NAMES[stage] + ' (' + groups[stage].length + ')';
        section.appendChild(header);

        var grid = document.createElement('div');
        grid.className = 'garden-detail-grid';

        groups[stage].forEach(function (entry) {
          var char = entry[0];
          var plotEl = document.createElement('div');
          plotEl.className = 'garden-detail-plot';

          var block = _createPlotElement(stage, 36);
          plotEl.appendChild(block);

          var label = document.createElement('span');
          label.className = 'garden-detail-plot-label';
          label.textContent = char;
          plotEl.appendChild(label);

          var stars = typeof Progress !== 'undefined' ? Progress.getStars(char) : 0;
          if (stars > 0) {
            var starsEl = document.createElement('span');
            starsEl.className = 'garden-detail-stars';
            for (var i = 0; i < stars; i++) starsEl.textContent += '★';
            plotEl.appendChild(starsEl);
          }

          plotEl.addEventListener('click', function () {
            _showPlotInfo(char, stage, stars);
          });

          grid.appendChild(plotEl);
        });

        section.appendChild(grid);
        container.appendChild(section);
      });
    }

    // Decoration slots
    _renderDecorationSlots(container);
  }

  function _showPlotInfo(char, stage, stars) {
    var count = 0;
    if (typeof Progress !== 'undefined') {
      var all = Progress.getAll();
      if (all[char]) count = all[char].count || 0;
    }
    var msg = char + ' — ' + STAGE_NAMES[stage] +
      '　★' + stars +
      '　れんしゅう ' + count + 'かい';
    var existing = document.querySelector('.garden-plot-info-popup');
    if (existing) existing.remove();
    var popup = document.createElement('div');
    popup.className = 'garden-plot-info-popup';
    popup.textContent = msg;
    var container = document.getElementById('garden-detail-container');
    if (container) container.appendChild(popup);
    setTimeout(function () { popup.remove(); }, 2000);
  }

  function _renderDecorationSlots(container) {
    var decoSection = document.createElement('div');
    decoSection.className = 'garden-deco-section';

    var title = document.createElement('h3');
    title.className = 'garden-detail-section-title';
    title.textContent = 'かざりスロット';
    decoSection.appendChild(title);

    var grid = document.createElement('div');
    grid.className = 'garden-deco-grid';
    grid.id = 'garden-deco-grid';

    var decorations = GameState.getDecorations();

    DECO_SLOTS.forEach(function (slot) {
      var slotEl = document.createElement('div');
      slotEl.className = 'garden-deco-slot';
      slotEl.dataset.slotId = slot.id;

      var itemId = decorations[slot.id];
      if (itemId && typeof Shop !== 'undefined') {
        var item = Shop.getItemById(itemId);
        if (item) {
          var img = document.createElement('img');
          img.src = item.image;
          img.alt = item.name;
          img.width = 36;
          img.height = 36;
          img.style.imageRendering = 'pixelated';
          slotEl.appendChild(img);

          var label = document.createElement('span');
          label.className = 'garden-deco-slot-label';
          label.textContent = item.name;
          slotEl.appendChild(label);
        }
      } else {
        slotEl.innerHTML = '<span class="garden-deco-slot-empty">' + slot.label + '</span>';
      }

      if (editMode) {
        slotEl.classList.add('editable');
        slotEl.addEventListener('click', function () {
          _onSlotClick(slot.id);
        });
      }

      grid.appendChild(slotEl);
    });

    decoSection.appendChild(grid);
    container.appendChild(decoSection);
  }

  function enterEditMode() {
    editMode = true;
    selectedItem = null;
    _renderEditPanel();
    renderDetail('garden-detail-container');
    document.getElementById('btn-garden-edit').textContent = 'かんりょう';
  }

  function exitEditMode() {
    editMode = false;
    selectedItem = null;
    var panel = document.getElementById('garden-edit-panel');
    if (panel) panel.innerHTML = '';
    renderDetail('garden-detail-container');
    document.getElementById('btn-garden-edit').textContent = 'もようがえ';
  }

  function isEditMode() {
    return editMode;
  }

  function _renderEditPanel() {
    var panel = document.getElementById('garden-edit-panel');
    if (!panel) return;
    panel.innerHTML = '';

    var owned = GameState.getOwnedItems();
    if (owned.length === 0) {
      panel.innerHTML = '<div class="garden-edit-empty">ショップでアイテムをかおう！</div>';
      return;
    }

    var title = document.createElement('div');
    title.className = 'garden-edit-title';
    title.textContent = 'おきたいアイテムをえらんでね';
    panel.appendChild(title);

    var grid = document.createElement('div');
    grid.className = 'garden-edit-items';

    owned.forEach(function (itemId) {
      if (typeof Shop === 'undefined') return;
      var item = Shop.getItemById(itemId);
      if (!item) return;

      var el = document.createElement('div');
      el.className = 'garden-edit-item' + (selectedItem === itemId ? ' selected' : '');
      el.innerHTML =
        '<img src="' + item.image + '" alt="" width="36" height="36" style="image-rendering:pixelated">' +
        '<span>' + item.name + '</span>';
      el.addEventListener('click', function () {
        selectedItem = (selectedItem === itemId) ? null : itemId;
        _renderEditPanel();
      });
      grid.appendChild(el);
    });

    panel.appendChild(grid);
  }

  function _onSlotClick(slotId) {
    var decorations = GameState.getDecorations();
    if (decorations[slotId]) {
      // Remove existing decoration
      GameState.removeDecoration(slotId);
      renderDetail('garden-detail-container');
      return;
    }
    if (selectedItem) {
      GameState.placeDecoration(slotId, selectedItem);
      renderDetail('garden-detail-container');
    }
  }

  return {
    renderPreview: renderPreview,
    renderDetail: renderDetail,
    createPlotElement: _createPlotElement,
    enterEditMode: enterEditMode,
    exitEditMode: exitEditMode,
    isEditMode: isEditMode,
  };
})();
