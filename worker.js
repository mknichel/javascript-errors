"use strict";

var _port;

function throwError() {
  throw new Error('Error from worker');
}

function throwErrorWrapper() {
  throwError();
}

self.onmessage = function(event) {
  if (event.data.useTryCatch) {
    try {
      throwErrorWrapper();
    } catch (e) {
      var myself = _port || self;
      myself.postMessage(e.message + "\n" + e.stack);
    }
  } else {
    throwErrorWrapper();
  }
};

self.onerror = function(msg, url, line, col, error) {
  var content = "\nError info from self.onerror:\n" +
      "Message: " + msg + "\n" +
      "URL: " + url + "\n" +
      "Line: " + line + "\n" +
      "Column: " + col + "\n" +
      "Error: " + (!!error && error.stack);
  var myself = _port || self;
  myself.postMessage(content);
};

// Add support for shared workers as well.
self.addEventListener("connect", function(e) {
  var port = e.ports[0];
  port.addEventListener("message", self.onmessage);
  port.addEventListener("error", self.onerror);
  port.start();
  _port = port;
});
