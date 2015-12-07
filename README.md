# JavaScript Errors

This file contains information that I've learned over the years about dealing with JavaScript errors, reporting them to the server, and navigating a lot of bugs that can make this all really hard.

**Table of Contents**

*  [Introduction](#introduction)
*  [Anatomy of a JavaScript Error](#anatomy-of-a-javascript-error)
   *  [Producing a JavaScript Error](#producing-a-javascript-error)
   *  [Error Messages](#error-messages)
   *  [Stack Trace Format](#stack-trace-format)
*  [Catching JavaScript Errors](#catching-javascript-errors)

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
*  `throw 'Problem description.'` <-- BAD

Throwing a String is really not recommended since the browser will not attach a stack trace to that error, losing the context of where that error ocurred in the code. See https://mknichel.github.io/JavaScript-Errors/throw-string.html for an example.

### Error Messages

Each browser has its own set of messages that it uses for the built in exceptions, such as the example above for trying to call a non-function. Browsers will try to use the same messages, but since there is no spec, this is not guaranteed. For example, both Chrome and Firefox use `{0} is not a function` for the above example, but when there are multiple default statements in a `switch` statement, Chrome will throw `"More than one default clause in switch statement"` while Firefox will report `"more than one switch default"`. As new features are added to the web, these error messages have to be updated. These differences can come into play later when you are trying to handle reported errors from obfuscated code.

You can find the templates that browsers use for error messages at:

*  Firefox - http://mxr.mozilla.org/mozilla1.9.1/source/js/src/js.msg
*  Chrome - https://code.google.com/p/v8/source/browse/branches/bleeding_edge/src/messages.js

### Stack Trace Format

The stack trace is a description of where the error happened in the code. It is composed of a series of frames, where each frames describe a particular line in the code. The topmost frame is the location where the error was thrown, while the subsequent frames are the function call stack - or how the code was executed to get to that point where the error was thrown. Since JavaScript is usually concatenated and minified, it is also important to have column numbers so that the exact statement can be located when a given line has a multitude of statements.

A basic stack trace looks like:

```
  at throwError (http://mknichel.github.io/JavaScript-Errors/throw-error-basic.html:8:9)
  at http://mknichel.github.io/JavaScript-Errors/throw-error-basic.html:12:3
```

Each stack frame consists of a function name (if applicable and the code was not executed in the global scope), the script that it came from, and the line and column number of the code.

Unfortunately, there is no standard for the stack trace format so this differs by browser. 

IE 11's stack trace looks similar to Chrome's except it explicitly lists Global code:

```
  at throwError (http://mknichel.github.io/JavaScript-Errors/throw-error-basic.html:8:3)
  at Global code (http://mknichel.github.io/JavaScript-Errors/throw-error-basic.html:12:3)
```

Firefox's stack trace looks like:

```
  throwError@http://mknichel.github.io/JavaScript-Errors/throw-error-basic.html:8:9
  @http://mknichel.github.io/JavaScript-Errors/throw-error-basic.html:12:3
```

Safari's format is also slightly different:

```
  throwError@http://mknichel.github.io/JavaScript-Errors/throw-error-basic.html:8:18
  global code@http://mknichel.github.io/JavaScript-Errors/throw-error-basic.html:12:13
```

The same basic information is there, but the format is different. Also note that in the Safari example, aside from the format being different than Chrome, the column numbers are different than both Chrome and Firefox. These minor differences will come into play later when the server needs to parse the stack trace for reported errors.

See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack for more information on the stack property of errors.

#### Naming anonymous functions

By default, anonymous functions have no name and appear as "anonymous" in the function names in the stack trace. To improve debugging, you can name all stack traces:

```javascript
setTimeout(function nameOfTheAnonymousFunction() { ... }, 0);
```

This will ensure that `nameOfTheAnonymousFunction` appears in the frame for any code from inside that function, making debugging much easier. See http://www.html5rocks.com/en/tutorials/developertools/async-call-stack/#toc-debugging-tips for more information.

#### Programatically capturing stack traces

If an error is reported without a stack trace (see more details when this would happen below), then it's possible to programatically capture a stack trace.

In Chrome, this is really easy to do by using the Error.captureStackTrace API. See https://github.com/v8/v8/wiki/Stack%20Trace%20API for more information on the use of this API.

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

Async stack traces are only supported in Chrome DevTools right now. Stack traces accessed from errors in code will **not** have the async stack trace as part of it.

It is possible to polyfill async stack traces in some cases, but this could cause a significant performance hit for your application since capturing a stack trace is not cheap.

## Catching JavaScript Errors

## Reporting Errors to the Server
