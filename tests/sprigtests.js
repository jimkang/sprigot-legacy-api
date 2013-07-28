var assert = require('assert');
var _ = require('underscore');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var caseDataSource = require('../client/caseData');
var sprigTree = require('../client/sprig-tree_relations')

/* Utils */

var utils = {};

utils.sendJSONRequest = function sendJSONRequest(options) {
  var optionsValidated = utils.optionsAreValid(options, {
    url: 'string',
    done: 'function',
    jsonParams: 'object',
    method: 'string'
    // Optional:
    // authHeader: 'string'
  });

	if (!optionsValidated) {
	  if (options.done) {
	    options.done('Invalid params for sendJSONRequest.', null);
	  }
	  return;
	}

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function processXHRStateChange() {
	  if (4 == xhr.readyState && 0 !== xhr.status) {
	    options.done(null, xhr);
	  }
	}
	xhr.onerror = function(e) { return options.done(e, null); };
	xhr.open(options.method, options.url, true);
	// Content-Type must be capitalized exactly, or node-xmlhttprequest will 
	// overwrite it.
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.setRequestHeader("accept", "application/json");
	var preparedParams = encodeURIComponent(JSON.stringify(options.jsonParams));

	if (options.authHeader) {
    xhr.setRequestHeader('Authorization', options.authHeader);
	}

	var preparedParams = JSON.stringify(options.jsonParams);
	if (!preparedParams) {
	  preparedParams = '{}';
	}
	xhr.send(preparedParams);
};

utils.optionsAreValid = function optionsAreValid(options, expectedTypes) {
  if (!options) {
    options = {};
  }
  return _.every(expectedTypes, function optionIsValid(expectedType, key) {
    var valid = false;
    var value = options[key];
    return (typeof value === expectedType);
  });
}

/* Settings */

var settings = {
  baseURL: 'http://localhost:3000'
};

/* Session */

var session = {

};

/* The tests */

/* Actor: Visitor */

var rootSprig = sprigTree.serializeTreedNode(caseDataSource);

describe('A visitor', function getASprig() {
  it('should not get a sprig using the wrong id', function getSprig(testDone) {
    utils.sendJSONRequest({
      url: settings.baseURL,
      method: 'POST',
      jsonParams: {
        sprig3req: {
          op: 'getSprig',
          params: {
            sprigId: 'sprig3'
          }
        }
      },
      done: function doneGettingSprig(error, xhr) {
        var response = JSON.parse(xhr.responseText);
        assert.equal(response.sprig3req.status, 'Not found');
        testDone();
      }
    });
  });

  it('should post a sprig', function postSprig(testDone) {
    utils.sendJSONRequest({
      url: settings.baseURL,
      method: 'POST',
      jsonParams: {
        sprig2req: {
          op: 'saveSprig',
          params: {
            sprigId: 'sprig2',
            sprigContents: rootSprig
          }
        }
      },
      done: function donePostingSprig(error, xhr) {
        var response = JSON.parse(xhr.responseText);
        assert.deepEqual(response.sprig2req, {
          status: 'posted',
          result: {
            sprigId: 'sprig2'
          }
        });
        testDone();
      }
    });
  });

  it('should get a sprig', function getSprig(testDone) {
    utils.sendJSONRequest({
      url: settings.baseURL,
      method: 'POST',
      jsonParams: {
        sprig1req: {
          op: 'getSprig',
          params: {
            sprigId: 'sprig2',
            childDepth: 0
          }
        }
      },
      done: function doneGettingSprig(error, xhr) {
        var response = JSON.parse(xhr.responseText);
        assert.deepEqual(response.sprig1req.result, rootSprig);
        testDone();
      }
    });
  });

  it('should post a sprig, and also get a sprig', function postAndGetSprig(testDone) {
    var testSprigContents = {
      id: 'one',
      title: 'One',
      body: 'First, there was one.',
      children: [
        {
          id: 'two',
          title: 'Two',
          body: 'Then, there were two.'
        }
      ]
    };

    utils.sendJSONRequest({
      url: settings.baseURL,
      method: 'POST',
      jsonParams: {
        sprig1req: {
          op: 'saveSprig',
          params: {
            sprigId: 'sprig10',
            sprigContents: testSprigContents
          }
        },
        sprig2req: {
          op: 'getSprig',
          params: {
            sprigId: 'sprig2'
          }
        }
      },
      done: function donePostingAndGettingSprig(error, xhr) {
        var response = JSON.parse(xhr.responseText);
        console.log(response);
        assert.deepEqual(response.sprig1req, {
          status: 'posted',
          result: {
            sprigId: 'sprig10'
          }
        });
        assert.deepEqual(response.sprig2req.result, rootSprig);        
        testDone();
      }
    });
  });

});

