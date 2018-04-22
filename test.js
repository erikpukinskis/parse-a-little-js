var runTest = require("run-test")(require)


runTest(
  "quotes parse",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"browser-bridge\"")
    expect(segments.outro).to.equal("\"")
    done()
  }
)


runTest(
  "quotes parse",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"browser-bridge\"")
    expect(segments.outro).to.equal("\"")
    done()
  }
)

runTest(
  "variable assignment parses",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("var foo = bar\"")
    expect(segments.intro).to.equal("var")
    expect(segments.identifierIsh).to.equal("foo")
    expect(segments.separator).to.equal("=")
    expect(segments.notIdentifier).to.equal("bar")
    done()
  }
)

runTest(
  "can parse call args on same line",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("zoom(1)")
    expect(segments.identifierIsh).to.equal("zoom")
    expect(segments.outro).to.equal("(")
    expect(segments.remainder).to.equal("1)")
    done()
  }
)

runTest(
  "can parse a string with remainder",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"hello\")(world)")
    expect(segments.middle).to.equal("hello")
    expect(segments.outro).to.equal("\"")
    expect(segments.remainder).to.equal(")(world)")
    done()
  }
)

runTest(
  "function literal symbol parses",
  ["./"],
  function(expect, done, parseALittle) {
    parseALittle("a")
    parseALittle("\"ap\"")
    parseALittle("\"appearedAWild(\"")
    parseALittle("b)")
    parseALittle("\"browser-bridge\")")
    parseALittle("f)")

    var segments = parseALittle("\"function \")")
    expect(segments.intro).to.equal("\"function")

    parseALittle("function s(){")
    parseALittle("b})")

    done()
  }
)

runTest(
  "method parses",
  ["./"],
  function(expect, done, parseALittle) {
    parseALittle("\"b(\"})")
    parseALittle("hi)})")

    var segments = parseALittle("do.dee.dum(")
    expect(segments.identifierIsh).to.equal("do.dee.dum")
    done()
  }
)

runTest(
  "function literal without closers parses",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"function \"")
    expect(segments.intro).to.equal("\"function")
    done()
  }
)

runTest(
  "function argument signatures parse",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("function foo(bar, baz){")
    expect(segments.argumentSignature).to.equal("bar, baz")
    done()
  }
)

runTest(
  "array parses",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("[\"web-element\", \"browser-bridge\"],")
    expect(segments.intro).to.equal("[")
    expect(segments.remainder).to.equal("\"web-element\", \"browser-bridge\"],")
    done()
  }
)

runTest(
  "no functions named function",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("function(){")
    expect(segments.intro).to.equal("function")
    done()
  }
)

runTest(
  "detectExpression can detect an expression",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("function(){\n  }")
    var literal = parseALittle.detectExpression(segments)
    expect(literal.kind).to.equal("function literal")
    done()
  }
)


runTest(
  "detectExpression tells you what's remaining to parse",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("hi}))}")
    debugger
    var literal = parseALittle.detectExpression(segments)
    expect(literal.remainder).to.equal("}))}")
    done()
  }
)

