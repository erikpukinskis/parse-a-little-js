var library = require("module-library")(require)

module.exports = library.export(
  "parse-a-little-js",
  function() {

    var ZERO_WIDTH_SPACE = "\u200b"


    // There are two major functions in here:

    // parseALittle(source) -> segments, which is looking for something of the form: [ intro symboles, possible string or identifier, posisble separator, string, identifier, or argument list, outro symbols, remainder]

    // detectExpression(segments) -> expression, which is identifying the core next available expression, figuring out which outro symbols are part of that, pulling out any identifiers, and decorating the expression with key string, remainder, etc

    var parseALittle = parseAllAtOnce

    function splitOutro(outro) {
      return outro.replace(" ", "").split("")      
    }

    function parseAllAtOnce(source) {
      source = source.trim().replace(/\s+/g, " ")

      console.log("matching "+source)
      debugger
      var containerBreakMatch = source.match(/^[\[\]\{\}]/)

      if (containerBreakMatch) {
        return {
          outro: source[0],
          remainder: source.slice(1)}}

      var functionLiteralMatch = source.match(/^(\"?)function (\w*) ?(\([\w, ]*\)?)?(\"?)([\,\)\[\]\{\} ]*)$/)

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
          
          debugger
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

      var declarationAssignmentMatch = source.match(/^(\"?)var (\w+) ?= ?(\"?)(\w+)([\"\,\(\)\[\]\{\} ]*)$/)

      if (declarationAssignmentMatch) {
        if (declarationAssignmentMatch[1]) {
          var intros = [QUOTE]
        }
        intros.push(VAR)
        debugger
        var firstHalf = declarationAssignmentMatch[2]
        var secondHalf = declarationAssignmentMatch[4]
        var separators = [EQUALS]

        if (declarationAssignmentMatch[3]) {
          separators.push(QUOTE)
        }

        if (declarationAssignmentMatch[5]) {
          var outros = splitOutro(declarationAssignmentMatch[5])
        }

        return {
          intros: intros,
          firstHalf: firstHalf,
          separators: separators,
          secondHalf: secondHalf,
          outros: outros,
        }
      }

      var functionCallMatch = source.match(/^(\"?)([\w]+[\w.]*)\((\"?)(.*)$/)

      debugger

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

        debugger

        return {
          intros: intros,
          secondHalf: functionName,
          outros: outros,
          remainder: remainder || undefined,
        }
      }
      // maybe quote, maybe space, identifier, maybe space, outro symbols and spaces, everything else
      var identifierMatch = source.match(/^(\"?)(\w+) ?([\"\,\(\)\[\]\{\} ]*)$/)

      debugger
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

      var stringMatch = source.match(/^(\"?) *([^"]+) *([\"\,\(\)\[\]\{\} ]*)$/)

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

      throw new Error("impl")
    }

    var QUOTE = "\""
    var VAR = "var"
    var FUNCTION = "function"
    var OPEN_PAREN = "("
    var CLOSE_PAREN = ")"
    var EQUALS = "="
    var COLON = ":"

    function detectExpression(segments) {

      var expression = {
        remainder: segments.remainder
      }

      var outro = segments.outro && segments.outro.split("") || []

      if (segments.introType == "function") {
        var isFunctionLiteral = true
      } else if (segments.outro && !!segments.outro.match(/^\([^{]*$/)) {
        var isFunctionCall = true
      } else if (segments.identifierIsh || segments.notIdentifier) {
        var isLeafExpression = true
      } else {
        return
      }

      if (isFunctionLiteral) {
        expression.kind = "function literal"
        expression.functionName = segments.identifierIsh

        if (segments.argumentSignature) {
          expression.argumentNames = segments.argumentSignature.split(/\s*,\s*/)
        }

      } else if (isFunctionCall) {
        expression.kind = "function call"

        if (segments.separator) {
          expression.functionName = segments.notIdentifier
          expression.leftHandSide = segments.identifierIsh

        } else {
          expression.functionName = segments.identifierIsh
        }

      } else if (isLeafExpression) {
        expression.kind = "leaf expression"
        if (segments.separator == "=") {
          expression.leftHandSide = segments.identifierIsh
          expression.string = segments.notIdentifier
          expression.isDeclaration = segments.intro == "var"
        } else {
          expression.string = segments.middle
        }

        if (outro[0] == "\"") {
          outro = outro.slice(1)
        }

        expression.remainder = outro.join("")+(segments.remainder||"")
      }


      return expression
    }

    parseALittle.detectExpression = detectExpression
    
    return parseALittle
  }
)

