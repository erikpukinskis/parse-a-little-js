var runTest = require("run-test")(require)





// parseALittleJs


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
    expect(segments.identifierIsh).to.be.undefined
    done()
  }
)







// detectExpression


runTest(
  "detect identifiers",
  ["./"],
  function(expect, done, parseALittleJs) {
    var segments = parseALittleJs("bar")
    var expression = parseALittleJs.detectExpression(segments)

    expect(expression.kind).to.equal("leaf expression")
    expect(expression.string).to.equal("bar")

    done()
  }
)

runTest(
  "detect simple assignment",
  ["./"],
  function(expect, done, parseALittleJs) {

    var segments = parseALittleJs("foo = bar")
    var expression = parseALittleJs.detectExpression(segments)

    expect(expression.kind).to.equal("leaf expression")
    expect(expression.string).to.equal("bar")
    expect(expression.leftHandSide).to.equal("foo")
    expect(expression.isDeclaration).not.to.be.true

    done()
  }
)


runTest(
  "tell the difference between simple assignment and a variable declaration",
  ["./"],
  function(expect, done, parseALittleJs) {

    var segments = parseALittleJs("var foo = bar")
    var expression = parseALittleJs.detectExpression(segments)

    expect(expression.isDeclaration).to.be.true

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
    var literal = parseALittle.detectExpression(segments)
    expect(literal.remainder).to.equal("}))}")
    done()
  }
)


runTest(
  "detects call remainders even if there's no arguments",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("a.b()")
    var literal = parseALittle.detectExpression(segments)
    expect(literal.remainder).to.equal(")")
    done()
  }
)

runTest(
  "when detectExpression fails, we can get a closer",
  ["./"],
  function(expect, done, parseALittle) {
    var source = "doSomething(withThis)"
    var segments = parseALittle(source)

    var call = parseALittle.detectExpression(segments)

    expect(call.remainder).to.equal("withThis)")

    var reference = parseALittle.detectExpression(parseALittle(call.remainder))

    expect(reference.remainder).to.equal(")")

    var closer = parseALittle(reference.remainder)

    expect(parseALittle.detectExpression(closer)).to.be.undefined

    expect(parseALittle.detectCloser(closer)).to.equal("function call")

    done()
  }
)

runTest(
  "detect function literal closers",
  ["./"],
  function(expect, done, parseALittle) {
    expect(parseALittle.detectCloser({outro: "}"})).to.equal("function literal")
    done()
  }
)

runTest(
  "detect array literal closers",
  ["./"],
  function(expect, done, parseALittle) {
    expect(parseALittle.detectCloser({ outro: "]"})).to.equal("array literal")
    done()
  }
)


runTest(
  "detect argument closers",
  ["./"],
  function(expect, done, parseALittle) {
    expect(parseALittle.detectCloser({outro: ","})).to.equal("argument")
    done()
  }
)

