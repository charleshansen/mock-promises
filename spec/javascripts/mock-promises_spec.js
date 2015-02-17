//Tests require Jasmine 2.0+ due to the 'done' function

function itImplementsContracts(PromiseLibrary) {
  describe("contracts", function() {
    var PromiseClass, PromiseWrapper, getDeferred;
    var fulfilledHandler1, fulfilledHandler2, errorHandler, progressHandler, promise1, promise2;
    beforeEach(function() {
      PromiseClass = PromiseLibrary.PromiseClass;
      PromiseWrapper = PromiseLibrary.PromiseWrapper;
      getDeferred = PromiseLibrary.getDeferred;
      PromiseClass = mockPromises.getMockPromise(PromiseClass);
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
        expect(mockPromises.contracts.all()).toEqual([
          jasmine.objectContaining({promise: promise1, fulfilledHandler: fulfilledHandler1, errorHandler: errorHandler, progressHandler: progressHandler}),
          jasmine.objectContaining({promise: promise2, fulfilledHandler: fulfilledHandler2})
        ]);
      });
    });
    describe("forPromise", function() {
      it("returns a list of promise/handler objects only for the requested promise", function() {
        expect(mockPromises.contracts.forPromise(promise1)).toEqual([
          jasmine.objectContaining({promise: promise1, fulfilledHandler: fulfilledHandler1, errorHandler: errorHandler, progressHandler: progressHandler})
        ]);
      });
    });

    it("can be reset", function() {
      expect(mockPromises.contracts.all().length).toBeGreaterThan(0);
      mockPromises.reset();
      expect(mockPromises.contracts.all().length).toEqual(0);
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
        mockPromises.executeForPromise(promise1);
        expect(promisedValue).toEqual("foo");
      });

      describe("failed promises", function() {
        var deferred, brokenPromise, errorSpy, successSpy;
        beforeEach(function() {
          deferred = getDeferred();
          brokenPromise = deferred.promise;
          successSpy = jasmine.createSpy("success");
          errorSpy = jasmine.createSpy("error");
          deferred.reject("fail");
        });
        it("calls the fail handler if the promise is failed", function() {
          brokenPromise.then(successSpy, errorSpy);
          mockPromises.executeForPromise(brokenPromise);
          expect(successSpy).not.toHaveBeenCalled();
          expect(errorSpy).toHaveBeenCalledWith("fail");
        });
        it("supports 'catch'", function() {
          brokenPromise.catch(errorSpy);
          mockPromises.executeForPromise(brokenPromise);
          expect(errorSpy).toHaveBeenCalledWith("fail");
        });
      });

      it("does not execute handlers more than once", function() {
        var promisedValue = "bar";
        promise1.then(function(value) {
          promisedValue += value;
        });
        mockPromises.executeForPromise(promise1);
        mockPromises.executeForPromise(promise1);
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

        mockPromises.executeForPromise(innerPromise);
        expect(innerPromisedValue).toEqual("foo");
        expect(outerPromisedValue).toEqual("not resolved");
        mockPromises.executeForPromise(outerPromise);
        expect(innerPromisedValue).toEqual("foo");
        expect(outerPromisedValue).toEqual("foobar");
      });
    });

    describe("chained thens", function() {
      it("works when promises resolve smoothly", function() {
        var deferred = getDeferred();
        var promise = deferred.promise;
        var promisedValue = 'not resolved';
        var chainedValue = 'not resolved';
        var chainedPromise = promise.then(function(value) {
          return value + 'bar'
        }).then(function(value) {
            promisedValue = value;
            return value + 'baz'
          });

        chainedPromise.then(function(value) {
          chainedValue = value;
        });

        deferred.resolve('foo');
        mockPromises.executeForPromise(promise);
        mockPromises.executeForResolvedPromises();
        expect(promisedValue).toBe('foobar');
        mockPromises.executeForResolvedPromises();
        expect(chainedValue).toBe('foobarbaz');
      });

      it('handles branching', function() {
        var deferred = getDeferred();
        var promise1 = deferred.promise;
        var promise2Value = 'not resolved';
        var promise3Value = 'not resolved';
        var promise2 = promise1.then(function(value) { return value + 'bar'; });
        var promise3 = promise1.then(function(value) { return value + 'baz'; });

        promise2.then(function(value) { promise2Value = value;});
        promise3.then(function(value) { promise3Value = value;});
        deferred.resolve('foo');
        mockPromises.executeForPromise(promise1);
        mockPromises.executeForResolvedPromises();
        expect(promise2Value).toBe('foobar');
        expect(promise3Value).toBe('foobaz');
      });

      it('continues the chain if the error handler returns a value', function() {
        var deferred = getDeferred();
        var promise = deferred.promise;
        var promisedValue = 'not resolved';
        promise.then(null, function(value) {
          return value + 'bar'
        }).then(function(value) {
            promisedValue = value;
          });

        deferred.reject('foo');
        mockPromises.executeForPromise(promise);
        mockPromises.executeForResolvedPromises();
        expect(promisedValue).toBe('foobar');
      });

      it('rejects the chain when the success handler throws', function() {
        var deferred = getDeferred();
        var promise = deferred.promise;
        var promisedValue = 'not resolved';
        promise.then(function() { throw('bar')
        }).then(null, function(value) {
            promisedValue = value;
          });

        deferred.resolve('foo');
        mockPromises.executeForPromise(promise);
        mockPromises.executeForResolvedPromises();
        expect(promisedValue).toBe('bar');
      });

      it('rejects the chain when the error handler throws', function() {
        var deferred = getDeferred();
        var promise = deferred.promise;
        var promisedValue = 'not resolved';
        promise.then(null, function() { throw('bar')
        }).then(null, function(value) {
            promisedValue = value;
          });

        deferred.reject('foo');
        mockPromises.executeForPromise(promise);
        mockPromises.executeForResolvedPromises();
        expect(promisedValue).toBe('bar');
      });

      it('resolves with the original value if there is no success handler', function() {
        var deferred = getDeferred();
        var promise = deferred.promise;
        var promisedValue = 'not resolved';
        promise.then().then(function(value) {
            promisedValue = value;
          });

        deferred.resolve('foo');
        mockPromises.executeForPromise(promise);
        mockPromises.executeForResolvedPromises();
        expect(promisedValue).toBe('foo');
      });

      it('rejects with the original value if there is no error handler', function() {
        var deferred = getDeferred();
        var promise = deferred.promise;
        var promisedValue = 'not resolved';
        promise.then().then(null, function(value) {
          promisedValue = value;
        });

        deferred.reject('foo');
        mockPromises.executeForPromise(promise);
        mockPromises.executeForResolvedPromises();
        expect(promisedValue).toBe('foo');
      });
    });

    describe("iterateForPromsie", function() {
      it('executes the top-level then if the promise has not been executed', function() {
        var promisedValue;
        promise1 = PromiseWrapper('foo');
        promise1.then(function(value) {
          promisedValue = value;
        });
        promisedValue = "not resolved";
        mockPromises.iterateForPromise(promise1);
        expect(promisedValue).toEqual("foo");
      });

      it('calls the next generation of handlers if the promise has been executed', function() {
        var parentValue = 'not foo';
        promise1 = PromiseWrapper('foo');
        promise2 = promise1.then(function(value) {
          parentValue = value;
          return value + 'bar';
        });
        var childValue1 = 'not foobar';
        var childValue2 = 'not foobar';
        promise2.then(function(value) {
          childValue1 = value;
        });
        promise2.then(function(value) {
          childValue2 = value;
        });
        mockPromises.executeForPromise(promise1);
        expect(parentValue).toEqual("foo");
        expect(childValue1).toEqual("not foobar");
        expect(childValue2).toEqual("not foobar");
        mockPromises.iterateForPromise(promise1);
        expect(parentValue).toEqual("foo");
        expect(childValue1).toEqual("foobar");
        expect(childValue2).toEqual("foobar");
      });

      it('does not throw if the chain is at an end', function() {
        promise1 = PromiseWrapper('foo');
        promise1.then(function(){});
        expect(function() {
          mockPromises.iterateForPromise(promise1);
          mockPromises.iterateForPromise(promise1);
          mockPromises.iterateForPromise(promise1);
        }).not.toThrow();
      });

      it('chains correctly when a promise resolves to another promise', function() {
        promise1 = PromiseWrapper('foo');
        promise2 = PromiseWrapper('bar');
        var promisedValue = 'not resolved';
        var promisedChainedValue = 'not resolved';
        promise1.then(function(value) {
          promisedValue = value;
          return promise2
        }).then(function(value) {
            promisedChainedValue = value;
          });

        mockPromises.executeForPromise(promise1);
        mockPromises.executeForPromise(promise2);
        mockPromises.iterateForPromise(promise1);
        expect(promisedValue).toEqual('foo');
        expect(promisedChainedValue).toEqual('bar');
      });

      it('chains correctly when a thenable returns undefined', function() {
        promise = PromiseWrapper('foo');

        var promisedValue = 'not resolved';
        var promisedChainedValue = 'not resolved';

        promise.then(function() {
          promisedValue = 'foo';
        }).then(function() {
          promisedChainedValue = 'bar';
        });

        mockPromises.executeForPromise(promise);
        mockPromises.iterateForPromise(promise);

        expect(promisedValue).toEqual('foo');
        expect(promisedChainedValue).toEqual('bar');
      });
    });

    describe("executeForResolvedPromises", function() {
      it("executes handlers for all resolved promises", function() {
        var deferred = getDeferred();
        var unresolvedPromise = deferred.promise;
        var unresolvedSpy = jasmine.createSpy("unresolved");
        unresolvedPromise.then(unresolvedSpy);
        mockPromises.executeForResolvedPromises();
        expect(fulfilledHandler1).toHaveBeenCalled();
        expect(fulfilledHandler2).toHaveBeenCalled();
        expect(unresolvedSpy).not.toHaveBeenCalled();
      });
    });

    describe("executeForPromises", function() {
      it("works for executes the given promises", function() {
        promise1.then(fulfilledHandler1);
        promise2.then(fulfilledHandler2);
        mockPromises.executeForPromises([promise1, promise2]);
        expect(fulfilledHandler1).toHaveBeenCalled();
        expect(fulfilledHandler2).toHaveBeenCalled();
      });
    });

    describe("valueForPromise", function() {
      it("returns the value for resolved promises", function() {
        expect(mockPromises.valueForPromise(promise1)).toEqual("foo");
      });
    });
  });
}

