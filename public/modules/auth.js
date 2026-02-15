(function() {
  const MODULE_VERSION = '1.0.0';
  const TOKEN_KEY = 'token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function parseJwt(token) {
    try {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch (e) {
      return null;
    }
  }

  function isExpired(token) {
    var payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
  }

  function getUserInfo() {
    var token = getToken();
    if (!token) return null;
    return parseJwt(token);
  }

  function requireAuth(loginUrl) {
    var token = getToken();
    if (!token || isExpired(token)) {
      removeToken();
      window.location.href = loginUrl || '/login.html';
      return false;
    }
    return true;
  }

  function logout(loginUrl) {
    removeToken();
    window.location.href = loginUrl || '/login.html';
  }

  if (window.ModuleLoader) {
    ModuleLoader.register('auth', {
      version: MODULE_VERSION,
      init: function(container, options) {
        if (options.requireAuth !== false) {
          requireAuth(options.loginUrl);
        }
        return { getToken: getToken, setToken: setToken, removeToken: removeToken, getUserInfo: getUserInfo, requireAuth: requireAuth, isExpired: isExpired, logout: logout };
      },
      destroy: function() {}
    });
  }
})();
