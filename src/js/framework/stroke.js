import {
    ask,
    lessThan,
    lessThanAndGreaterThan,
    greaterThan,
    Yes,
    No,
    end,
    stringComparison,
    numeric,
    options,
    when
} from './DSL.js'

var howFast = ask("How fast do you run?", when(options({
    "Pretty Fast": [stringComparison("Pretty Fast"), end],
    "Not that fast": [stringComparison("Not that fast"), end]
})));

var ageRange = ask('How old are you?', when(numeric([
    [lessThan(20), end],
    [lessThanAndGreaterThan(60, 20), howFast],
    [greaterThan(60), end]])));

var stroke = ask('Do you feel any weakness?', when(options({
        "Yes": [Yes, ageRange],
        "No": [No, howFast]
    }
)));

export default stroke;