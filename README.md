Expected Usage:

```js
describe("my asynchronous code", function() {
  beforeEach(function() {
    jasmine.Promises.install(Q.makePromise);
    jasmine.Promises.contracts.reset();
  });

  it("resolves promises synchronously", function() {
    var promise = Q("foo");
    var promisedValue;
    promise.then(function(value) {
        promisedValue = value;
    });
    promisedValue = "not foo";
    jasmine.Promises.contracts.executeForPromise(promise);
    expect(promisedValue).toEqual("foo");
  });

  it("can resolve a bunch of promises", function() {
    var promise1 = Q("foo");
    var promise2 = Q("bar");
    var promisedValue1, promisedValue2;

    promise1.then(function(value) {
      promisedValue1 = value;
    });
    promise2.then(function(value) {
      promisedValue2 = value;
    });
    jasmine.Promises.contracts.executeForResolvedPromises();
    expect(promisedValue1).toEqual("foo");
    expect(promisedValue2).toEqual("bar");
  });

  it("looks ok with nested promises", function() {
    var innerPromise = Q("foo");
    var outerPromisedValue = "not resolved";
    var innerPromisedValue = "not resolved";
    var deferred = Q.defer();
    var outerPromise = deferred.promise;
    innerPromise.then(function(value) {
      innerPromisedValue = value;
      deferred.resolve(value + "bar")
    });
    outerPromise.then(function(value) {
      outerPromisedValue = value;
    });

    jasmine.Promises.contracts.executeForPromise(innerPromise);
    expect(innerPromisedValue).toEqual("foo");
    expect(outerPromisedValue).toEqual("not resolved");
    jasmine.Promises.contracts.executeForPromise(outerPromise);
    expect(innerPromisedValue).toEqual("foo");
    expect(outerPromisedValue).toEqual("foobar");
  });
});

```