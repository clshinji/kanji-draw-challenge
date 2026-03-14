/* ============================================
   マスコット — PNG画像表示（マイクラ風）
   ============================================ */

const Mascot = (() => {
  const EXPRESSION_IMAGES = {
    happy: 'images/mascot-happy.png',
    excited: 'images/mascot-excited.png',
    encouraging: 'images/mascot-encouraging.png',
    thinking: 'images/mascot-thinking.png',
    celebrating: 'images/mascot-celebrating.png',
  };

  function create(expression, size) {
    size = size || 120;
    const src = EXPRESSION_IMAGES[expression] || EXPRESSION_IMAGES.happy;

    const img = document.createElement('img');
    img.src = src;
    img.alt = 'マスコット';
    img.width = size;
    img.height = size;
    img.style.imageRendering = 'pixelated';
    img.classList.add('mascot-img');

    return img;
  }

  function renderTo(containerId, expression, size) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const img = create(expression || 'happy', size || 120);
    container.appendChild(img);
  }

  return { create, renderTo };
})();
