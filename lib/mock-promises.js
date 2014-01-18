(function() {
  var extend = function(destination, source) {
    for (var property in source) {
      destination[property] = source[property];
    }
    return destination;
  };

  var each = function(array, handler) {
    for (var i = 0; i < array.length; i++) {
      handler(array[i]);
    }
  };

  var PromiseClass, realThen;
  var MockPromises = function() {
    var contractsTracker = new ContractsTracker();
    this.install = function(ExternalPromiseClass) {
      PromiseClass = ExternalPromiseClass;
      if(PromiseClass.prototype.then !== fakeThen) {
        realThen = PromiseClass.prototype.then;
      }
      PromiseClass.prototype.then = fakeThen;
    };

    this.uninstall = function() {
      PromiseClass.prototype.then  = realThen;
    };

    var fakeThen = function() {
      contractsTracker.add({
        promise: this,
        fulfilledHandler: arguments[0],
        errorHandler: arguments[1],
        progressHandler: arguments[2]
      });
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
      if (!this._executed) {
        this._executed = true;
        this.fulfilledHandler.call(this.promise, this.promise.inspect().value);
      }
    }
  });

  var ContractsTracker = function() {
    var contracts = [];
    var id = 0;
    this.reset = function() {
      contracts = []
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
        if (testFunction(contract)) {
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

    this.executeForResolvedPromises = function() {
      var resolvedContracts = this.filter(function(contract) {
        return contract.promise.inspect().state === "fulfilled";
      });
      each(resolvedContracts, function(contract) {
        contract.execute();
      });
    };
  };

  jasmine.Promises = new MockPromises();
})();
