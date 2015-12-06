# JavaScript Errors

This file contains information that I've learned over the years about dealing with JavaScript errors, reporting them to the server, and navigating a lot of bugs that can make this all really hard.

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

## Techniques for Catching Errors

## Reporting Errors to the Server
