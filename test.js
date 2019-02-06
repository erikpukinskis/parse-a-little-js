var runTest = require("run-test")(require)



// add a test for assigning a function to a variable (I think assignment right now only works for identifiers?)

// add a test for assigning a function call as a key value (this might already work?)


runTest.library.define(
  "handle-line",
  ["./"],
  function(parseALittle) {
    var mute = false
    var stack
    handleLine.reset = function(newMute) {
      mute = newMute
      stack = []
    }

    function indent(depth) {
      return new Array(depth||0).fill("  ").join("")
    }

    function handleLine(line, lineNumber, _, depth) {
      var spc = indent(depth)
      var segments = parseALittle(line)
      var expression = parseALittle.detectExpression(segments)

      function log() {
        if (!mute) {
          console.log.apply(console, arguments)
        }
      }

      log("\n______________________\n"+line.trim(), "\n----------------------\n")
      if (expression.kind != "container break") {
        log(spc+"EXPR: ", JSON.stringify(expression))
      }
      // log(spc+"SEG:  ", segments ? JSON.stringify(segments) : "none")

      var kindThatIsOpen = stack[stack.length-1]

      if (expression.kind == "function call") {
        stack.push("function call")
        log(" ( ! ) pushed function call")
      } else if (expression.kind == "function literal") {
        stack.push("function literal")
        log(" ( ! ) pushed function literal")
      } else if (expression.kind == "container break") {
        if (expression.kindToOpen == "array literal") {
          stack.push("array literal")
          log(" ( ! ) pushed array literal")
        } else if (expression.kindToOpen == "object literal") {
          stack.push("object literal")
          log(" ( ! ) pushed object literal")
        } else if (expression.kindToClose == "array item or key value or argument") {

          if (kindThatIsOpen == "function call") {
            var item = "function call argument"
          } else if (kindThatIsOpen == "array literal") {
            var item = "array item"
          } else if (kindThatIsOpen == "object literal") {
            var item = "key value"
          }

          log(" ( ! ) next "+item)
        } else {
          if (!expression.kindToClose) {
            debugger
          }
          if (expression.kindToClose.match(kindThatIsOpen)) {
            stack.pop()
            log(" ( ! ) popped "+kindThatIsOpen)
          } else {
            throw new Error("expected to be closing "+expression.kindToClose+" but top of stack is "+kindThatIsOpen)
          }
        }
      }

      if (expression.remainder) {
        handleLine(expression.remainder, lineNumber, _, (depth||0)+1)
      }
    }

    return handleLine
  })

runTest(
  "good coverage of syntax",
  ["fs", "handle-line"],
  function(expect, done, fs, handleLine) {  
    fs.readFile(
      "examples/stylesheet.ez.js",
      "utf8",
      function(error, data) {
        var lines = data.split("\n")
        handleLine.reset(true)
        lines.forEach(handleLine)
        done()
      })
  })

runTest(
  "example site works",
  ["fs", "handle-line"],
  function(expect, done, fs, handleLine) {  
    fs.readFile(
      "examples/basic-site.ez.js",
      "utf8",
      function(error, data) {
        var lines = data.split("\n")
        handleLine.reset(true)
        lines.forEach(handleLine)
        done()
      })
  })

runTest(
  "object literals",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("foo({hi there: brad,")
    var call = parseALittle.detectExpression(segments)
    expect(call.remainder).to.equal("{hi there: brad,")
    done.ish("separate out object literal argument OK")

    segments = parseALittle("{hi there: brad,")
    expect(segments.outros).to.deep.equal(["{"])
    done.ish("parse object literal opener")

    var open = parseALittle.detectExpression(segments)
    expect(open.kind).to.equal("container break")
    expect(open.kindToOpen).to.equal("object literal")
    done.ish("detect object literal open")

    expect(open.remainder).to.equal("hi there: brad,")
    done.ish("separate key/value into remainder")

    segments = 
      parseALittle("hi there: brad,")
    expect(segments.separators).to.deep.equal([":"])
    done.ish("recognize : as a separator")

    var leaf = parseALittle.detectExpression(segments)

    expect(leaf.kind).to.equal("leaf expression")
    done.ish("recognize key value as leaf expression")

    expect(leaf.key).to.equal("hi there")
    done.ish("detect object key")
    expect(leaf.string).to.equal("brad")
    done.ish("detect key value")
    expect(leaf.remainder).to.equal(",")
    done.ish("comma after key value is remainder")

    done()
  })


