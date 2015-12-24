"use strict";

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
      postMessage(e.message + "\n" + e.stack);
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
  postMessage(content);
};
