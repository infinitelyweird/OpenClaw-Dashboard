(function() {
  const MODULE_VERSION = '1.0.0';
  let baseURL = '';
  let maxRetries = 2;

  function getAuthHeaders() {
    var token = localStorage.getItem('token');
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  async function request(method, url, body, retries) {
    if (retries === undefined) retries = maxRetries;
    var opts = { method: method, headers: getAuthHeaders() };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    for (var attempt = 0; attempt <= retries; attempt++) {
      try {
        var res = await fetch(baseURL + url, opts);
        if (res.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login.html';
          throw new Error('Unauthorized');
        }
        if (!res.ok) {
          var errBody = null;
          try { errBody = await res.json(); } catch(e) {}
          var err = new Error((errBody && errBody.message) || 'Request failed: ' + res.status);
          err.status = res.status;
          err.body = errBody;
          throw err;
        }
        var contentType = res.headers.get('content-type') || '';
        return contentType.includes('application/json') ? await res.json() : await res.text();
      } catch (e) {
        if (attempt < retries && (!e.status || e.status >= 500)) {
          await delay(Math.pow(2, attempt) * 500);
          continue;
        }
        throw e;
      }
    }
  }

  if (window.ModuleLoader) {
    ModuleLoader.register('api', {
      version: MODULE_VERSION,
      init: function(container, options) {
        if (options.baseURL) baseURL = options.baseURL;
        if (options.maxRetries !== undefined) maxRetries = options.maxRetries;
        return {
          get: function(url) { return request('GET', url); },
          post: function(url, body) { return request('POST', url, body); },
          put: function(url, body) { return request('PUT', url, body); },
          patch: function(url, body) { return request('PATCH', url, body); },
          delete: function(url) { return request('DELETE', url); },
          request: request
        };
      },
      destroy: function() {}
    });
  }
})();
