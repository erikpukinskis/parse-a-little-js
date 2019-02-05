library.define(
  "hello world",[
  "web-site",
  "web-element",
  "browser-bridge"],
  function(WebSite, element, BrowserBridge) {
    var site = newWebSite(
      )
    site.start(
      3444)
    var page = element(
      "hello world")
    site.addRoute(
      "get",
      "/",
      function(_, response) {
        var bridge = newBrowserBridge(
          ).forResponse(
            response)
        bridge.send(
          page)})})