runTest(
  "opening an array",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("[books are fun]")

    expect(segments.outros).to.deep.equal(["["])
    done.ish("peel off [ for opening an array")
    expect(segments.remainder).to.equal("books are fun]")

    var open = parseALittle.detectExpression(segments)

    expect(open.kind).to.equal("container break")
    done.ish("detect container break")
    expect(open.kindToOpen).to.equal("array literal")
    done.ish("detect kind that's opened by a container break")
    expect(open.kindToClose).to.be.undefined
    expect(open.remainder).to.equal("books are fun]")

    segments = parseALittle("books are fun]")
    var leaf = parseALittle.detectExpression(segments)

    expect(leaf.kind).to.equal("leaf expression")
    done.ish("detect leaf expression inside array")
    expect(leaf.string).to.equal("books are fun")
    done.ish("leaf inside array has string")
    expect(leaf.remainder).to.equal("]")

    segments = parseALittle(
        "]")
    var close = parseALittle.detectExpression(segments)

    expect(close.kind).to.equal("container break")
    done.ish("detect array close container break")
    expect(close.kindToClose).to.equal("array literal")

    done()
  })


runTest(
  "array in function call args",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("foo([1,")
    expect(segments.outros).to.deep.equal(["("])
    expect(segments.remainder).to.equal("[1,")
    done.ish("can parse function call with array open")

    var call = parseALittle.detectExpression(segments)

    expect(call.remainder).to.equal("[1,")

    segments = parseALittle("[1,")
    expect(segments.remainder).to.equal("1,")
    done.ish("can parse array open")

    segments = parseALittle("1,")
    expect(segments.secondHalf).to.equal("1")
    expect(segments.outros).to.deep.equal([","])
    done.ish("parse leaf with comma")

    var number = parseALittle.detectExpression(segments)
    expect(number.kind).to.equal("leaf expression")
    done.ish("detect leaf with comma")

    segments = parseALittle(",")
    var comma = parseALittle.detectExpression(segments)
    expect(comma.kind).to.equal("container break")
    expect(comma.kindToClose).to.equal("array item or key value or argument")
    done.ish("detect comma container break")

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
  "function( gets treated as a function literal, not a call",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("function(this, that, theOther) {")
    expect(segments.intros).to.deep.equal(["function"])
    expect(segments.separators).to.deep.equal(["("])
    expect(segments.secondHalf).to.equal("this, that, theOther")
    expect(segments.remainder).to.be.undefined
    done()
  }) 

runTest(
  "method call parses",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("do.dee.dum(")
    expect(segments.secondHalf).to.equal("do.dee.dum")
    done.ish("can match dots in identifiers")
    expect(segments.remainder).to.be.undefined
    expect(segments.outros).to.deep.equal(["("])

    segments = parseALittle(").blah")
    expect(segments.outros).to.deep.equal([")"])
    expect(segments.remainder).to.equal(".blah")

    var callBreak = parseALittle.detectExpression(segments)
    expect(callBreak.kind).to.equal("container break")
    expect(callBreak.kindToClose).to.equal("function call")

    done()
  }
)

runTest(
  "method calls on their own line",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle(".forResponse(blah)")
    expect(segments.secondHalf).to.equal(".forResponse")
    expect(segments.outros).to.deep.equal(["("])
    expect(segments.remainder).to.equal("blah)")

    var methodCall = parseALittle.detectExpression(segments)
    expect(methodCall.kind).to.equal("function call")
    expect(methodCall.functionName).to.equal(".forResponse")

    done()
  })

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
  "detect a function literal",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("function (){\n  }")
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
  "detect a function call",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("boo.blob(\"bar\")")
    var call = parseALittle.detectExpression(segments)
    expect(call.kind).to.equal("function call")
    done.ish("function call gets right kind")
    expect(call.functionName).to.equal("boo.blob")
    done.ish("detect function call name")
    expect(call.remainder).to.equal("\"bar\")")
    done.ish("detect function call remainder")

    done()
  }
)

runTest(
  "pull first quote out of the remainder if we seem to be in a quoted call",
  ["./"],
  function(expect, done, parseALittle) {
    var segments = parseALittle("\"boo.blob(\"baz,")
    var call = parseALittle.detectExpression(segments)
    expect(call.functionName).to.equal("boo.blob")
    expect(call.remainder).to.equal("baz,")

    done()
  }
)



