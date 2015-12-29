# JavaScript Errors Handbook

This file contains information that I've learned over the years about dealing with JavaScript errors, reporting them to the server, and navigating a lot of bugs that can make this all really hard.

**Table of Contents**

*  [Introduction](#introduction)
*  [Anatomy of a JavaScript Error](#anatomy-of-a-javascript-error)
   *  [Producing a JavaScript Error](#producing-a-javascript-error)
   *  [Error Messages](#error-messages)
   *  [Stack Trace Format](#stack-trace-format)
*  [Catching JavaScript Errors](#catching-javascript-errors)
   *  [window.onerror](#windowonerror)
   *  [try/catch](#trycatch)
   *  [Protected Entry Points](#protected-entry-points)
   *  [Web Workers](#web-workers)
   *  [Chrome Extensions](#chrome-extensions)

## Introduction

Catching, reporting, and fixing errors is an important part of any application to ensure the health and stability of the application. Since JavaScript code is also executed on the client and in many different browser environments, staying on top of JS Errors from your application can also be hard. There are no formal web specs for how to report JS errors which cause differences in each browser's implementation. Additionally, there have been many bugs in browsers' implementation of JavaScript errors as well that have made this even harder. This page walks through aspects of JS Errors that I have learned over the years.

## Anatomy of a JavaScript Error

A JavaScript error is composed of two primary pieces: the **error message** and the **stack trace**. The error message is a string that describes what went wrong, and the stack trace describes where in the code the error happened.

### Producing a JavaScript Error

A JS Error can be thrown by the browser when a piece of code doesn't execute properly, or it can be thrown directly by code.

For example:

```javascript
var a = 3;
a();
```

In this example, a variable that is actually a number is trying to be invoked as a function. The browser will throw an error that looks like `TypeError: a is not a function` with a stack trace that points to that line of code.

A developer might want to throw an error in a piece of code if a certain precondition is not met. For example

```javascript
if (!checkPrecondition()) {
  throw new Error("Doesn't meet precondition!");
}
```

In this case, the error will be `Error: Doesn't meet precondition!`. This error will also contain a stack trace that points to the appropriate line.

There are multiple ways that developers can throw an error in JavaScript:

*  `throw new Error('Problem description.')`
*  `throw Error('Problem description.')` <-- equivalent to the first one
*  `throw 'Problem description.'` <-- Bad
*  `throw null` <-- Even worse

Throwing a String is really not recommended since the browser will not attach a stack trace to that error, losing the context of where that error ocurred in the code. See https://mknichel.github.io/javascript-errors/throw-string.html for an example.

### Error Messages

Each browser has its own set of messages that it uses for the built in exceptions, such as the example above for trying to call a non-function. Browsers will try to use the same messages, but since there is no spec, this is not guaranteed. For example, both Chrome and Firefox use `{0} is not a function` for the above example while IE11 will report `Function expected` (also without reporting what variable was attempted to be called). When there are multiple default statements in a `switch` statement, Chrome will throw `"More than one default clause in switch statement"` while Firefox will report `"more than one switch default"`. As new features are added to the web, these error messages have to be updated. These differences can come into play later when you are trying to handle reported errors from obfuscated code.

You can find the templates that browsers use for error messages at:

*  Firefox - http://mxr.mozilla.org/mozilla1.9.1/source/js/src/js.msg
*  Chrome - https://code.google.com/p/v8/source/browse/branches/bleeding_edge/src/messages.js

### Stack Trace Format

The stack trace is a description of where the error happened in the code. It is composed of a series of frames, where each frames describe a particular line in the code. The topmost frame is the location where the error was thrown, while the subsequent frames are the function call stack - or how the code was executed to get to that point where the error was thrown. Since JavaScript is usually concatenated and minified, it is also important to have column numbers so that the exact statement can be located when a given line has a multitude of statements.

A basic stack trace looks like:

```
  at throwError (http://mknichel.github.io/javascript-errors/throw-error-basic.html:8:9)
  at http://mknichel.github.io/javascript-errors/throw-error-basic.html:12:3
```

Each stack frame consists of a function name (if applicable and the code was not executed in the global scope), the script that it came from, and the line and column number of the code.

Unfortunately, there is no standard for the stack trace format so this differs by browser. 

IE 11's stack trace looks similar to Chrome's except it explicitly lists Global code:

```
  at throwError (http://mknichel.github.io/javascript-errors/throw-error-basic.html:8:3)
  at Global code (http://mknichel.github.io/javascript-errors/throw-error-basic.html:12:3)
```

Firefox's stack trace looks like:

```
  throwError@http://mknichel.github.io/javascript-errors/throw-error-basic.html:8:9
  @http://mknichel.github.io/javascript-errors/throw-error-basic.html:12:3
```

Safari's format is also slightly different:

```
  throwError@http://mknichel.github.io/javascript-errors/throw-error-basic.html:8:18
  global code@http://mknichel.github.io/javascript-errors/throw-error-basic.html:12:13
```

The same basic information is there, but the format is different. Also note that in the Safari example, aside from the format being different than Chrome, the column numbers are different than both Chrome and Firefox. The column numbers also can deviate more in different error situations - for example in the code `(function namedFunction() { throwError(); })();`, Chrome will report the column for the `throwError()` function call while IE11 reports the column number as the start of the string. These differences will come back into play later when the server needs to parse the stack trace for reported errors and deobfuscate obfuscated stack traces.

See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack for more information on the stack property of errors.

#### Naming anonymous functions

By default, anonymous functions have no name and either appear as empty string or "Anonymous function" in the function names in the stack trace (depending on the browser). To improve debugging, you can name all stack traces:

```javascript
setTimeout(function nameOfTheAnonymousFunction() { ... }, 0);
```

This will cause the stack trace to go from:

```
at http://mknichel.github.io/javascript-errors/javascript-errors.js:125:17
```

to

```
at nameOfTheAnonymousFunction (http://mknichel.github.io/javascript-errors/javascript-errors.js:121:31)
```

This method ensures that `nameOfTheAnonymousFunction` appears in the frame for any code from inside that function, making debugging much easier. See http://www.html5rocks.com/en/tutorials/developertools/async-call-stack/#toc-debugging-tips for more information.

#### Programatically capturing stack traces

If an error is reported without a stack trace (see more details when this would happen below), then it's possible to programatically capture a stack trace.

In Chrome, this is really easy to do by using the Error.captureStackTrace API. See https://github.com/v8/v8/wiki/Stack%20Trace%20API for more information on the use of this API.

For example:

```javascript
function ignoreThisFunctionInStackTrace() {
  var err = new Error();
  Error.captureStackTrace(err, ignoreThisFunctionInStackTrace);
  return err.stack;
}
```

In other browsers, a stack trace can also be collected by creating a new error and accessing the stack property of that object:

```javascript
var err = new Error('');
return err.stack;
```

However, IE10 only populates the stack trace when the error is actually thrown:

```javascript
try {
  throw new Error('');
} catch (e) {
  return e.stack;
}
```

If none of these approaches work, then it's possible to create a rough stack trace without line numbers or columns by iterating over the `arguments.callee.caller` object - this won't work in ES5 Strict Mode though.

#### Async stack traces

It's also very common for asynchronous points to be inserted into JavaScript code. This will happen when code uses `setTimeout`, or through the use of Promises for example.

Chrome DevTools has support for async stack traces, or in other words making sure the stack trace of an error also shows the frames that happened before the async point was introduced. With the use of setTimeout, this will capture who called the setTimeout function that eventually produced an error. See http://www.html5rocks.com/en/tutorials/developertools/async-call-stack/ for more information.

An async stack trace will look like:

```
  throwError	@	throw-error.js:2
  setTimeout (async)		
  throwErrorAsync	@	throw-error.js:10
  (anonymous function)	@	throw-error-basic.html:14
```

Async stack traces are only supported in Chrome DevTools right now, only for exceptions that are thrown when DevTools are open. Stack traces accessed from errors in code will **not** have the async stack trace as part of it.

It is possible to polyfill async stack traces in some cases, but this could cause a significant performance hit for your application since capturing a stack trace is not cheap.

#### Naming inline scripts and eval

Stack traces for code that was eval'ed or inlined into a HTML page will use the page's URL and line/column numbers for the executed code.

For example:

```
  at throwError (http://mknichel.github.io/javascript-errors/throw-error-basic.html:8:9)
  at http://mknichel.github.io/javascript-errors/throw-error-basic.html:12:3
```

If these scripts actually come from a script that was inlined for optimization reasons, then the URL, line, and column numbers will be wrong. To work around this problem, Chrome and Firefox support the `//# sourceURL=` annotation (Safari and IE do not). The URL specified in this annotation will be used as the URL for all stack traces, and the line and column number will be computed relative to the start of the `<script>` tag instead of the HTML document. For the same error as above, using the sourceURL annotation with a value of "inline.js" will produce a stack trace that looks like:

```
  at throwError (http://mknichel.github.io/javascript-errors/inline.js:8:9)
  at http://mknichel.github.io/javascript-errors/inline.js:12:3
```

This is a really handy technique to make sure that stack traces are still correct even when using inline scripts and eval.

http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl describes the sourceURL annotation in more detail.

##### Eval stack traces

There are other differences in the stack trace besides just the use of the sourceURL annotation. In Chrome, a stack trace from a statement used in eval could look like:

```
Error: Error from eval
    at evaledFunction (eval at evalError (http://mknichel.github.io/javascript-errors/javascript-errors.js:137:3), <anonymous>:1:36)
    at eval (eval at evalError (http://mknichel.github.io/javascript-errors/javascript-errors.js:137:3), <anonymous>:1:68)
    at evalError (http://mknichel.github.io/javascript-errors/javascript-errors.js:137:3)
```

In IE11, this would look like:

```
Error from eval
    at evaledFunction (eval code:1:30)
    at eval code (eval code:1:2)
    at evalError (http://mknichel.github.io/javascript-errors/javascript-errors.js:137:3)
```

In Safari:

```
Error from eval
    evaledFunction
    eval code
    eval@[native code]
    evalError@http://mknichel.github.io/javascript-errors/javascript-errors.js:137:7
```

and in Firefox:

```
Error from eval
    evaledFunction@http://mknichel.github.io/javascript-errors/javascript-errors.js line 137 > eval:1:36
    @http://mknichel.github.io/javascript-errors/javascript-errors.js line 137 > eval:1:11
    evalError@http://mknichel.github.io/javascript-errors/javascript-errors.js:137:3
```

## Catching JavaScript Errors

To detect that your application had an error, some code must be able to catch that error and report about it. There are multiple techniques for catching errors, each with their pros and cons.

### window.onerror

window.onerror is one of the easiest ways to get started catching errors. By assigning window.onerror to a function, any error that is uncaught by another part of the application will be reported to this function, along with some information about the error. For example:

```javascript
window.onerror = function(msg, url, line, col, err) {
  console.log('Application encountered an error: ' + msg);
  console.log('Stack trace: ' + err.stack);
}
```

https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror describes this in more detail.

Historically, there have been a few problems with this approach:

**No Error object provided**

The 5th argument to the window.onerror function is supposed to be an Error object. This was added to the WHATWG spec in 2013: https://html.spec.whatwg.org/multipage/webappapis.html#errorevent. Chrome, Firefox, and IE11 now properly provide an Error object (along with the critical stack property), but Safari and IE10 do not. This works in Firefox since Firefox 14 (https://bugzilla.mozilla.org/show_bug.cgi?id=355430) and in Chrome since late 2013 (https://mikewest.org/2013/08/debugging-runtime-errors-with-window-onerror, https://code.google.com/p/chromium/issues/detail?id=147127), although older versions of Chrome (such as some versions still popular on Android) do not get an error object.

**Cross domain sanitization**

In Chrome, errors that come from another domain in the window.onerror handler will be sanitized to "Script error.", "", 0. This is generally okay if you really don't want to process the error if it comes from a script that you don't care about, so the application can filter out errors that look like this. However, this does not happen in Firefox or Safari, nor does Chrome do this for try/catch blocks.

If you would like to receive errors in window.onerror in Chrome with full fidelity from cross domain scripts, those resources must provide the appropriate cross origin headers. See https://mikewest.org/2013/08/debugging-runtime-errors-with-window-onerror for more information.

**Chrome Extensions**

Chrome extensions that are installed on a user's machine can also throw errors that get reported to window.onerror. These exceptions are very noisy and unactionable, so it's important that your application avoids reporting these errors.

**Other Bugs**

*  TODO: Write bug report for top level line number argument is wrong when sourceURL is used.

#### window.addEventListener("error")

The `window.addEventListener("error")` API works the same as the window.onerror API. See http://www.w3.org/html/wg/drafts/html/master/webappapis.html#runtime-script-errors for more information on this approach.

#### Showing errors in DevTools console for development

Catching errors via window.onerror does not prevent that error from also appearing in the DevTools console. This is most likely the right behavior for development since the developer can easily see the error. If you don't want these errors to show up in production to end users, `e.preventDefault()` can be called if using the window.addEventListener approach.

#### Recommendation

window.onerror is the best tool to catch and report JS errors. It's recommended that only JS errors with valid Error objects and stack traces are reported back to the server, otherwise the errors may be hard to investigate or you may get a lot of spam from Chrome extensions or cross domain scripts.

### try/catch

Given the above section, unfortunately it's not possible to rely on window.onerror in all browsers to capture all error information. For catching exceptions locally, a try/catch block is the obvious choice. It's also possible to wrap entire JavaScript files in a try/catch block to capture error information that can't be caught with window.onerror. This improves the situations for browsers that don't support window.onerror, but also has some downsides.

#### Doesn't catch all errors

A try/catch block won't capture all errors in a program, such as errors that are thrown from an async block of code through `window.setTimeout`. Try/catch can be used with [Protected Entry Points](#protected-entry-points) to help fill in the gaps. 

#### Deoptimizations

In V8 (and potentially other JS engines), functions that contain a try/catch block won't be optimized by the compiler. See http://www.html5rocks.com/en/tutorials/speed/v8/ for more information.

### Protected Entry Points

An "entry point" into JavaScript is any browser API that can start execution of your code. Examples include setTimeout, setInterval, event listeners, XHR, web sockets, or promises. Errors that are thrown from these entry points will be caught by window.onerror, but in the browsers that don't support the full Error object in window.onerror, an alternative mechanism is needed to catch these errors since the try/catch method mentioned above won't catch them either.

Thankfully, JavaScript allows these entry points to be wrapped so that a try/catch block can be inserted before the function is invoked to catch any errors thrown by the code.

Each entry point will need slightly different code to protect the entry point, but the gist of the methodology is:

```javascript
function protectEntryPoint(fn) {
  return function protectedFn() {
    try {
      return fn();
    } catch (e) {
      // Handle error.
    }
  }
}
_oldSetTimeout = window.setTimeout;
window.setTimeout = function protectedSetTimeout(fn, time) {
  return _oldSetTimeout.call(window, protectEntryPoint(fn), time);
};
```

### Web Workers

Web workers, including dedicated workers, shared workers, and service workers, are becoming more popular in applications today. Since all of these workers are separate scripts from the main page, they each need their own error handling code. It is recommended that each worker script install its own error handling and reporting code for maximum effectiveness handling errors from workers.

#### Dedicated workers

Dedicated web workers execute in a different execution context than the main page, so errors from workers aren't caught by the above mechanisms. Additional steps need to be taken to capture errors from workers on the page.

When a worker is created, the onerror property can be set on the new worker:

```javascript
var worker = new Worker('worker.js');
worker.onerror = function(errorEvent) { ... };
```

This is defined in https://html.spec.whatwg.org/multipage/workers.html#handler-abstractworker-onerror. The `onerror` function on the worker has a different signature than the `window.onerror` discussed above. Instead of accepting 5 arguments, worker.onerror takes a single argument: an ErrorEvent object. The API for this object can be found at https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent. It contains the message, filename, line, and column, but no stable browser today contains the "Error" object that contains the stack trace (errorEvent.error is null). Since this API is executed in the parent page's scope, it would be useful for using the same reporting mechanism as the parent page; unfortunately due to the lack of a stack trace, this API is of limited use.

Inside of the JS run by the worker, you can also define an onerror API that follows the usual window.onerror API: https://html.spec.whatwg.org/multipage/webappapis.html#onerroreventhandler. In the worker code:

```javascript
self.onerror = function(message, filename, line, col, error) { ... };
```

The discussion of this API mostly follows the discussion above for window.onerror. However, there are 2 notable things to point out:

Firefox, as well as Safari, do not report the "error" object as the 5th argument to the function, so these browsers do not get a stack trace from the worker (Chrome and IE11 do get a stack trace). Protected Entry Points for the `onmessage` function within the worker can be used to capture stack trace information for these browsers.

Since this code executes within the worker, the code must choose how to report the error back to the server: It must either use `postMessage` to communicate the error back to the parent page, or install an XHR error reporting mechanism (discussed more below) in the worker itself.

In Firefox, Safari, and IE11 (but not in Chrome), the parent page's window.onerror function will also be called after the worker's own onerror and the onerror event listener set by the page has been called. However, this window.onerror will also not contain an error object and therefore won't have a stack trace also. These browsers must also take care to not report errors from workers multiple times.

#### Shared workers

Chrome and Firefox support the [SharedWorker API](http://www.w3.org/TR/workers/#sharedworker) for sharing a worker among multiple pages. Since the worker is shared, it is not attached to one parent page exclusively; this leads to some differences in how errors are handled, although SharedWorker mostly follows the same information as the dedicated web worker.

In Chrome, when there is an error in a SharedWorker, only the worker's own error handling within the worker code itself will be called (like if they set `self.onerror`). The parent page's window.onerror will not be called, and Chrome does not support the inherited `AbstractWorker.onerror` that can be called in the parent page as defined in the spec.

In Firefox, this behavior is different. An error in the shared worker will cause the parent page's window.onerror to be called, but the error object will be null. Additionally, Firefox does support the `AbstractWorker.onerror` property, so the parent page can attach an error handler of its own to the worker. However, when this error handler is called, the error object will be null so there will be no stack trace.

#### Service Workers

[Service Workers](http://www.w3.org/TR/service-workers/) are a brand new spec that is currently only available in recent Chrome and Firefox versions. These workers follow the same discussion as dedicated web workers. 

Service workers are installed by calling the `navigator.serviceWorker.register` function. This function returns a Promise which will be rejected if there was an error installing the service worker, such as it throwing an error during initialization. This error will only contain a string message and nothing else. Additionally, since Promises don't report errors to window.onerror handlers, the application itself would have to add a catch block to the Promise to catch the error.

```javascript
navigator.serviceWorker.register('service-worker-installation-error.js').catch(function(error) {
  // error typeof string
});
```

Just like the other workers, service workers can set a `self.onerror` function within the service workers to catch errors. Installation errors in the service worker will be reported to the onerror function, but unfortunately they won't contain an error object or stack trace.

The service worker API contains an onerror property inherited from the AbstractWorker interface, but Chrome does not do anything with this property.

#### Worker Try/Catch

To capture stack traces in Firefox + Safari within a worker, the `onmessage` function can be wrapped in a try/catch block to catch any errors that propagate to the top. 

```javascript
self.onmessage = function(event) {
  try {
    // logic here
  } catch (e) {
    // Report exception.
  }
};
```

The normal try/catch mechanism will capture stack traces for these errors, producing an exception that looks like:

```
Error from worker
throwError@http://mknichel.github.io/javascript-errors/worker.js:4:9
throwErrorWrapper@http://mknichel.github.io/javascript-errors/worker.js:8:3
self.onmessage@http://mknichel.github.io/javascript-errors/worker.js:14:7
```

### Chrome Extensions

[Chrome Extensions](https://developer.chrome.com/extensions) deserve their own section since errors in these scripts can operate slightly differently, and historically (but not anymore) errors from Chrome Extensions have also been a problem for large popular sites.

#### Content Scripts

Content scripts are scripts that run in the context of web pages that a user visits. These scripts run in an [isolated execution environment](https://developer.chrome.com/extensions/content_scripts#execution-environment) so they can access the DOM but they can not access JavaScript on the parent page (and vice versa).

Since content scripts have their own execution environment, they can assign to the `window.onerror` handler in their own script and it won't affect the parent page. However, errors caught by `window.onerror` in the content script are sanitized by Chrome resulting in a "Script error." with null filename and 0 for line and column. This bug is tracked by https://code.google.com/p/chromium/issues/detail?id=457785. Until that bug is fixed, a try/catch block or protected entry points are the only ways to catch JS errors in a content script with stack traces.

In years past, errors from content scripts would be reported to the `window.onerror` handler of the parent page which could result in a large amount of spammy error reports for popular sites. This was fixed in late 2013 though (https://code.google.com/p/chromium/issues/detail?id=225513). 

#### Browser Actions

Chrome extensions can also generate browser action popups, which are small HTML pages that spawn when a user clicks a Chrome extension icon to the right of the URL bar. These pages can also run JavaScript, in an entirely different execution environment from everything else. `window.onerror` works properly for this JavaScript.

## Reporting Errors to the Server

Once the client is configured to properly catch exceptions with correct stack traces, these exceptions should be reported back to the server so they can be tracked, analyzed, and then fixed. Typically this is done with a XHR endpoint that records the error message and the stack trace information, along with any relevant client context information, such as the version of the code that's running, the user agent, the user's locale, and the top level URL of the page.

If the application uses multiple mechanisms to catch errors, it's important to not report the same error twice. Errors that contain a stack trace should be preferred; errors reported without a stack trace can be hard to track down in a large application.