describe("mock promises", function() {
  describe("mocking Q", function() {
    var QLibrary = {};
    beforeEach(function() {
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
      Promise = ES6Promise.Promise;
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
      mockPromises.install(es6Library.PromiseClass);
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

   describe("#all", function() {
     var allPromise, deferred1, deferred2, fulfilledSpy, errorSpy;
     beforeEach(function() {
       deferred1 = es6Library.getDeferred();
       deferred2 = es6Library.getDeferred();
       fulfilledSpy = jasmine.createSpy("fulfilled");
       errorSpy = jasmine.createSpy("error");
       allPromise = Promise.all([deferred1.promise, deferred2.promise]);
       allPromise.then(fulfilledSpy, errorSpy);
     });

     it('does not resolve when not all of the promises are resolved', function() {
       deferred1.resolve('foo');
       mockPromises.executeForPromise(deferred1.promise);
       mockPromises.executeForResolvedPromises();
       expect(fulfilledSpy).not.toHaveBeenCalled();
     });

     describe('when the promises are successful', function() {
       beforeEach(function() {
         deferred1.resolve('foo');
         deferred2.resolve('bar');
       });

       it('resolves with an array of values from the original promises', function() {
         mockPromises.executeForPromise(deferred1.promise);
         mockPromises.executeForPromise(deferred2.promise);
         mockPromises.executeForPromise(allPromise);
         expect(fulfilledSpy).toHaveBeenCalledWith(["foo", "bar"]);
       });
     });

     describe('when a promise fails', function() {
       beforeEach(function() {
         deferred1.resolve('foo');
         deferred2.reject('bar');
       });

       it('rejects with the value of the first rejected promise', function() {
         mockPromises.executeForPromise(deferred1.promise);
         mockPromises.executeForPromise(deferred2.promise);
         mockPromises.executeForPromise(allPromise);
         expect(errorSpy).toHaveBeenCalledWith('bar');
       });
     });
   });

    itImplementsContracts(es6Library);
  });

  describe("for native promises", function() {
    var promise1, promise2;

    var nativeLibrary = {};
    beforeEach(function() {
      mockPromises.reset();
      Promise = mockPromises.getMockPromise(Promise);
      nativeLibrary.PromiseClass = Promise;
      nativeLibrary.PromiseWrapper = Promise.resolve
      nativeLibrary.getDeferred = function() {
        var deferred = {};
        var promise = new Promise(function(resolve, reject) {
          deferred.resolve = resolve;
          deferred.reject = reject;
        });
        deferred.promise = promise;
        return deferred;
      };

      promise1 = nativeLibrary.PromiseWrapper("foo");
      promise2 = nativeLibrary.PromiseWrapper("bar");
    });

    afterEach(function() {
      Promise = mockPromises.getOriginalPromise();
      mockPromises.uninstall();
    });

    itImplementsContracts(nativeLibrary);

    describe("Promises.all", function() {
      it("resolves when all of the promises resolve", function() {
        var allPromise = Promise.all([promise1, promise2]);
        var thenSpy = jasmine.createSpy("then");
        allPromise.then(thenSpy);
        mockPromises.executeForPromise(promise1);
        mockPromises.executeForPromise(promise2);
        mockPromises.executeForPromise(allPromise);
        expect(thenSpy).toHaveBeenCalledWith(["foo", "bar"]);
      });
    });

    describe("Promise.reject", function() {
      it("creates a rejected promise", function() {
        var rejectedPromise = Promise.reject("wrong");
        var failSpy = jasmine.createSpy("fail");
        rejectedPromise.catch(failSpy);
        mockPromises.executeForPromise(rejectedPromise);
        expect(failSpy).toHaveBeenCalledWith("wrong");
      });
    });
  });
});
