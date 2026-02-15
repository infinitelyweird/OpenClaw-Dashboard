(function() {
  const MODULE_VERSION = '1.0.0';

  function createCanvas(container, width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width || 400;
    canvas.height = height || 250;
    canvas.style.maxWidth = '100%';
    container.appendChild(canvas);
    return canvas;
  }

  function lineChart(container, options) {
    var w = options.width || 400, h = options.height || 250;
    var canvas = createCanvas(container, w, h);
    var ctx = canvas.getContext('2d');
    var data = options.data || [];
    var labels = options.labels || [];
    var colors = options.colors || ['#4caf50', '#2196f3', '#ff9800', '#f44336'];
    var padding = { top: 20, right: 20, bottom: 40, left: 50 };
    var chartW = w - padding.left - padding.right;
    var chartH = h - padding.top - padding.bottom;

    // Normalize - data can be array of arrays (multi-line) or single array
    var datasets = Array.isArray(data[0]) ? data : [data];
    var allVals = datasets.flat();
    var max = Math.max.apply(null, allVals) * 1.1 || 1;
    var min = Math.min(0, Math.min.apply(null, allVals));

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (var i = 0; i <= 4; i++) {
      var y = padding.top + chartH - (chartH * i / 4);
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
      ctx.fillText(Math.round(min + (max - min) * i / 4), padding.left - 5, y + 4);
    }

    // Labels
    ctx.textAlign = 'center';
    var maxPts = Math.max.apply(null, datasets.map(function(d) { return d.length; }));
    for (var i = 0; i < labels.length; i++) {
      var x = padding.left + (chartW * i / (maxPts - 1 || 1));
      ctx.fillText(labels[i], x, h - 10);
    }

    // Lines
    datasets.forEach(function(ds, di) {
      ctx.strokeStyle = colors[di % colors.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ds.forEach(function(val, i) {
        var x = padding.left + (chartW * i / (ds.length - 1 || 1));
        var y = padding.top + chartH - ((val - min) / (max - min) * chartH);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    return canvas;
  }

  function barChart(container, options) {
    var w = options.width || 400, h = options.height || 250;
    var canvas = createCanvas(container, w, h);
    var ctx = canvas.getContext('2d');
    var data = options.data || [];
    var labels = options.labels || [];
    var colors = options.colors || ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];
    var padding = { top: 20, right: 20, bottom: 40, left: 50 };
    var chartW = w - padding.left - padding.right;
    var chartH = h - padding.top - padding.bottom;
    var max = Math.max.apply(null, data) * 1.1 || 1;
    var barW = chartW / data.length * 0.7;
    var gap = chartW / data.length * 0.3;

    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';

    data.forEach(function(val, i) {
      var x = padding.left + (chartW / data.length) * i + gap / 2;
      var barH = (val / max) * chartH;
      var y = padding.top + chartH - barH;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      if (labels[i]) ctx.fillText(labels[i], x + barW / 2, h - 10);
      ctx.fillText(val, x + barW / 2, y - 5);
    });
    return canvas;
  }

  function donutChart(container, options) {
    var w = options.width || 250, h = options.height || 250;
    var canvas = createCanvas(container, w, h);
    var ctx = canvas.getContext('2d');
    var data = options.data || [];
    var labels = options.labels || [];
    var colors = options.colors || ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];
    var cx = w / 2, cy = h / 2;
    var radius = Math.min(w, h) / 2 - 20;
    var innerRadius = radius * (options.innerRadius || 0.6);
    var total = data.reduce(function(a, b) { return a + b; }, 0) || 1;
    var angle = -Math.PI / 2;

    data.forEach(function(val, i) {
      var sliceAngle = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle, angle + sliceAngle);
      ctx.arc(cx, cy, innerRadius, angle + sliceAngle, angle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      angle += sliceAngle;
    });

    // Center text
    if (options.centerText) {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(options.centerText, cx, cy + 6);
    }
    return canvas;
  }

  if (window.ModuleLoader) {
    ModuleLoader.register('charts', {
      version: MODULE_VERSION,
      init: function() {
        return { line: lineChart, bar: barChart, donut: donutChart };
      },
      destroy: function() {}
    });
  }
})();
