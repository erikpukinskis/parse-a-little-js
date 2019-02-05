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

    function isWhitespace(character) {
      return !!character.match(/\s/)
    }

    var CONTAINER_BREAKS = "][}{".split("")

    function breaksContainer(character) {
      return contains(CONTAINER_BREAKS, character)
    }

    function isIdentifierSafe(character) {
      return !!character.match(/[\w\.]/)
    }

    var OUTROS = ["\"", "]", "[", "}", "{", "(", "}", ","]

    function isOutroSafe(character) {
      return contains(OUTROS, character)
    }

    var TEXT_INTROS = [
      /^var\s/,
      /^function\(/,
      /^function\s/]

    var QUOTE = "\""
    var VAR = "var"
    var FUNCTION = "function"

    function grabIntros(string, startingAt) {
      var hasQuote = string[startingAt] == "\""
      var intros

      if (hasQuote) {
        intros = [QUOTE]
      }

      TEXT_INTROS.find(function(textIntroPattern) {
        if (hasQuote) {
          var startIntroAt = startingAt + 1
        } else {
          var startIntroAt = startingAt
        }

        var possibleTextIntro = string.slice(startIntroAt)

        var textIntroMatch = possibleTextIntro.match(textIntroPattern)

        if (textIntroMatch) {
          var textIntro = textIntroMatch[0]
          textIntro = textIntroMatch[0].slice(0, textIntroMatch[0].length - 1)

          if (typeof intros == "undefined") {
            intros = []
          }

          intros.push(textIntro)

          return true
        }
      })

      return intros
    }

    var EQUALS = "="
    var COLON = ":"

    function isSeparator(character, previousSeparators) {

      if (isWhitespace(character)) {
        return null
      }

      var i = 0

      var closingQuote = previousSeparators && previousSeparators[i] == QUOTE

      if (closingQuote) {
        i++
      }

      if (previousSeparators && (previousSeparators[i] == EQUALS || previousSeparators[i] == COLON)) {
        var separator = previousSeparators[i]
        i++
      }

      if (previousSeparators && previousSeparators[i] == QUOTE) {
        var openingQuote = QUOTE
      }

      if (!closingQuote && !separator && character == QUOTE) {
        return QUOTE
      }

      if (!separator && character == COLON) {
        return COLON
      }

      if (!separator && !closingQuote && character == EQUALS) {
        return EQUALS
      }

      if (separator && !openingQuote &&character == QUOTE) {
        return QUOTE
      }

      return false
    }

    function parseWithoutRegexes(source) {
      var didStart = false
      var identifierIsh
      var intros
      var outros
      var firstHalf
      var secondHalf
      var separators
      var finishedSeparators = false
      var remainder

      for(var i=0; i<source.length; i++) {
        var character = source[i]

        if (isWhitespace(character)) {
          continue
        }

        // console.log("LOOKING AT "+character+" IN "+source)
        // debugger

        if (remainder) {
          remainder += character
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

        if (isOutroSafe(character)) {

          if (typeof outros == "undefined") {
            outros = []
          }
          outros.push(character)
          continue
        }

        // if we've already seen some outros and we see anything other than outros or whitespace, we're in the remainder

        if (outros) {
          var remainder = character
          continue
        }

        if (isIdentifierSafe(character) && separators) {
          if (!firstHalf) {
            firstHalf = identifierIsh
          }
          if (!secondHalf) {
            secondHalf = ""
          }
          secondHalf += character
          continue
        }

        if (isIdentifierSafe(character) && !separators) {
          if (typeof identifierIsh == "undefined") {
            identifierIsh = ""
          }
          identifierIsh += character
          continue 
        }

        if (!finishedSeparators) {
          var grabbedSeparator = isSeparator(character, separators)

          if (separators && grabbedSeparator == null) {
            continue
          }

          if (grabbedSeparator) {
            if (!separators) {
              separators = []
            }
            separators.push(grabbedSeparator)
            continue
          }

          if (grabbedSeparator == false) {
            if (separators && !finishedSeparators)  {
              finishedSeparators = true
            }
          }
        }

      } // done with character loop

      var segments = {
        source: source,
        intros: intros,
        outros: outros,
        separators: separators,
        firstHalf: firstHalf,
        secondHalf: secondHalf,
        remainder: remainder,
      }

      if (!separators) {
        segments.secondHalf = identifierIsh
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

