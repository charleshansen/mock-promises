(function() {
  var extend = function(destination, source) {
    for(var property in source) {
      destination[property] = source[property];
    }
    return destination;
  };

  var each = function(array, handler) {
    for(var i = 0; i < array.length; i++) {
      handler(array[i]);
    }
  };

  var MockPromiseClass, OriginalPromiseClass, originalThen;

  var MockPromises = function() {
    var contractsTracker = new ContractsTracker();

    this.install = function(ExternalPromiseClass) {
      MockPromiseClass = ExternalPromiseClass;
      if(MockPromiseClass.prototype.then !== fakeThen) {
        originalThen = MockPromiseClass.prototype.then;
      }
      MockPromiseClass.prototype.then = fakeThen;
    };

    this.uninstall = function() {
      if(MockPromiseClass && originalThen) {
        MockPromiseClass.prototype.then = originalThen;
      }
      if(OriginalPromiseClass) {
        MockPromiseClass = OriginalPromiseClass;
        OriginalPromiseClass = null;
      }
    };

    this.getMockPromiseClass = function(ExternalPromiseClass) {
      if(!OriginalPromiseClass) {
        OriginalPromiseClass = ExternalPromiseClass;
      }

      MockPromiseClass = function() {
        return this.initialize.apply(this, arguments);
      };

      MockPromiseClass.prototype.initialize = function(outerCallback) {
        var self = this;

        var promise = new OriginalPromiseClass(function(resolve, reject) {
          outerCallback(
            function(value) {
              self.resolvedValue = value;
              self.fulfilled = true;
              resolve(value);
            },
            function(value) {
              self.rejectedValue = value;
              self.rejected = true;
              reject(value);
            }
          );
        });

        promise.inspect = function() {
          return {value: self.resolvedValue, reason: self.rejectedValue};
        };
        promise.isFulfilled = function() {
          return self.fulfilled;
        };
        promise.isRejected = function() {
          return self.rejected;
        };
        promise.then = fakeThen;

        promise.catch = function(errorHandler) {
          return promise.then(function() {
          }, errorHandler);
        };

        return promise;
      };

      return MockPromiseClass;
    };

    this.getOriginalPromiseClass = function() {
      return OriginalPromiseClass;
    };

    var fakeThen = function() {
      var promise = this;
      contractsTracker.add({
        promise: promise,
        fulfilledHandler: arguments[0],
        errorHandler: arguments[1],
        progressHandler: arguments[2]
      });
      return promise;
    };

    this.executeForPromise = function(promise) {
      return contractsTracker.executeForPromise(promise);
    };
    this.valueForPromise = function(promise) {
      return contractsTracker.valueForPromise(promise);
    };
    this.executeForResolvedPromises = function() {
      return contractsTracker.executeForResolvedPromises();
    };

    this.contracts = contractsTracker;
  };

  var Contract = function(options) {
    this.id = options.id;
    this.promise = options.promise;
    this.fulfilledHandler = options.fulfilledHandler;
    this.errorHandler = options.errorHandler;
    this.progressHandler = options.progressHandler;
  };

  extend(Contract.prototype, {
    execute: function() {
      if(!this._executed) {
        this._executed = true;
        if(this.promise.isFulfilled()) {
          this.fulfilledHandler.call(this.promise, this.promise.inspect().value);
        } else if(this.promise.isRejected()) {
          this.errorHandler.call(this.promise, this.promise.inspect().reason);
        } else {
          throw new Error("this promise is not resolved and should not be executed");
        }

      }
    }
  });

  var ContractsTracker = function() {
    var contracts = [];
    var id = 0;
    this.reset = function() {
      contracts = [];
    };

    this.add = function(options) {
      options.id = id;
      id++;
      contracts.push(new Contract(options));
    };

    this.all = function() {
      return contracts;
    };

    this.filter = function(testFunction) {
      var filteredContracts = [];
      each(this.all(), function(contract) {
        if(testFunction(contract)) {
          filteredContracts.push(contract);
        }
      });
      return filteredContracts;
    };

    this.forPromise = function(promise) {
      return this.filter(function(contract) {
        return contract.promise === promise;
      });
    };

    this.executeForPromise = function(promise) {
      each(this.forPromise(promise), function(contract) {
        contract.execute();
      });
    };

    this.valueForPromise = function(promise) {
      return promise.inspect().value;
    };

    this.executeForResolvedPromises = function() {
      var resolvedContracts = this.filter(function(contract) {
        return contract.promise.isFulfilled();
      });
      each(resolvedContracts, function(contract) {
        contract.execute();
      });
    };
  };

  mockPromises = new MockPromises();
})();
