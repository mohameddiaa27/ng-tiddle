(function() {
  var NgTiddleApp, NgTiddleAuth, NgTiddleInterceptor, NgTiddleSession, NgTiddleStorage, PushInterceptors;

  NgTiddleApp = (function() {
    function NgTiddleApp() {
      return ['ngCookies'];
    }

    return NgTiddleApp;

  })();

  angular.module('ng-tiddle', new NgTiddleApp());

  PushInterceptors = (function() {
    function PushInterceptors($httpProvider) {
      $httpProvider.interceptors.push('NgTiddleInterceptor');
    }

    return PushInterceptors;

  })();

  angular.module('ng-tiddle').config(['$httpProvider', PushInterceptors]);

  NgTiddleAuth = (function() {
    function NgTiddleAuth() {
      this.properties = {
        api_root: 'http://localhost:3000/',
        model_name: 'user',
        sign_in_strategy: 'email',
        api_resource_path: 'users',
        keep_logged_in: false
      };
      this.$get = function() {
        var properties;
        properties = this.properties;
        return {
          getApiRoot: function() {
            return properties.api_root;
          },
          setApiRoot: function(api_root) {
            return properties.api_root = api_root;
          },
          getModelName: function() {
            return properties.model_name;
          },
          setModelName: function(model_name) {
            return properties.model_name = model_name;
          },
          getSignInStrategy: function() {
            return properties.sign_in_strategy;
          },
          setSignInStrategy: function(sign_in_strategy) {
            return properties.sign_in_strategy = sign_in_strategy;
          },
          getApiResourcePath: function() {
            return properties.api_resource_path;
          },
          setApiResourcePath: function(api_resource_path) {
            return properties.api_resource_path = api_resource_path;
          },
          getKeepLoggedIn: function() {
            return properties.keep_logged_in;
          },
          setKeepLoggedIn: function(keep_logged_in) {
            return properties.keep_logged_in = keep_logged_in;
          },
          onUnauthorized: function() {
            return console.warn('No unauthorized callback was defined');
          },
          onAuthorize: function(auth_data) {
            return console.info('No authorize callback was defined', auth_data);
          }
        };
      };
    }

    return NgTiddleAuth;

  })();

  angular.module('ng-tiddle').provider('ngTiddleAuthProvider', [NgTiddleAuth]);

  NgTiddleAuth = (function() {
    function NgTiddleAuth($http, $timeout1, ngTiddleSessionService1, ngTiddleAuthProvider) {
      this.$http = $http;
      this.$timeout = $timeout1;
      this.ngTiddleSessionService = ngTiddleSessionService1;
      this.tap = ngTiddleAuthProvider;
      this.sign_in_params = {};
    }

    NgTiddleAuth.prototype.signIn = function(resource) {
      var path, ret;
      path = (this.tap.getApiRoot()) + "/" + (this.tap.getApiResourcePath()) + "/sign_in";
      this.sign_in_params[this.tap.getModelName()] = resource;
      ret = this.$http.post(path, this.sign_in_params);
      ret.then((function(_this) {
        return function(response) {
          _this.ngTiddleSessionService.setResource(response.data[_this.tap.getModelName()], response.data.authentication_token);
          return _this.$timeout((function() {
            return _this.tap.onAuthorize(response.data);
          }), 0);
        };
      })(this));
      return ret;
    };

    NgTiddleAuth.prototype.signOut = function() {
      return this.$http["delete"]((this.tap.getApiRoot()) + "/" + (this.tap.getApiResourcePath()) + "/sign_out").then((function(_this) {
        return function() {
          _this.ngTiddleSessionService.clear();
          return _this.$timeout((function() {
            return _this.tap.onUnauthorized();
          }), 0);
        };
      })(this));
    };

    NgTiddleAuth.prototype.getResource = function() {
      return this.ngTiddleSessionService.getResource();
    };

    return NgTiddleAuth;

  })();

  angular.module('ng-tiddle').service('ngTiddleAuthService', ['$http', '$timeout', 'ngTiddleSessionService', 'ngTiddleAuthProvider', NgTiddleAuth]);

  NgTiddleSession = (function() {
    NgTiddleSession.prototype.token_prefix = 'tiddle_token';

    NgTiddleSession.prototype.resource_prefix = 'tiddle_resource';

    function NgTiddleSession($timeout1, ngTiddleStorageService1, ngTiddleAuthProvider1) {
      this.$timeout = $timeout1;
      this.ngTiddleStorageService = ngTiddleStorageService1;
      this.ngTiddleAuthProvider = ngTiddleAuthProvider1;
    }

    NgTiddleSession.prototype.setResource = function(resource, token) {
      if (!resource) {
        this.clear();
        return;
      }
      this.ngTiddleStorageService.put(this.token_prefix, token);
      this.ngTiddleStorageService.put(this.resource_prefix, resource);
      return this.resource = resource;
    };

    NgTiddleSession.prototype.getResource = function() {
      this.resource = this.ngTiddleStorageService.get(this.resource_prefix);
      if (!this.resource) {
        this.$timeout(((function(_this) {
          return function() {
            return _this.ngTiddleAuthProvider.onUnauthorized();
          };
        })(this)), 0);
      }
      return this.resource;
    };

    NgTiddleSession.prototype.getToken = function() {
      return this.ngTiddleStorageService.get(this.token_prefix);
    };

    NgTiddleSession.prototype.clear = function() {
      this.ngTiddleStorageService.remove(this.resource_prefix);
      this.ngTiddleStorageService.remove(this.token_prefix);
      return this.resource = null;
    };

    return NgTiddleSession;

  })();

  angular.module('ng-tiddle').service('ngTiddleSessionService', ['$timeout', 'ngTiddleStorageService', 'ngTiddleAuthProvider', NgTiddleSession]);

  NgTiddleInterceptor = (function() {
    function NgTiddleInterceptor($q, $timeout, ngTiddleSessionService, ngTiddleAuthProvider, ngTiddleStorageService) {
      return {
        request: function(config) {
          var _api_regexp, _resource, model_name, strategy;
          _api_regexp = new RegExp(ngTiddleAuthProvider.getApiRoot().match('^(?:https?:)?(?:\/\/)?([^\/\?]+)')[1]);
          _resource = ngTiddleStorageService.get('tiddle_resource');
          if (_api_regexp.test(config.url) && _resource) {
            strategy = ngTiddleAuthProvider.getSignInStrategy();
            model_name = ngTiddleAuthProvider.getModelName();
            config.headers[("X-" + model_name + "-" + strategy).toUpperCase()] = _resource[strategy];
            config.headers[("X-" + model_name + "-TOKEN").toUpperCase()] = ngTiddleSessionService.getToken();
          }
          return config;
        },
        responseError: function(e) {
          if (e.status === 401) {
            ngTiddleSessionService.clear();
            $timeout(((function(_this) {
              return function() {
                return ngTiddleAuthProvider.onUnauthorized();
              };
            })(this)), 0);
          }
          return $q.reject(e);
        }
      };
    }

    return NgTiddleInterceptor;

  })();

  angular.module('ng-tiddle').factory('NgTiddleInterceptor', ['$q', '$timeout', 'ngTiddleSessionService', 'ngTiddleAuthProvider', 'ngTiddleStorageService', NgTiddleInterceptor]);

  NgTiddleStorage = (function() {
    function NgTiddleStorage(ngTiddleAuthProvider1, $cookies) {
      this.ngTiddleAuthProvider = ngTiddleAuthProvider1;
      this.$cookies = $cookies;
    }

    NgTiddleStorage.prototype.isLocalStorage = function() {
      return window.localStorage && this.ngTiddleAuthProvider.getKeepLoggedIn();
    };

    NgTiddleStorage.prototype.put = function(key, value) {
      if (this.isLocalStorage()) {
        window.localStorage[key] = JSON.stringify(value);
        return;
      }
      return this.$cookies.putObject(key, value);
    };

    NgTiddleStorage.prototype.get = function(key) {
      var p;
      if (this.isLocalStorage()) {
        if (p = window.localStorage[key]) {
          return JSON.parse(p);
        } else {
          return void 0;
        }
      }
      return this.$cookies.getObject(key);
    };

    NgTiddleStorage.prototype.remove = function(key) {
      if (this.isLocalStorage()) {
        delete window.localStorage[key];
        return;
      }
      return this.$cookies.remove(key);
    };

    return NgTiddleStorage;

  })();

  angular.module('ng-tiddle').service('ngTiddleStorageService', ['ngTiddleAuthProvider', '$cookies', NgTiddleStorage]);

}).call(this);
