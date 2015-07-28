require('../spec_helper');

var sharedBehaviors = require('./shared_behaviors');
var itImplementsContracts = sharedBehaviors.itImplementsContracts;
var itImplementsHelpers = sharedBehaviors.itImplementsHelpers;

describe("mock promises", function() {
  describe("mocking Q", function() {
    var Q;
    var QLibrary = {};
    beforeEach(function() {
      Q = require('q');
      QLibrary.PromiseClass = Q.makePromise;
      QLibrary.PromiseWrapper = Q;
      QLibrary.getDeferred = function() {
        return Q.defer();
      };
      mockPromises.install(QLibrary.PromiseClass);
      mockPromises.reset();
    });

    afterEach(function() {
      mockPromises.uninstall();
    });

    it("does not allow normal promise resolution when mocking", function(done) {
      var promise = QLibrary.PromiseWrapper("foo");
      var promisedValue;
      promise.then(function(value) {
        promisedValue = value;
      });
      promisedValue = "not foo";
      setTimeout(function() {
        expect(promisedValue).toBe("not foo");
        done();
      }, 1);
    });

    it("can be uninstalled", function(done) {
      mockPromises.uninstall();

      var promise = QLibrary.PromiseWrapper("foo");
      var promisedValue;
      promise.then(function(value) {
        promisedValue = value;
      });
      promisedValue = "not foo";
      setTimeout(function() {
        expect(promisedValue).toBe("foo");
        done();
      }, 1);
    });

    itImplementsContracts(QLibrary);
  });

 describe("mocking es6-promises", function() {
    var Promise;
    var es6Library = {};
    beforeEach(function() {
      Promise = require('es6-promise').Promise;
      es6Library.PromiseClass = Promise;
      es6Library.PromiseWrapper = function(value) {return Promise.resolve(value);}
      es6Library.getDeferred = function() {
        var deferred = {};
        var promise = new Promise(function(resolve, reject) {
          deferred.resolve = resolve;
          deferred.reject = reject;
        });
        deferred.promise = promise;
        return deferred;
      };
      es6Library.HelpersContainer = Promise;
      mockPromises.install(Promise);
      mockPromises.reset();
    });

    afterEach(function() {
      mockPromises.uninstall();
    });

    it("does not allow normal promise resolution when mocking", function(done) {
      var promise = es6Library.PromiseWrapper("foo");
      var promisedValue;
      promise.then(function(value) {
        promisedValue = value;
      });
      promisedValue = "not foo";
      setTimeout(function() {
        expect(promisedValue).toBe("not foo");
        done();
      }, 1);
    });

    it("can be uninstalled", function(done) {
      var fakeAll = Promise.all;
      mockPromises.uninstall();
      expect(Promise.all).not.toEqual(fakeAll);

      var promise = es6Library.PromiseWrapper("foo");
      var promisedValue;
      Promise.all([promise]).then(function(values) {
        promisedValue = values[0]
      });
      promisedValue = "not foo";
      setTimeout(function() {
        expect(promisedValue).toBe("foo");
        done();
      }, 1);
    });

    itImplementsContracts(es6Library);

    itImplementsHelpers(es6Library);
  });

  describe("for native promises", function() {
    var promise1, promise2;

    var nativeLibrary = {};
    beforeEach(function() {
      mockPromises.reset();
      var Promise = mockPromises.getMockPromise(global.Promise);
      global.Promise = Promise;
      nativeLibrary.PromiseClass = Promise;
      nativeLibrary.PromiseWrapper = Promise.resolve;
      nativeLibrary.getDeferred = function() {
        var deferred = {};
        var promise = new Promise(function(resolve, reject) {
          deferred.resolve = resolve;
          deferred.reject = reject;
        });
        deferred.promise = promise;
        return deferred;
      };
      nativeLibrary.HelpersContainer = Promise;

      promise1 = nativeLibrary.PromiseWrapper("foo");
      promise2 = nativeLibrary.PromiseWrapper("bar");
    });

    afterEach(function() {
      Promise = mockPromises.getOriginalPromise();
      mockPromises.uninstall();
    });

    itImplementsContracts(nativeLibrary);

    itImplementsHelpers(nativeLibrary);
  });
});
