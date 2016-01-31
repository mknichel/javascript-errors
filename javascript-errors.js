"use strict";

/**
 * @fileoverview This file contains all the functions used to test
 * JavaScript error behavior.
 */

var _useTryCatch = false;
var _oldSetTimeout;
var _oldPromiseThen;
var _worker;
var _sharedWorker;

function log(content, append) {
  if (append) {
    document.getElementById('console').textContent += content;
  } else {
    document.getElementById('console').textContent = content;
  }
}

function throwString() {
  throw "You shouldn't throw strings.";
}

function throwError() {
  throw new Error("Some error message");
}

/** This function exists just to add another stack frame. */
function throwErrorWrapper() {
  throwError();
}

function resetErrorHandlers() {
  document.getElementById('noerrorhandler').className = '';
  document.getElementById('windowonerror').className = '';
  document.getElementById('trycatch').className = '';
  document.getElementById('protectedentrypoint').className = '';
  document.getElementById('windowaddeventlistener').className = '';
  window.onerror = undefined;
  _useTryCatch = false;
  if (_oldSetTimeout) {
    window.setTimeout = _oldSetTimeout;
  }
  if (_oldPromiseThen) {
    Promise.prototype.then = _oldPromiseThen;
  }
  window.removeEventListener("error", errorEventListener);
}

function useNoErrorHandler() {
  resetErrorHandlers();
  document.getElementById('noerrorhandler').className = 'active';
}

function useWindowOnError() {
  resetErrorHandlers();
  document.getElementById('windowonerror').className = 'active';
  window.onerror = function(msg, url, line, col, error) {
    var content = "" +
        "Message: " + msg + "\n" +
        "URL: " + url + "\n" +
        "Line: " + line + "\n" +
        "Column: " + col + "\n" +
        "Error: " + (!!error && error.stack);
    if (msg.indexOf('from worker') != -1) {
      log("\n\nError info from window.onerror:\n" + content, true);
    } else {
      log(content);
    }
  };
}

function useTryCatch() {
  resetErrorHandlers();
  document.getElementById('trycatch').className = 'active';
  _useTryCatch = true;
}

function protectEntryPoint(fn) {
  if (!fn) {
    return undefined;
  }
  var oldFn = fn;
  return function protectedFn() {
    try {
      return oldFn.apply(this, arguments);
    } catch (e) {
      log("Error object: " + e + "\nStack Trace: " + e.stack);
    }
  }
}

function useProtectedEntryPoints() {
  resetErrorHandlers();
  document.getElementById('protectedentrypoint').className = 'active';

  _oldSetTimeout = window.setTimeout;
  window.setTimeout = function protectedTimeout(fn, time) {
    return _oldSetTimeout.call(window, protectEntryPoint(fn), time);
  };
  _oldPromiseThen = Promise.prototype.then;
  Promise.prototype.then = function protectedThen(callback, errorHandler) {
    return _oldPromiseThen.call(this, protectEntryPoint(callback), protectEntryPoint(errorHandler));
  };
}

function errorEventListener(e) {
  var content = "Info from error event:\n" +
      "Message: " + e.message + "\n" +
      "Filename: " + e.filename + "\n" +
      "Line: " + e.lineno + "\n" +
      "Column: " + e.colno + "\n" +
      "Stack trace: " + (!!e.error && e.error.stack);
  log(content);
}

function useWindowAddEventListener() {
  resetErrorHandlers();
  document.getElementById('windowaddeventlistener').className = 'active';

  window.addEventListener("error", errorEventListener);
}

/** Catches any errors thrown by the given function. */
function catchError(fn) {
  try {
    fn();
  } catch (e) {
    log("Error object: " + e + "\nStack Trace: " + e.stack);
  }
}

/** Invokes the error function applying the appropriate error handling scheme. */
function invokeError(fn) {
  if (_useTryCatch) {
    catchError(fn);
  } else {
    fn();
  }
}

/** An example of an error thrown by the browser. */
function exampleErrorMessageTemplate() {
  var a = 3;
  a();
}

function throwErrorWithNativeFrame() {
  var arr = [0, 1, 2, 3];
  arr.forEach(function namedFn(value) {
    throwError();
  });
}

function throwAsyncError() {
  window.setTimeout(throwErrorWrapper, 10);
}

function throwNamedAnonymousFunction() {
  (function namedFunction() { throwError(); })();
}

function throwUnnamedAnonymousFunction() {
  (function() { throwError(); })();
}

function throwErrorFromFunctionWithDisplayName() {
  function namedFunction() { throwError(); };
  namedFunction.displayName = " # complicated description of function";
  namedFunction();
}

function throwErrorFromInnerFunctionAssignedToVariable() {
  var fnVariableName = function() { throwError(); };
  fnVariableName();
}

function catchAndRethrow() {
  try {
    throwErrorWrapper();
  } catch (e) {
    throw e;
  }
}

function evalError() {
  eval("(function evaledFunction() { throw new Error('Error from eval'); })()");
}

function evalErrorWithSourceUrl() {
  eval("(function evaledFunction() { throw new Error('Error from eval'); })()\n//# sourceURL=eval.js");
}

function errorFromPromise() {
  var p = Promise.resolve(0);
  p.then(function(val) {
    return val++;
  }).then(function() {
    throw new Error("error from promise");
  });
}

function errorFromRejectedPromise() {
  var p = Promise.reject(new Error("rejected promise"));
  p.then(function(val) {
    return val++;
  });
}

function handleWorkerError(event) {
  var content = "\n\nError info from parent onerror:\n" +
      "Message: " + event.message + "\n" +
      "Filename: " + event.filename + "\n" +
      "Line: " + event.lineno + "\n" +
      "Column: " + event.colno + "\n" +
      "Error obj: " + event.error;
  log(content, true);
}

function errorFromWorker() {
  // Clear out existing content so that both sources of errors from the worker are shown.
  log('');
  if (!_worker) {
    _worker = new Worker('worker.js');
    _worker.onerror = handleWorkerError;
    _worker.onmessage = handleWorkerMessage;
  }
  _worker.postMessage({ useTryCatch: _useTryCatch });
}

function errorFromSharedWorker() {
  if (!('SharedWorker' in window)) {
    log('SharedWorker not supported.');
    return;
  }
  log('');
  if (!_sharedWorker) {
    _sharedWorker = new SharedWorker('worker.js');
    _sharedWorker.onerror = handleWorkerError;
    _sharedWorker.port.addEventListener("message", handleWorkerMessage);
    _sharedWorker.port.start();
  }
  _sharedWorker.port.postMessage({ useTryCatch: _useTryCatch });
}

function handleWorkerMessage(event) {
  log(event.data, true);
}

function errorFromServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    log('Service worker not supported.');
    return;
  }
  navigator.serviceWorker.register('service-worker.js').then(function(registration) {
    log('Look at dev tools console for error information from the service worker');
    registration.unregister();
  });
}

function errorFromServiceWorkerInstallation() {
  if (!('serviceWorker' in navigator)) {
    log('Service worker not supported.');
    return;
  }
  navigator.serviceWorker.register('service-worker-installation-error.js').catch(function(error) {
    log("Error from the parent page service worker installation:\n" + error + "\n\nLook at devtools console for more information.");
  });
}
