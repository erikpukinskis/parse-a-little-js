var library = require("module-library")(require)

module.exports = library.export(
  "parse-a-little-js",
  function() {

    var ZERO_WIDTH_SPACE = "\u200b"

    function parseALittle(source) {
      var introMatch = source.match(/^(\s*"?function\b|\s*"?var\s|\s*\[|\s*")/) || source.match(/^"/)
      var outroMatch = source.match(/(\s*"?function\s|\s*"?var\s|\s*\[|\s*")?(.*?)([\[\]}{(),"\]]*)$/)
      var intro = introMatch && introMatch[0].trim()
      var middle = outroMatch[2]
      var outro = outroMatch[3]

      if (middle.match(/[^\u200b]/)) {
        middle = middle.replace(ZERO_WIDTH_SPACE, "")
      }

      if (middle) {
        var arrayMatch = intro == "["

        var functionLiteralMatch = !arrayMatch && intro == "function" && middle.match(/^\s*(\w*)\s*\(\s*((\w*)\s*(,\s*\w+\s*)*)/)

        debugger

        var identifierMatch = !functionLiteralMatch && middle.match(/^\s*([\.\w]+)\s*$/)

        var separatedMatch = !identifierMatch && middle.match(/^(.+)\s*\s([=:])\s\s*(.+)$/)

        var callMatch = !separatedMatch && middle.match(/^(\w+)[(](.*)$/)

        var stringCloseMatch = !callMatch && intro == "\"" && middle.match(/^(.*)"(.*)$/)

        if (arrayMatch) {
          var remainder = [middle, outro].join("")
          outro = undefined

        } else if (functionLiteralMatch) {
          var identifierIsh = functionLiteralMatch[1]
          var argumentSignature = functionLiteralMatch[2]

        } else if (identifierMatch) {
          var identifierIsh = identifierMatch[1]

        } else if (separatedMatch) {
          var identifierIsh = separatedMatch[1]
          var separator = separatedMatch[2]
          var notIdentifier = separatedMatch[3]
          outro = undefined

        } else if (callMatch) {
          var identifierIsh = callMatch[1]
          var remainder = [callMatch[2], outro].join("")
          outro = "("

        } else if (stringCloseMatch) {
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

    function detectExpression(text, forRightHandSide) {


      var segments = this.parse(text)

      var expression = {
        remainder: segments.remainder
      }

      var outro = segments.outro && segments.outro.split("") || []

      var isFunctionLiteral = segments.introType == "function"

      var isFunctionCall = !isFunctionLiteral && segments.outro && !!segments.outro.match(/^\([^{]*$/)

      var isVariableAssignment = !isFunctionCall && segments.introType == "var"

      var isStringLiteral = !isVariableAssignment

      if (isVariableAssignment && forRightHandSide) {
        expression.kind = "string literal"
        expression.string = segments.middle

      } else if (isFunctionLiteral) {
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

      } else if (isVariableAssignment) {
        var remainder = [segments.notIdentifier, segments.outro].join("")
        expression = this.detectExpression(remainder, true)
        expression.leftHandSide = segments.identifierIsh
        expression.isDeclaration = true

      } else if (isStringLiteral) {
        expression.kind = "string literal"
        expression.string = segments.middle
      }


      return expression
    }

    parseALittle.detectExpression = detectExpression
    
    return parseALittle
  }
)

