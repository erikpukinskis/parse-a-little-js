var library = require("module-library")(require)

module.exports = library.export(
  "parse-a-little-js/detectExpression",
  function() {

    var CONTAINER_BREAKS = [")", "[", "]", "{", "}", ","]

    function joinRemainder(outros, remainder) {
      if (outros) {
        var joined = outros.join("")
      } else {
        var joined = ""
      }
      joined += remainder || ""

      return joined || undefined
    }

    function clone(array) {
      return array && array.concat([])
    }

    function detectExpression(segments) {

      if (!segments) {
        return {
          kind: "empty expression"
        }
      }

      if (contains(segments.intros, "var")) {
        var isDeclaration = true
      }
      var separators = segments.separators


      // key value

      if (contains(separators, ":")) {

        var rightHandSegments = {}

        var i = 0

        if (separators[i] == "\"") {
          keyCloseQuote = separators[i]
          i++
        }
        if (separators[i] != ":") {
          throw new Error("expected a colon there")
        }
        // The intros on the right hand side need to be all the separators to the right of the colon:
        var valueIntros = separators.slice(i+1)

        if (valueIntros.length > 0) {
          rightHandSegments.intros = valueIntros
        }

        rightHandSegments.secondHalf = segments.secondHalf
        rightHandSegments.outros = segments.outros
        rightHandSegments.remainder = segments.remainder

        var expression = detectExpression(rightHandSegments)

        expression.key = segments.firstHalf

        return expression
      }


      // container break

      if (segments.outros && !segments.secondHalf && segments.outros.length == 1 && contains(CONTAINER_BREAKS, segments.outros[0])) {

        var symbol = segments.outros[0]

        var expression = {
          kind: "container break",
          remainder: segments.remainder,
        }

        if (symbol == "[") {
          expression.kindToOpen = "array literal"
        } else if (symbol ==  "]") {
          expression.kindToClose = "array literal"
        } else if (symbol == "{") {
          expression.kindToOpen = "object literal"
        } else if (symbol == "}") {
          expression.kindToClose = "object literal or function literal"
        } else if (symbol == ",") {
          expression.kindToClose = "array item or key value or argument"
        } else if (symbol == ")") {
          expression.kindToClose = "function call"
        }

        return expression
      }


      // function literal

      if (contains(segments.intros, "function")) {
        var outros = clone(segments.outros)
        if (outros && outros[0] == ")") {
          outros.shift()
          if (outros[0] == "{") {
            outros.shift()
            if (outros[0] == "}") {
              outros.shift()
            }
          }
        }

        var remainder = joinRemainder(outros, segments.remainder) || undefined

        return {
          kind: "function literal",
          functionName: segments.firstHalf,
          argumentSignature: segments.secondHalf,
          remainder: remainder,
        }
      }


      // function call

      if (segments.outros && segments.outros[0] == "(") {

        outros = clone(segments.outros)
        outros.shift()

        if (segments.intros && segments.intros[0] == "\"" && outros[0] == "\"") {
          outros.shift()
        }

        var remainder = joinRemainder(outros, segments.remainder)

        return {
          kind: "function call",
          functionName: segments.secondHalf,
          leftHandSide: segments.firstHalf,
          isDeclaration: isDeclaration,
          remainder: remainder,
        }
      }


      // leaf expression

      var outros = clone(segments.outros)

      if (outros && outros[0] == "\"") {
        outros.shift()
      }
      var remainder = joinRemainder(outros, segments.remainder)


      return {
        kind: "leaf expression",
        leftHandSide: segments.firstHalf,
        string: segments.secondHalf,
        isDeclaration: isDeclaration,
        remainder: remainder,
      }
    }

    function contains(array, value) {
      if (typeof array == "undefined") {
        return false
      }
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

    return detectExpression
  })