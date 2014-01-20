describe("mock promises", function() {
  var PromiseClass, PromiseWrapper, getDeferred;
  beforeEach(function() {
    PromiseClass = Q.makePromise;
    PromiseWrapper = Q;
    getDeferred = function() {
      return Q.defer();
    };
    jasmine.Promises.install(PromiseClass);
    jasmine.Promises.contracts.reset();
  });


  it("does not allow normal promise resolution when mocking", function(done) {
    var promise = PromiseWrapper("foo");
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
    jasmine.Promises.uninstall();

    var promise = PromiseWrapper("foo");
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

  it("maintains that then is chainable", function() {
    var promise = PromiseWrapper("chainThings");
    var chainedReturn = promise.then(function () { }).then(function () {});
    expect(chainedReturn).toBe(promise);
  });

  describe("contracts", function() {
    var fulfilledHandler1, fulfilledHandler2, errorHandler, progressHandler, promise1, promise2;
    beforeEach(function() {
      fulfilledHandler1 = jasmine.createSpy("fullfilled1");
      fulfilledHandler2 = jasmine.createSpy("fullfilled2");
      errorHandler = jasmine.createSpy("error");
      progressHandler = jasmine.createSpy("progress");
      promise1 = PromiseWrapper("foo");
      promise2 = PromiseWrapper("bar");
      promise1.then(fulfilledHandler1, errorHandler, progressHandler);
      promise2.then(fulfilledHandler2);
    });
    describe("all", function() {
      it("returns a list of promise/handler objects", function() {
        expect(jasmine.Promises.contracts.all()).toEqual([
          jasmine.objectContaining({promise: promise1, fulfilledHandler: fulfilledHandler1, errorHandler: errorHandler, progressHandler: progressHandler}),
          jasmine.objectContaining({promise: promise2, fulfilledHandler: fulfilledHandler2})
        ]);
      });
    });
    describe("forPromise", function() {
      it("returns a list of promise/handler objects only for the requested promise", function() {
        expect(jasmine.Promises.contracts.forPromise(promise1)).toEqual([
          jasmine.objectContaining({promise: promise1, fulfilledHandler: fulfilledHandler1, errorHandler: errorHandler, progressHandler: progressHandler})
        ]);
      });
    });

    it("can be reset", function() {
      expect(jasmine.Promises.contracts.all().length).toBeGreaterThan(0);
      jasmine.Promises.contracts.reset();
      expect(jasmine.Promises.contracts.all().length).toEqual(0);
    });

    describe("executeForPromise", function() {
      it("calls handlers for that promise synchronously", function() {
        var promisedValue;
        promise1.then(function(value) {
          promisedValue = value;
        });
        promise2.then(function() {
          promisedValue = "also not foo";
        });
        promisedValue = "not foo";
        jasmine.Promises.executeForPromise(promise1);
        expect(promisedValue).toEqual("foo");
      });

      it("does not execute handlers more than once", function() {
        var promisedValue = "bar";
        promise1.then(function(value) {
          promisedValue += value;
        });
        jasmine.Promises.executeForPromise(promise1);
        jasmine.Promises.executeForPromise(promise1);
        expect(promisedValue).toEqual("barfoo");
      });

      it("works with nested promises", function() {
        var innerPromise = PromiseWrapper("foo");
        var outerPromisedValue = "not resolved";
        var innerPromisedValue = "not resolved";
        var deferred = getDeferred();
        var outerPromise = deferred.promise;
        innerPromise.then(function(value) {
          innerPromisedValue = value;
          deferred.resolve(value + "bar");
        });
        outerPromise.then(function(value) {
          outerPromisedValue = value;
        });

        jasmine.Promises.executeForPromise(innerPromise);
        expect(innerPromisedValue).toEqual("foo");
        expect(outerPromisedValue).toEqual("not resolved");
        jasmine.Promises.executeForPromise(outerPromise);
        expect(innerPromisedValue).toEqual("foo");
        expect(outerPromisedValue).toEqual("foobar");
      });
    });

    describe("executeForResolvedPromises", function() {
      it("executes handlers for all resolved promises", function() {
        var deferred = getDeferred();
        var unresolvedPromise = deferred.promise;
        var unresolvedSpy = jasmine.createSpy("unresolved");
        unresolvedPromise.then(unresolvedSpy);
        jasmine.Promises.executeForResolvedPromises();
        expect(fulfilledHandler1).toHaveBeenCalled();
        expect(fulfilledHandler2).toHaveBeenCalled();
        expect(unresolvedSpy).not.toHaveBeenCalled();
      });
    });
  });
});
