import General from "../utility/General";

// Services that read the database in init() and keep what they read: translations, the
// shared rules bundle, and the rule functions built on both. Moving the bean registry to
// another database (BeanRegistry.updateDatabase) does not rerun init(), so whatever moves
// the runtime, or rewrites the database it is on, reloads these or they keep serving the
// old data (#2196). Order matters: RuleEvaluationService and RuleService read from
// MessageService, as sync has always reloaded them.
export const CACHED_SERVICES = ['ruleEvaluationService', 'messageService', 'ruleService'];

// Every service is tried, so one failure cannot leave the rest on the old database.
// Returns the failures for the caller to decide on: sync rethrows, launch carries on.
export function reloadCachedServices(getService) {
    const failures = [];
    CACHED_SERVICES.forEach(name => {
        try {
            getService(name).init();
        } catch (e) {
            General.logError("CachedServices", `Reloading ${name} failed: ${e.message}`);
            failures.push(e);
        }
    });
    return failures;
}
