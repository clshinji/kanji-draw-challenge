/* ============================================
   ショップ — アイテム購入・素材換金
   ============================================ */

const Shop = (() => {
  const ITEMS = [
    { id: 'fence', name: 'さく', price: 10, desc: 'おにわのさく', image: 'images/deco-fence.svg' },
    { id: 'flowerbed', name: 'かだん', price: 20, desc: 'きれいなかだん', image: 'images/deco-flowerbed.svg' },
    { id: 'torch', name: 'たいまつ', price: 30, desc: 'あかるいたいまつ', image: 'images/deco-torch.svg' },
    { id: 'sign', name: 'かんばん', price: 15, desc: 'もじがかけるかんばん', image: 'images/deco-sign.svg' },
    { id: 'pond', name: 'いけ', price: 50, desc: 'ちいさないけ', image: 'images/deco-pond.svg' },
  ];

  var MATERIAL_NAMES = { stone: 'いし', iron: 'てつ', gold: 'きん', diamond: 'ダイヤ' };
  var MATERIAL_COLORS = { stone: '#A0A0A0', iron: '#D4842A', gold: '#FFD700', diamond: '#5FE3E3' };
  var MATERIAL_IMAGES = {
    stone: 'images/ore-stone.svg',
    iron: 'images/ore-iron.svg',
    gold: 'images/ore-gold.svg',
    diamond: 'images/ore-diamond.svg',
  };

  var currentTab = 'items';
  var mascotMessageTimer = null;

  function isUnlocked() {
    return GameState.getTotalXP() >= 130; // Level 3
  }

  function getUnlockXP() {
    return 130;
  }

  function renderItems(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    var owned = GameState.getOwnedItems();

    ITEMS.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'shop-item-card';

      var isOwned = owned.indexOf(item.id) !== -1;

      card.innerHTML =
        '<img class="shop-item-image" src="' + item.image + '" alt="" width="48" height="48">' +
        '<div class="shop-item-info">' +
          '<div class="shop-item-name">' + item.name + '</div>' +
          '<div class="shop-item-desc">' + item.desc + '</div>' +
        '</div>' +
        '<div class="shop-item-action">' +
          (isOwned
            ? '<span class="shop-item-owned">もってる</span>'
            : '<button class="btn btn-control shop-buy-btn" data-item="' + item.id + '">' +
              '<img src="images/coin.svg" alt="" width="16" height="16" style="image-rendering:pixelated"> ' +
              item.price + '</button>'
          ) +
        '</div>';

      if (!isOwned) {
        var btn = card.querySelector('.shop-buy-btn');
        btn.addEventListener('click', function () {
          _handleBuy(item, containerId);
        });
      }

      container.appendChild(card);
    });
  }

  function _handleBuy(item, containerId) {
    var coins = GameState.getCoins();
    if (coins < item.price) {
      _showMascotMessage('コインがたりないよ〜');
      return;
    }
    var result = GameState.buyItem(item.id, item.price);
    if (result) {
      _showMascotMessage(item.name + 'をかったよ！');
      _updateShopCoins();
      renderItems(containerId);
    }
  }

  function _showMascotMessage(text) {
    var container = document.getElementById('shop-container');
    if (!container) return;

    var existing = container.querySelector('.shop-mascot-message');
    if (existing) existing.remove();

    var msg = document.createElement('div');
    msg.className = 'shop-mascot-message';
    msg.textContent = text;
    container.insertBefore(msg, container.firstChild);

    if (mascotMessageTimer) clearTimeout(mascotMessageTimer);
    mascotMessageTimer = setTimeout(function () {
      msg.remove();
    }, 2000);
  }

  function renderInventory(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    var materials = GameState.getMaterials();
    var types = ['stone', 'iron', 'gold', 'diamond'];

    var section = document.createElement('div');
    section.className = 'shop-inventory-section';

    var title = document.createElement('h3');
    title.className = 'shop-section-title';
    title.textContent = 'そざい';
    section.appendChild(title);

    types.forEach(function (type) {
      var count = materials[type] || 0;
      var rate = GameState.SELL_RATES[type];

      var row = document.createElement('div');
      row.className = 'shop-material-row';
      row.innerHTML =
        '<div class="shop-material-info">' +
          '<img src="' + MATERIAL_IMAGES[type] + '" alt="" width="28" height="28" style="image-rendering:pixelated">' +
          '<span class="shop-material-name" style="color:' + MATERIAL_COLORS[type] + '">' + MATERIAL_NAMES[type] + '</span>' +
          '<span class="shop-material-count">x' + count + '</span>' +
        '</div>' +
        '<div class="shop-material-action">' +
          (count > 0
            ? '<button class="btn btn-control shop-sell-btn" data-type="' + type + '">' +
              'うる <img src="images/coin.svg" alt="" width="14" height="14" style="image-rendering:pixelated"> ' + rate +
              '</button>'
            : '<span class="shop-material-empty">なし</span>'
          ) +
        '</div>';

      if (count > 0) {
        var btn = row.querySelector('.shop-sell-btn');
        btn.addEventListener('click', function () {
          GameState.sellMaterial(type);
          _updateShopCoins();
          renderInventory(containerId);
        });
      }

      section.appendChild(row);
    });

    container.appendChild(section);
  }

  function _updateShopCoins() {
    var el = document.getElementById('shop-header-coins');
    if (el) {
      el.innerHTML =
        '<img src="images/coin.svg" alt="" width="20" height="20" style="image-rendering:pixelated"> ' +
        GameState.getCoins();
    }
  }

  function showTab(tab, containerId) {
    currentTab = tab;
    if (tab === 'items') {
      renderItems(containerId);
    } else {
      renderInventory(containerId);
    }
    _updateShopCoins();
  }

  function getItems() {
    return ITEMS;
  }

  function getItemById(id) {
    return ITEMS.find(function (item) { return item.id === id; });
  }

  return {
    isUnlocked: isUnlocked,
    getUnlockXP: getUnlockXP,
    renderItems: renderItems,
    renderInventory: renderInventory,
    showTab: showTab,
    getItems: getItems,
    getItemById: getItemById,
    ITEMS: ITEMS,
  };
})();
