(function() {
  'use strict';

  const INFINITY_PATH = 'M22,12 C22,6.5 17.5,2 12,2 C6.5,2 2,6.5 2,12 C2,17.5 6.5,22 12,22 C17.5,22 22,17.5 22,12 C22,6.5 26.5,2 32,2 C37.5,2 42,6.5 42,12 C42,17.5 37.5,22 32,22 C26.5,22 22,17.5 22,12';

  let indicator = null;
  let activeCount = 0;

  function ensureIndicator() {
    if (indicator) return indicator;

    indicator = document.createElement('div');
    indicator.className = 'refresh-indicator';
    indicator.innerHTML =
      '<svg viewBox="0 0 44 24" xmlns="http://www.w3.org/2000/svg">' +
        '<path class="infinity-path" d="' + INFINITY_PATH + '" />' +
        '<circle class="spark" r="2.5">' +
          '<animateMotion dur="2s" repeatCount="indefinite" path="' + INFINITY_PATH + '" />' +
        '</circle>' +
      '</svg>';
    document.body.appendChild(indicator);
    return indicator;
  }

  function showRefresh() {
    activeCount++;
    ensureIndicator().classList.add('active');
  }

  function hideRefresh() {
    activeCount = Math.max(0, activeCount - 1);
    if (activeCount === 0 && indicator) {
      indicator.classList.remove('active');
    }
  }

  function setRefreshing(isRefreshing) {
    if (isRefreshing) {
      activeCount = 1;
      ensureIndicator().classList.add('active');
    } else {
      activeCount = 0;
      if (indicator) indicator.classList.remove('active');
    }
  }

  window.RefreshIndicator = { show: showRefresh, hide: hideRefresh, set: setRefreshing };
})();
