# JavaScript Errors

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

For errors that come from another domain, all the information in the window.onerror handler will be sanitized to "Script error.", "", 0. This is generally okay if you really don't want to process the error if it comes from a script that you don't care about.

If you would like to receive errors with full fidelity from cross domain scripts, those resources must provide the appropriate cross origin headers. See https://mikewest.org/2013/08/debugging-runtime-errors-with-window-onerror for more information.

**Chrome Extensions**

Chrome extensions that are installed on a user's machine can also throw errors that get reported to window.onerror. These exceptions are very noisy and unactionable, so it's important that your application avoids reporting these errors.

**Other Bugs**

*  TODO: Write bug report for top level line number argument is wrong when sourceURL is used.

#### Recommendation

window.onerror is a useful tool to catch and report JS errors. It's recommended that only JS errors with valid Error objects and stack traces are reported back to the server, otherwise the errors may be hard to investigate or you may get a lot of spam from Chrome extensions or cross domain scripts.

### try/catch

### Protected Entry Points

## Reporting Errors to the Server
