var library = require("module-library")(require)

module.exports = library.export(
  "parse-a-little-js",
  ["./detect-expression"],
  function(detectExpression) {

    var ZERO_WIDTH_SPACE = "\u200b"
    var QUOTE = "\""
    var VAR = "var"
    var FUNCTION = "function"
    var OPEN_PAREN = "("
    var CLOSE_PAREN = ")"
    var EQUALS = "="
    var COLON = ":"

    // Some things worth noting:

    // This parser doesn't really try to differentiate between right hand sides, in terms of whether it's a string or a reference. foo = "bar" and foo = bar are basically the same, they will both get spit out as a leaf expression with "bar" as the value. We're expecting to decide which of those things are references based on a semantic test (i.e. whether there is a function or a variable with that name in scope)

    // We DO decide whether we're looking at a function call, function name, variable assignments, etc, purely based on syntax. So bi bim bap( will be a string, but bi.bim.bap( will be recognized as a method call, regardless of semantics. And derp = foo will be recognized as an assignment, whereas dee dum = foo will not.


    // There are two major functions in here:

    // parseALittle(source) -> segments, which is looking for something of the form: [ intro symboles, possible string or identifier, posisble separator, string, identifier, or argument list, outro symbols, remainder]

    // detectExpression(segments) -> expression, which is identifying the core next available expression, figuring out which outro symbols are part of that, pulling out any identifiers, and decorating the expression with key string, remainder, etc

    function splitOutro(outro) {
      return outro.replace(" ", "").split("")      
    }

    function parseALittle(source, options) {
      source = source.trim().replace(/\s/g, " ")

      var expressionsOnly = options && options.expressionsOnly || false

      var instantiationMatch = source.match(/^\s*new (\w+)\((.*)$/)

      if (instantiationMatch) {
        return {
          intros: ["new"],
          "secondHalf": instantiationMatch[1],
          "remainder": instantiationMatch[2] || undefined
        }
      }

      if (commentMatch) {
        return {
          intros: ["//"],
          secondHalf: commentMatch[1]
        }
      }


      var commentMatch = source.match(/^\s*\/\/(.*)$/)

      if (commentMatch) {
        return {
          intros: ["//"],
          secondHalf: commentMatch[1]
        }
      }

      // Might need to do something with zero width spaces again:

      var emptyMatch = source.match(/^[\s\u200b]*"?[\s\u200b]*$/)

      if (emptyMatch) {
        return
      }

      // if (middle.match(/[^\u200b]/)) {
      //   middle = middle.replace(ZERO_WIDTH_SPACE, "")
      // }

      // console.log("matching "+source)

      var containerBreakMatch = source.match(/^[\)\[\]\{\}\,]/)

      if (containerBreakMatch) {
        return {
          outros: [source[0]],
          remainder: source.slice(1)||undefined}}

      // For description of [\,\)\[\]\{\} ]* search "all possible outro symbols"

      var functionLiteralMatch = source.match(/^(\"?)function *(\w*) *(\([\w, ]*\)?)?(\"?)([\,\)\[\]\{\} ]*)$/)

      if (expressionsOnly && functionLiteralMatch) {
        throw new Error("Need separate match for functions without a name, so we use the variableName or the key as the firstHalf")
      }

      if (functionLiteralMatch) {

        var openingQuote = functionLiteralMatch[1]
        var identifierIsh = functionLiteralMatch[2]
        var argumentSignature = functionLiteralMatch[3]
        var trailingQuote = functionLiteralMatch[4]
        var outroMatch = functionLiteralMatch[5]

        var intros = [FUNCTION]

        if (openingQuote) {
          intros.unshift(QUOTE)
        }

        if (identifierIsh) {
          var firstHalf = identifierIsh
        }

        if (argumentSignature) {
          var separators = [OPEN_PAREN]

          var argumentMatch = argumentSignature.match(/\(([^\)]*)(\)?)$/)
          
          if (argumentMatch[2]) {
            var outros = [CLOSE_PAREN]
          }

          if (argumentMatch[1]) {
            var secondHalf = argumentMatch[1]
          }
        }

        if (trailingQuote) {
          if (!outros) {
            var outros = []
          }
          outros.unshift(QUOTE)
        }

        if (outroMatch) {
          if (!outros) {
            var outros = []
          }
          outros = outros.concat(splitOutro(outroMatch))
        }

        return {
          intros: intros,
          firstHalf: firstHalf,
          separators: separators,
          secondHalf: secondHalf,
          outros: outros,
        }
      }

      // [\"\,\(\)\[\]\{\} ]* is the set of all possible outro symbols, which could follow an expression, like an array item. You need quote because the item itself could be a string. You need the comma in case it IS an item in an array or a function call argument. You need the brackets and braces because you could be opening or closing an array or object, and you need the space because style.

      var declarationAssignmentMatch = source.match(/^(\"?)var (\w+) *= *(.*)$/)

      // we don't want any assigments going into key values or other variable assignments
      if (declarationAssignmentMatch && !expressionsOnly) {
        if (declarationAssignmentMatch[1]) {
          var intros = [QUOTE, VAR]
        } else {
          var intros = [VAR]
        }

        var firstHalf = declarationAssignmentMatch[2]

        var remainder = declarationAssignmentMatch[3]

        if (remainder) {
          var rightHandSegments = parseALittle(remainder)

          var separators = [EQUALS].concat(rightHandSegments.intros||[], rightHandSegments.separators||[])

          return {
            intros: intros,
            firstHalf: firstHalf,
            separators: separators,
            secondHalf: rightHandSegments.secondHalf,
            outros: rightHandSegments.outros
          }

        } else {
          return {
            intros: intros,
            firstHalf: firstHalf,
            separators: [EQUALS],
          }
        }
      }

      // [\}\) ]* is an alternate set of outro symbols, the ones which can follow a statement, like a variable assignment or. Statement Following Outro Symbols.


      var assignmentMatch = source.match(/^(\"?)([\w]+) *= *([^"})]*)(\"?)([\}\) ]*)$/)

      // again, no assigments for key values or variable assignments right hand sides
      if (assignmentMatch && !expressionsOnly) {
        if (assignmentMatch[1]) {
          var intros = [QUOTE]
        }
        var firstHalf = assignmentMatch[2]
        var separators = [EQUALS]
        var secondHalf = assignmentMatch[3]
        if (assignmentMatch[5]) {
          var outros = splitOutro(assignmentMatch[5])
        }
        if (assignmentMatch[4]) {
          if (!outros) {
            var outros = []
          }
          outros.unshift(QUOTE)
        }

        return {
          intros: intros,
          firstHalf: firstHalf,
          separators: separators,
          secondHalf: secondHalf,
          outros: outros,
        }
      }

      var functionCallMatch = source.match(/^(\"?)([\w.]*)\((\"?)(.*)$/)

      if (functionCallMatch) {
        if (functionCallMatch[1] && functionCallMatch[3]) {
          var intros = [QUOTE]
          var outros = [OPEN_PAREN, QUOTE]
          var remainder = functionCallMatch[4] || undefined

        } else {
          var outros = [OPEN_PAREN]
          if (functionCallMatch[1]) {
            var intros = [QUOTE]
          }

          if (functionCallMatch[3]) {
            var remainder = functionCallMatch[3]+ functionCallMatch[4]

          } else {
            var remainder = functionCallMatch[4]
          }
        }

        var functionName = functionCallMatch[2]

        return {
          intros: intros,
          secondHalf: functionName,
          outros: outros,
          remainder: remainder || undefined,
        }
      }


      // key value

      // This uses all possible outro symbols, because the values could be any kind of expression
      var keyValueMatch = source.match(/("?)(.*)([ "]*):([ "]*)(.*)$/)

      if (keyValueMatch) {

        var key = keyValueMatch[2]
        var rightHandSide = keyValueMatch[5]
        var separators = [":"]

        if (keyValueMatch[1].trim() == "\"") {
          var intros = ["\""]
        }
        if (keyValueMatch[3].trim() == "\"") {
          separators.unshift("\"")
        }
        if (keyValueMatch[4].trim() == "\"") {
          separators.push("\"")
        }

        var segments = parseALittle(rightHandSide, {expressionsOnly: true})

        separators = separators.concat(segments.intros||[], segments.separators||[])

        if (segments.firstHalf) {
          throw new Error("got segments with a firstHalf even though we asked parseALittle for expressionsOnly")
        }

        segments.intros = intros
        segments.firstHalf = key
        segments.separators = separators

        return segments
      }

      // maybe quote, maybe space, identifier, maybe space, outro symbols and spaces, everything else
      var identifierMatch = source.match(/^(\"?)(\w+) *([\"\,\(\)\[\]\{\} ]*)$/)

      if (identifierMatch) {
        if (identifierMatch[1]) {
          var intros = ["\""]
        }
        if (identifierMatch[3]) {
          var outros = splitOutro(identifierMatch[3])
        }

        return {
          intros: intros,
          secondHalf: identifierMatch[2],
          outros: outros,
        }
      }

      var stringMatch = source.match(/^(\"?) *([^"\]]+) *([\"\,\(\)\[\]\{\} ]*)$/)

      if (stringMatch) {
        if (stringMatch[1]) {
          var intros = ["\""]
        }
        if (stringMatch[3]) {
          var outros = stringMatch[3].replace(" ", "").split("")
        }

        return {
          intros: intros,
          secondHalf: stringMatch[2],
          outros: outros,
        }        
      }

      var emptyStringMatch = source.match(/^\"( *)(\"[\,\(\)\[\]\{\} ]*)$/)

      if (emptyStringMatch) {
        return {
          intros: ["\""],
          string: emptyStringMatch[1],
          outros: splitOutro(emptyStringMatch[2]),
        }
      }


      throw new Error("Invalid EZJS: "+source)
    }

    parseALittle.detectExpression = detectExpression
    
    return parseALittle
  }
)

