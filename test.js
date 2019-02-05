var runTest = require("run-test")(require)


// runTest.only("detect simple assignment")

runTest(
  "opening an array",
  ["./"],
  function(expect, done, parseALittle) {

    var segments = parseALittle("[books are fun]")

    expect(segments.outro).to.equal("[")
    expect(segments.remainder).to.equal("books are fun]")

    done()
  })

runTest(
  "leading whitespace",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("  hi")
    expect(segments.secondHalf).to.equal("hi")
    done()
  }
)

runTest(
  "array opener at the end of line",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"laugh\",[")
    expect(segments.secondHalf).to.equal("laugh")
    done.ish("parse out string second half")
    expect(segments.intros).to.deep.equal(["\""])
    done.ish("parse out quote intro")
    expect(segments.outros).to.deep.equal(["\"", ",", "["])
    done.ish("array opener goes in outros")
    expect(segments.remainder).to.be.undefined
    done()
  }
)


runTest(
  "quotes parse",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"browser-bridge\"")
    expect(segments.outros).to.deep.equal(["\""])
    done()
  }
)


runTest(
  "quotes parse",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"browser-bridge\"")
    expect(segments.outros).to.deep.equal(["\""])
    done()
  }
)

runTest(
  "variable declaration parses",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"var foo = bar\"")
    expect(segments.intros).to.deep.equal(["\"", "var"])
    done.ish("parses out var intro")
    expect(segments.firstHalf).to.equal("foo")
    expect(segments.separators).to.deep.equal(["="])
    expect(segments.secondHalf).to.equal("bar")
    done()
  }
)

runTest(
  "variable assignment parses",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("foo = bar")
    expect(segments.firstHalf).to.equal("foo")
    done.ish("parse out variable assignment name")
    expect(segments.separators).to.deep.equal(["="])

    done()
  })

runTest(
  "variable assignment works with quotes",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"foo = bar\"")
    expect(segments.firstHalf).to.equal("foo")
    expect(segments.intros).to.deep.equal(["\""])
    expect(segments.outros).to.deep.equal(["\""])
    expect(segments.separators).to.deep.equal(["="])

    done()
  })

runTest(
  "can parse call args on same line",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("zoom(1)")
    expect(segments.secondHalf).to.equal("zoom")
    expect(segments.outros).to.deep.equal(["("])
    expect(segments.remainder).to.equal("1)")
    done()
  }
)

// runTest(
//   "can parse a string with remainder",
//   ["./"],
//   function(expect, done, parseALittle) {
//     var segments = parseALittle("\"hello\")(world)")
//     expect(segments.middle).to.equal("hello")
//     expect(segments.outro).to.equal("\"")
//     expect(segments.remainder).to.equal(")(world)")
//     done()
//   }
// )

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
    expect(segments.intros).to.deep.equal(["\"", "function"])

    parseALittle("function s(){")
    parseALittle("b})")

    done()
  }
)

runTest(
  "method call parses",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("do.dee.dum(")
    expect(segments.secondHalf).to.equal("do.dee.dum")
    done.ish("can match dots in identifiers")
    expect(segments.remainder).to.be.undefined
    expect(segments.outros).to.deep.equal(["("])

    done()
  }
)

runTest(
  "function literal without closers parses",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"function \"")
    expect(segments.intros).to.deep.equal(["\"", "function"])
    done()
  }
)

runTest(
  "function literal opening",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("function foo(bar, baz){")
    expect(segments.secondHalf).to.equal("bar, baz")
    done.ish("argument signature parses out")
    expect(segments.separators).to.deep.equal(["("])
    done.ish(") is treated as the separator")
    expect(segments.outros).to.deep.equal([")","{"])
    done.ish("argument closer and body opener are in the outro")
    expect(segments.remainder).to.be.undefined
    done.ish("no remainder on a basic function literal open")
    done()
  }
)

// runTest(
//   "array parses",
//   ["./"],
//   function(expect, done, parseALittle) {
//     var segments = parseALittle("[\"web-element\", \"browser-bridge\"],")
//     expect(segments.intro).to.equal("[")
//     expect(segments.remainder).to.equal("\"web-element\", \"browser-bridge\"],")
//     done()
//   }
// )

// runTest(
//   "no functions named function",
//   ["./"],
//   function(expect, done, parseALittle) {
//     var segments = parseALittle("function(){")
//     expect(segments.intros).to.deep.equal(["function"])
//     expect(segments.identifierIsh).to.be.undefined
//     done()
//   }
// )







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

    debugger
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
  "detect a function literal",
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


// runTest(
//   "detects call remainders even if there's no arguments",
//   ["./"],
//   function(expect, done, parseALittle) {
//     var segments = parseALittle("a.b()")
//     var literal = parseALittle.detectExpression(segments)
//     expect(literal.remainder).to.equal(")")
//     done()
//   }
// )


