(function() {
  'use strict';

  const modules = {};
  const initialized = {};

  window.ModuleLoader = {
    register: function(name, module) {
      if (!module.version || !module.init) {
        console.warn('[ModuleLoader] Module "' + name + '" missing required properties (version, init)');
        return;
      }
      modules[name] = module;
      console.log('[ModuleLoader] Registered: ' + name + ' v' + module.version);
    },

    init: function(name, container, options) {
      try {
        if (!modules[name]) {
          console.warn('[ModuleLoader] Module "' + name + '" not found');
          return null;
        }
        var result = modules[name].init(container, options || {});
        initialized[name] = true;
        return result;
      } catch (e) {
        console.error('[ModuleLoader] Failed to init "' + name + '":', e);
        return null;
      }
    },

    destroy: function(name) {
      try {
        if (modules[name] && modules[name].destroy && initialized[name]) {
          modules[name].destroy();
          delete initialized[name];
        }
      } catch (e) {
        console.error('[ModuleLoader] Failed to destroy "' + name + '":', e);
      }
    },

    get: function(name) {
      return modules[name] || null;
    },

    list: function() {
      var result = {};
      for (var name in modules) {
        result[name] = modules[name].version;
      }
      return result;
    },

    logVersions: function() {
      console.log('[ModuleLoader] Loaded modules:');
      for (var name in modules) {
        console.log('  ' + name + ': v' + modules[name].version);
      }
    }
  };
})();
