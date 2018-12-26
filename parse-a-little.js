var library = require("module-library")(require)

module.exports = library.export(
  "parse-a-little-js",
  function() {

    var ZERO_WIDTH_SPACE = "\u200b"

    function parseALittle(source) {

      var emptyMatch = source.match(/^[\s\u200b]*"?[\s\u200b]*$/)

      if (emptyMatch) {
        return {
          source: source,
          hasNone: true
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

      if (middle) {
        var functionLiteralMatch
        var identifierMatch
        var separatedMatch
        var callMatch
        var stringCloseMatch

        if (intro == "[") {

          var remainder = [middle, outro].join("")
          outro = undefined

        } else if (functionLiteralMatch = intro == "function" && middle.match(/^\s*(\w*)\s*\(\s*((\w*)\s*(,\s*\w+\s*)*)/)) {

          var identifierIsh = functionLiteralMatch[1]
          var argumentSignature = functionLiteralMatch[2]

        } else if (identifierMatch = middle.match(/^\s*([\.\w]+)\s*$/)) {

          var identifierIsh = identifierMatch[1]
          if (outro[0] == "(" && outro.length > 1) {
            var remainder = outro.slice(1)
            outro = "("
          } else {
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

