(function() {
  'use strict';
  
  let activeTooltip = null;
  let hoverTimeout = null;
  let isPinned = false;
  
  function createTooltip() {
    const el = document.createElement('div');
    el.className = 'iw-tooltip';
    el.innerHTML = `
      <div class="iw-tooltip-title">
        <span class="iw-tooltip-title-text"></span>
        <button class="iw-tooltip-close" title="Close">✕</button>
      </div>
      <div class="iw-tooltip-body"></div>
    `;
    el.querySelector('.iw-tooltip-close').addEventListener('click', (e) => {
      e.stopPropagation();
      hideTooltip();
    });
    document.body.appendChild(el);
    return el;
  }
  
  function getTooltipEl() {
    if (!activeTooltip) activeTooltip = createTooltip();
    return activeTooltip;
  }
  
  function positionTooltip(tooltip, anchor) {
    const rect = anchor.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    
    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
    
    // Keep within viewport
    if (left < 8) left = 8;
    if (left + tipRect.width > window.innerWidth - 8) left = window.innerWidth - tipRect.width - 8;
    if (top + tipRect.height > window.innerHeight - 8) {
      top = rect.top - tipRect.height - 8; // flip above
    }
    
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
  }
  
  function showTooltip(anchor) {
    const title = anchor.getAttribute('data-tooltip-title') || anchor.textContent.trim();
    const body = anchor.getAttribute('data-tooltip');
    if (!body) return;
    
    const tip = getTooltipEl();
    tip.querySelector('.iw-tooltip-title-text').textContent = title;
    tip.querySelector('.iw-tooltip-body').textContent = body;
    tip.classList.remove('fading', 'pinned');
    isPinned = false;
    
    // Position needs to happen after content is set
    tip.style.display = 'block';
    requestAnimationFrame(() => {
      positionTooltip(tip, anchor);
      requestAnimationFrame(() => tip.classList.add('visible'));
    });
  }
  
  function hideTooltip() {
    if (!activeTooltip) return;
    isPinned = false;
    activeTooltip.classList.remove('visible', 'pinned');
    activeTooltip.classList.add('fading');
    setTimeout(() => {
      if (activeTooltip) {
        activeTooltip.classList.remove('fading');
        activeTooltip.style.display = 'none';
      }
    }, 100); // fast fade out
  }
  
  function pinTooltip() {
    if (!activeTooltip) return;
    isPinned = true;
    activeTooltip.classList.add('pinned');
  }
  
  // Event delegation — works on any [data-tooltip] element, even dynamically added
  document.addEventListener('mouseenter', function(e) {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    if (isPinned) return; // don't interrupt a pinned tooltip
    
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => showTooltip(target), 300); // slight delay
  }, true);
  
  document.addEventListener('mouseleave', function(e) {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    clearTimeout(hoverTimeout);
    if (!isPinned) {
      hideTooltip();
    }
  }, true);
  
  // Click to pin
  document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-tooltip]');
    if (target) {
      e.preventDefault();
      if (isPinned) {
        hideTooltip();
      } else {
        showTooltip(target);
        // Small delay before pinning so the show animation plays
        setTimeout(() => pinTooltip(), 50);
      }
      return;
    }
    // Click outside pinned tooltip — dismiss
    if (isPinned && activeTooltip && !activeTooltip.contains(e.target)) {
      hideTooltip();
    }
  });
  
  // Expose for programmatic use
  window.IWTooltip = { show: showTooltip, hide: hideTooltip, pin: pinTooltip };
})();
