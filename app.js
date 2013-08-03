var http = require('http');
var url = require('url');
var levelup = require('level');
var _ = require('underscore');
var treegetting = require('./treegetting');

var caseDataSource = require('./client/caseData');
var port = 80;

if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'dev') {
  port = 3000;
}

var db = levelup('./db/sprigot.db', {
  valueEncoding: 'json'
});

http.createServer(function takeRequest(req, res) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, headers);
    res.end('OK');
  }
  else if ('content-type' in req.headers && req.method === 'POST' &&
    req.headers['content-type'].toLowerCase() === 'application/json') {

    var body = '';

    req.on('data', function (data) {
      body += data;
    });

    req.on('end', function doneReadingData() {
      respondToRequestWithBody(req, body, res, headers);
    });
  }
  else {
    respondThatReqWasNotUnderstood(res);
  }
})
.listen(port, '127.0.0.1');


function respondToRequestWithBody(req, body, res, baseHeaders) {  
  var jobs = JSON.parse(body);
  var responded = false;
  var jobKeys = _.keys(jobs);
  var jobCount = jobKeys.length;
  var jobsDone = 0;
  var responses = {};

  var headers = _.clone(baseHeaders);
  headers['Content-Type'] = 'text/json';

  function jobComplete(status, jobKey, result) {
    responses[jobKey] = {
      status: status,
      result: result
    };

    jobsDone = jobsDone + 1;
    if (jobsDone >= jobCount) {
      res.writeHead(200, headers);
      res.end(JSON.stringify(responses));
    }
  }
  
  // We'll get a response for each, then write them out when we have them all.
  // Promises? Generator? Fibers? Nah, just do 'em sequentially. If any job
  // takes particularly long, write a response now, then start doing it async.
  for (var i = 0; i < jobCount; ++i) {
    var jobKey = jobKeys[i];
    var job = jobs[jobKey];
    switch (job.op) {
      case 'getSprig':
        if (job.params.sprigId) {
          if (typeof job.params.childDepth === 'number' && 
            job.params.childDepth > 0) {
            getSprigTreeFromDb(job.params.sprigId, job.params.childDepth, 
              jobKey, jobComplete);
          }
          else {
            getSprigFromDb(job.params.sprigId, jobKey, jobComplete);
          }
        }
        else {
          jobComplete('Not understood', jobKey, null);
        }
        break;
      case 'saveSprig':
        if (job.params.sprigId) {
          saveSprigToDb(job.params.sprigId, job.params.sprigContents, jobKey,
            jobComplete);
        }
        else {
          jobComplete('Not understood', jobKey, null);
        }
        break;
      default:
        jobComplete('Not understood', jobKey, null);
        break;
    }
  };
}

function getSprigFromDb(sprigId, jobKey, jobComplete) {
  db.get(sprigId, function getFromDbDone(error, value) {
    if (error) {
      if (error.name === 'NotFoundError') {
        jobComplete('Not found', jobKey, []);
      }
      else {
        jobComplete('Database error', jobKey, error);
      }
    }
    else {
      jobComplete('got', jobKey, value);
    }
  });
}

function getSprigTreeFromDb(sprigId, childDepth, jobKey, jobComplete) {
  treegetting.getTree(db, sprigId, childDepth, 
    function done(errors, value) {
      if (errors.length > 0) {
        jobComplete('Errors while getting tree', jobKey, errors);
      }
      else {
        jobComplete('got', jobKey, value);
      }
    }
  );
}

function saveSprigToDb(sprigId, sprigContents, jobKey, jobComplete) {
  db.put(sprigId, sprigContents, function putDbDone(error) {
    if (error) {
      jobComplete('Database error', jobKey, error);
    }
    else {
      jobComplete('posted', jobKey, {
        sprigId: sprigId
      });
    }
  });  
}

console.log('Server running at http://127.0.0.1:' + port);

