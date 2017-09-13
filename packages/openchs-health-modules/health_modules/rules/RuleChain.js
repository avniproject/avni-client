import FormRuleChainLink from "./RuleChainLink";

export default class FormRuleChain {
    constructor() {
        this.head = new FormRuleChainLink();
        this.tail = this.head;
    }

    /**
     * A function passed here should be of type (next, context) {...}
     *
     * The function has the responsibility of calling the next function with the given context
     * or a modified context if the chain needs to proceed. It can manipulate context before
     * and after the call as it sees fit.
     *
     * eg: A simple _noop chain link being added -
     * new FormRuleChain.add((next, context) => next(context));
     *
     * eg: Short circuit of the chain
     * new FormRuleChain.add((next, context) => context);
     *
     * @param fn
     */
    add(fn) {
        let newLink = new FormRuleChainLink(fn);
        this.tail.setNextLink(newLink);
        this.tail = newLink;
    }

    execute(initialContext) {
        return this.head.run(initialContext);
    }
}