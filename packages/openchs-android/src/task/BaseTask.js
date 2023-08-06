import GlobalContext from "../GlobalContext";
import AppStore from "../store/AppStore";
import RealmFactory from "../framework/db/RealmFactory";

export default class BaseTask {
    async initDependencies() {
        const globalContext = GlobalContext.getInstance();
        if (!globalContext.isInitialised())
            await globalContext.initialiseGlobalContext(AppStore, RealmFactory);
    }

    execute() {
        throw new Error("Execute method must be implemented by the scheduled task");
    }
}
