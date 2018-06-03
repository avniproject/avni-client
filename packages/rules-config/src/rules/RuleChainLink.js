export default class FormRuleChainLink {
    constructor(fn) {
        this.fn = fn || this.noop;
    }

    noop(nextLink, context) {
        return nextLink(context);
    }

    setNextLink(chainLink) {
        this.nextLink = chainLink;
    }

    run(context) {
        return this.nextLink ?
            this.fn(this.nextLink.run.bind(this.nextLink), context) :
            this.fn(() => context, context);
    }
}