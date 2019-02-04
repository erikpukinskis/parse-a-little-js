var library = require("module-library")(require)

module.exports = library.export(
  "parse-a-little-js",
  function() {

    var ZERO_WIDTH_SPACE = "\u200b"


    // There are two major functions in here:

    // parseALittle(source) -> segments, which is looking for something of the form: [ intro symboles, possible string or identifier, posisble separator, string, identifier, or argument list, outro symbols, remainder]

    // detectExpression(segments) -> expression, which is identifying the core next available expression, figuring out which outro symbols are part of that, pulling out any identifiers, and decorating the expression with key string, remainder, etc

    var parseALittle = parseWithoutRegexes

    function isWhitespace(character) {
      return !!character.match(/\s/)
    }

    var CONTAINER_BREAKS = "][}{".split("")

    function breaksContainer(character) {
      return contains(CONTAINER_BREAKS, character)
    }

    function isIdentifierSafe(character) {
      return !!character.match(/\w/)
    }

    var OUTROS = ["\"", "]", "[", "}", "{", "(", "}", ","]

    function isOutroSafe(character) {
      return contains(OUTROS, character)
    }

    var TEXT_INTROS = ["var ", "function(", "function "]
    var QUOTE = "\""

    function grabIntros(string, startingAt) {
      var hasQuote = string[startingAt] == "\""
      var intros

      if (hasQuote) {
        intros = [QUOTE]
      }

      TEXT_INTROS.find(function(intro) {
        if (hasQuote) {
          var startIntroAt = startingAt + 1
        } else {
          var startIntroAt = startingAt
        }

        var doesMatch = string.slice(startIntroAt, intro.length) == intro        

        debugger
        if (doesMatch) {
          var textIntro = intro.slice(0, intro.length - 1)

          if (typeof intros == "undefined") {
            intros = []
          }
          intros.push(textIntro)

          return true
        }
      })

      return intros
    }

    function parseWithoutRegexes(source) {
      var didStart = false
      var identifierIsh
      var intros
      var outros

      for(var i=0; i<source.length; i++) {
        var character = source[i]

        if (isWhitespace(character)) {
          continue
        }

        if (!intros && !identifierIsh &&breaksContainer(character)) {
          return {
            outro: character,
            remainder: source.slice(1)
          }
        }

        if (!intros && !identifierIsh && !outros) {
          intros = grabIntros(source, i)

          if (intros) {
            var introsLength = intros.join("").length
            i += introsLength - 1
            // If we got a text intro, we need to skip ahead a bit. But i will be incremented in the for loop, so we want to stop just short of that
            continue
          }
        }

        if (isIdentifierSafe(character)) {
          if (typeof identifierIsh == "undefined") {
            identifierIsh = ""
          }
          identifierIsh += character
          continue 
        }

        if (isOutroSafe(character)) {

          if (typeof outros == "undefined") {
            outros = []
          }
          outros.push(character)
          continue
        }

        debugger
      }

      var segments = {
        secondHalf: identifierIsh,
        intros: intros,
        outros: outros
      }

      return segments
    }

    function contains(array, value) {
      if (!Array.isArray(array)) {
        throw new Error("looking for "+JSON.stringify(value)+" in "+JSON.stringify(array)+", which is supposed to be an array. But it's not.")
      }
      var index = -1;
      var length = array.length;
      while (++index < length) {
        if (array[index] == value) {
          return true;
        }
      }
      return false;
    }

    function parseALittleOld(source) {

      var emptyMatch = source.match(/^[\s\u200b]*"?[\s\u200b]*$/)

      if (emptyMatch) {
        return {
          source: source,
          hasNone: true
        }
      }

      if (containerSymbolsInIntro = source.match(/^\s*"?([\]\[\}\{\)]+)/)) {

        var symbols = containerSymbolsInIntro[1]
        return {
          outro: symbols.slice(0,1),
          remainder: source.slice(1)
        }
      }

      var introMatch = source.match(/^(\s*"?function\b|\s*"?var\s|\s*\[|\s*")/) || source.match(/^"/)
      var outroMatch = source.match(/(\s*"?function\s?|\s*"?var\s|\s*\[|\s*")?(.*?)([\[\]}{(),"\]]*)$/)
      var intro = introMatch && introMatch[0].trim()
      var middle = outroMatch[2]
      var outro = outroMatch[3]

      if (middle.match(/[^\u200b]/)) {
        middle = middle.replace(ZERO_WIDTH_SPACE, "")
      }

      debugger

      if (middle) {
        var functionLiteralMatch
        var identifierMatch
        var separatedMatch
        var callMatch
        var stringCloseMatch

        if (functionLiteralMatch = intro == "function" && middle.match(/^\s*(\w*)\s*\(\s*((\w*)\s*(,\s*\w+\s*)*)/)) {

          var identifierIsh = functionLiteralMatch[1]
          var argumentSignature = functionLiteralMatch[2]
          var separator = "("

        } else if (identifierMatch = middle.match(/^\s*([\.\w]+)\s*$/)) {

          var identifierIsh = identifierMatch[1]
          if (outro[0] == "(" && outro.length > 1) {
            var remainder = outro.slice(1)
            outro = "("
          } else if (outro[0] != "(") {
            var remainder = outro
            outro = null
          }

        } else if (separatedMatch = middle.match(/^(.+)\s*\s([=:])\s\s*(.+)$/)) {

          var identifierIsh = separatedMatch[1]
          var separator = separatedMatch[2]
          var notIdentifier = separatedMatch[3]
          outro = undefined

        } else if (callMatch = middle.match(/^(\w+)[(](.*)$/)) {

          var identifierIsh = callMatch[1]
          var remainder = [callMatch[2], outro].join("")
          outro = "("

        } else if (stringCloseMatch = intro == "\"" && middle.match(/^(.*)"(.*)$/)) {

          var middle = stringCloseMatch[1]
          var remainder = [stringCloseMatch[2], outro].join("")
          outro = "\""

        } else {
          var notIdentifier = middle
        }
      }

      if (intro) {
        if (intro.match(/function/)) {
          var introType = "function"
        } else if (intro.match(/var/)) {
          var introType = "var"
        } else if (intro.match(/"/)) {
          var introType = "quote"
        }
      }

      var segments = {
        source: source,
        hasNone: false,
        intro: intro,
        introType: introType,
        outro: outro,
        middle: middle,
        separator: separator,
        identifierIsh: identifierIsh,
        notIdentifier: notIdentifier,
        argumentSignature: argumentSignature,
        remainder: remainder,
      }

      var expectIdentifier = introType == "var"

      if (expectIdentifier && segments.notIdentifier && !separator) {
        throw new Error("\nthere's probably an identifier in here: "+segments.notIdentifier)
      }

      return segments
    }

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

    function detectCloser(segments) {
      if (segments.middle || segments.intro || !segments.outro) {
        return
      }
      var closer = segments.outro[0]
      return {
        "}": "function literal",
        ")": "function call",
        ",": "argument",
        "]": "array literal",
      }[closer]
    }

    parseALittle.detectExpression = detectExpression

    parseALittle.detectCloser = detectCloser
    
    return parseALittle
  }
)

