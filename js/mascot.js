/* ============================================
   マスコットたぬき — SVG動的生成
   ============================================ */

const Mascot = (() => {
  const EXPRESSIONS = {
    happy: { eyes: 'normal', mouth: 'smile', blush: true },
    excited: { eyes: 'sparkle', mouth: 'open', blush: true },
    encouraging: { eyes: 'normal', mouth: 'cheer', blush: true },
    thinking: { eyes: 'look_up', mouth: 'small', blush: false },
    celebrating: { eyes: 'closed_happy', mouth: 'big_smile', blush: true },
  };

  function create(expression, size) {
    size = size || 120;
    const expr = EXPRESSIONS[expression] || EXPRESSIONS.happy;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.classList.add('mascot-svg');

    // Body
    const body = _el('ellipse', { cx: 100, cy: 140, rx: 55, ry: 45, fill: '#D4A574' });
    svg.appendChild(body);

    // Head
    const head = _el('circle', { cx: 100, cy: 85, r: 50, fill: '#D4A574' });
    svg.appendChild(head);

    // Ears
    const earL = _el('ellipse', { cx: 68, cy: 45, rx: 16, ry: 20, fill: '#D4A574', transform: 'rotate(-15 68 45)' });
    svg.appendChild(earL);
    const earLInner = _el('ellipse', { cx: 68, cy: 45, rx: 10, ry: 14, fill: '#C4916A', transform: 'rotate(-15 68 45)' });
    svg.appendChild(earLInner);
    const earR = _el('ellipse', { cx: 132, cy: 45, rx: 16, ry: 20, fill: '#D4A574', transform: 'rotate(15 132 45)' });
    svg.appendChild(earR);
    const earRInner = _el('ellipse', { cx: 132, cy: 45, rx: 10, ry: 14, fill: '#C4916A', transform: 'rotate(15 132 45)' });
    svg.appendChild(earRInner);

    // Face mask (lighter area)
    const faceMask = _el('ellipse', { cx: 100, cy: 95, rx: 35, ry: 30, fill: '#F0DCC0' });
    svg.appendChild(faceMask);

    // Belly
    const belly = _el('ellipse', { cx: 100, cy: 145, rx: 35, ry: 28, fill: '#F0DCC0' });
    svg.appendChild(belly);

    // Nose
    const nose = _el('ellipse', { cx: 100, cy: 82, rx: 7, ry: 5, fill: '#3D2B1F' });
    svg.appendChild(nose);

    // Eyes
    _drawEyes(svg, expr.eyes);

    // Mouth
    _drawMouth(svg, expr.mouth);

    // Blush
    if (expr.blush) {
      const blushL = _el('ellipse', { cx: 72, cy: 95, rx: 10, ry: 6, fill: '#F5A0B8', opacity: 0.5 });
      svg.appendChild(blushL);
      const blushR = _el('ellipse', { cx: 128, cy: 95, rx: 10, ry: 6, fill: '#F5A0B8', opacity: 0.5 });
      svg.appendChild(blushR);
    }

    // Leaf on head (signature accessory)
    const leaf = _el('path', {
      d: 'M98 38 Q105 20 115 32 Q108 38 98 38Z',
      fill: '#5A8F6E',
    });
    svg.appendChild(leaf);
    const leafStem = _el('line', {
      x1: 105, y1: 35, x2: 102, y2: 42,
      stroke: '#5A8F6E', 'stroke-width': 1.5, 'stroke-linecap': 'round',
    });
    svg.appendChild(leafStem);

    return svg;
  }

  function _drawEyes(svg, type) {
    if (type === 'sparkle') {
      // Star-shaped sparkle eyes
      const starPoints = '0,-6 1.5,-2 6,-2 2.5,1 4,5 0,3 -4,5 -2.5,1 -6,-2 -1.5,-2';
      const eyeL = _el('polygon', { points: starPoints, fill: '#3D2B1F', transform: 'translate(85, 78)' });
      svg.appendChild(eyeL);
      const eyeR = _el('polygon', { points: starPoints, fill: '#3D2B1F', transform: 'translate(115, 78)' });
      svg.appendChild(eyeR);
    } else if (type === 'closed_happy') {
      // Happy closed eyes (arcs)
      const eyeL = _el('path', {
        d: 'M79 78 Q85 72 91 78', fill: 'none', stroke: '#3D2B1F',
        'stroke-width': 2.5, 'stroke-linecap': 'round',
      });
      svg.appendChild(eyeL);
      const eyeR = _el('path', {
        d: 'M109 78 Q115 72 121 78', fill: 'none', stroke: '#3D2B1F',
        'stroke-width': 2.5, 'stroke-linecap': 'round',
      });
      svg.appendChild(eyeR);
    } else if (type === 'look_up') {
      // Looking up eyes
      const eyeL = _el('circle', { cx: 86, cy: 75, r: 5, fill: '#3D2B1F' });
      svg.appendChild(eyeL);
      const eyeR = _el('circle', { cx: 114, cy: 75, r: 5, fill: '#3D2B1F' });
      svg.appendChild(eyeR);
      const pupilL = _el('circle', { cx: 87, cy: 73, r: 2, fill: '#fff' });
      svg.appendChild(pupilL);
      const pupilR = _el('circle', { cx: 115, cy: 73, r: 2, fill: '#fff' });
      svg.appendChild(pupilR);
    } else {
      // Normal round eyes
      const eyeL = _el('circle', { cx: 85, cy: 78, r: 5, fill: '#3D2B1F' });
      svg.appendChild(eyeL);
      const eyeR = _el('circle', { cx: 115, cy: 78, r: 5, fill: '#3D2B1F' });
      svg.appendChild(eyeR);
      const glintL = _el('circle', { cx: 87, cy: 76, r: 1.5, fill: '#fff' });
      svg.appendChild(glintL);
      const glintR = _el('circle', { cx: 117, cy: 76, r: 1.5, fill: '#fff' });
      svg.appendChild(glintR);
    }
  }

  function _drawMouth(svg, type) {
    if (type === 'open') {
      const mouth = _el('ellipse', { cx: 100, cy: 96, rx: 8, ry: 6, fill: '#C0453A' });
      svg.appendChild(mouth);
      const tongue = _el('ellipse', { cx: 100, cy: 99, rx: 5, ry: 3, fill: '#E07060' });
      svg.appendChild(tongue);
    } else if (type === 'big_smile') {
      const mouth = _el('path', {
        d: 'M86 92 Q100 110 114 92', fill: '#C0453A', stroke: 'none',
      });
      svg.appendChild(mouth);
      const tongue = _el('ellipse', { cx: 100, cy: 100, rx: 6, ry: 4, fill: '#E07060' });
      svg.appendChild(tongue);
    } else if (type === 'cheer') {
      const mouth = _el('path', {
        d: 'M88 91 Q100 104 112 91', fill: 'none', stroke: '#3D2B1F',
        'stroke-width': 2, 'stroke-linecap': 'round',
      });
      svg.appendChild(mouth);
    } else if (type === 'small') {
      const mouth = _el('circle', { cx: 100, cy: 95, r: 3, fill: '#C0453A' });
      svg.appendChild(mouth);
    } else {
      // Default smile
      const mouth = _el('path', {
        d: 'M90 92 Q100 102 110 92', fill: 'none', stroke: '#3D2B1F',
        'stroke-width': 2, 'stroke-linecap': 'round',
      });
      svg.appendChild(mouth);
    }
  }

  function _el(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
  }

  /**
   * Render mascot into a container element
   */
  function renderTo(containerId, expression, size) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const svg = create(expression || 'happy', size || 120);
    container.appendChild(svg);
  }

  return { create, renderTo };
})();
