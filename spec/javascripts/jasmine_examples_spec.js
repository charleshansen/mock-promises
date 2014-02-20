var _collectionPromise, _collection, _modelPromise;

var getModel = function() {
  if (!_modelPromise) {
    //There would normally be ajax here
    _modelPromise = Promise.resolve("I am a Model");
  }
  return _modelPromise;
};

var getCollection = function() {
  if (!_collectionPromise) {
    //There would normally be some ajax here
    _collection = ["first model"];
    _collectionPromise = Promise.resolve(_collection);
  }
  return _collectionPromise;
};

var addModelFromPromise = function(modelPromise, collection) {
  modelPromise.then(function(model) {
    collection.push(model);
  });
};

var addModelIfSafe = function(modelPromise, collection) {
  var unsafeModelsPromise = Promise.resolve(["illegal", "dangerous"]);

  Promise.all([modelPromise, unsafeModelsPromise]).then(function(results) {
    var model = results[0];
    var unsafeModels = results[1];

    if(unsafeModels.indexOf(model) < 0) {
      collection.push(model);
    } else {
      console.log("that model is unsafe, I will not add it");
    }
  });
};

var reset = function() {
  _collectionPromise = null;
  _collection = null;
  _modelPromise = null;
};

describe("tested with mock-promises", function() {
  beforeEach(function() {
    reset();
    mockPromises.contracts.reset();
    Promise = mockPromises.getMockPromise(Promise);
  });

  it("adds a model to the collection", function() {
    var modelPromise = getModel();
    var collectionPromise = getCollection();
    var collection = mockPromises.valueForPromise(collectionPromise);
    addModelFromPromise(modelPromise, collection);
    mockPromises.executeForPromise(modelPromise);
    expect(collection).toEqual(["first model", "I am a Model"]);
  });

  it("safely adds a model to the collection", function() {
    var modelPromise = getModel();
    var collectionPromise = getCollection();
    var collection = mockPromises.valueForPromise(collectionPromise);
    addModelIfSafe(modelPromise, collection);
    mockPromises.executeForResolvedPromises();
    mockPromises.executeForResolvedPromises();
    expect(collection).toEqual(["first model", "I am a Model"]);
  });

  afterEach(function() {
    Promise = mockPromises.getOriginalPromise();
  });
});

describe("tested without mock-promise", function() {
  beforeEach(function() {
    reset();
  });

  it("adds a model to the collection", function(done) {
    var modelPromise = getModel();
    getCollection().then(function(collection) {
      addModelFromPromise(modelPromise, collection);
      modelPromise.then(function(model) {
        expect(collection).toEqual(["first model", "I am a Model"]);
        done();
      });
    });
  });

  it("safely adds a model to the collection", function(done) {
    var modelPromise = getModel();
    var collectionPromise = getCollection();
    collectionPromise.then(function(collection) {
      addModelIfSafe(modelPromise, collection);
      modelPromise.then(function() {
        setTimeout(function() {
          setTimeout(function() {
            expect(collection).toEqual(["first model", "I am a Model"]);
            done();
          }, 0);
        }, 0);
      });
    });
  });
});
