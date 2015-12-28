self.onerror = function(msg, url, line, col, error) {
  var content = "\nError info from service worker self.onerror:\n" +
      "Message: " + msg + "\n" +
      "URL: " + url + "\n" +
      "Line: " + line + "\n" +
      "Column: " + col + "\n" +
      "Error: " + (!!error && error.stack);
  console.log(content);
};

function throwError() {
  throw new Error('Error from service worker');
}

function throwErrorWrapper() {
  throwError();
}

self.addEventListener("install", function(event) {
  throwErrorWrapper();
});
