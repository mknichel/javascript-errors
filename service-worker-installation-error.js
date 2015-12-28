self.onerror = function(msg, url, line, col, error) {
  var content = "Error info from service worker self.onerror:\n" +
      "Message: " + msg + "\n" +
      "Filename: " + url + "\n" +
      "Line: " + line + "\n" +
      "Column: " + col + "\n" +
      "Error: " + error;
  console.log(content);
};

throw new Error("Error in service worker installation.");
