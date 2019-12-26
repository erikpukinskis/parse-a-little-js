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

      if (contains(segments.intros, "function")) {

        // function literal

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

      // Function calls, container breaks, and leaf expressions can all have left hand sides, so we generate an expression for each of those kinds and then add the variable assignment info on at at the end:

      if (segments.outros && !segments.secondHalf && segments.outros.length == 1 && contains(CONTAINER_BREAKS, segments.outros[0])) {

        // container break

        var symbol = segments.outros[0]

        var expression = {
          kind: "container break",
        }
        var remainder = segments.remainder

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

      } else if (segments.outros && segments.outros[0] == "(") {

        // function call

        outros = clone(segments.outros)
        outros.shift()

        if (segments.intros && segments.intros[0] == "\"" && outros[0] == "\"") {
          outros.shift()
        }

        var remainder = joinRemainder(outros, segments.remainder)

        var expression = {
          kind: "function call",
          functionName: segments.secondHalf,
        }

      } else {

        // leaf expression

        var outros = clone(segments.outros)

        if (outros && outros[0] == "\"") {
          outros.shift()
        }
        var remainder = joinRemainder(outros, segments.remainder)


        var expression = {
          kind: "leaf expression",
          string: segments.secondHalf,
        }
      }


      expression.leftHandSide = segments.firstHalf
      expression.isDeclaration = isDeclaration
      expression.remainder = remainder

      return expression
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