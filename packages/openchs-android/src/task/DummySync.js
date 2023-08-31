import BaseTask from "./BaseTask";
import General from "../utility/General";

class DummySync extends BaseTask {
    async execute() {
        General.logDebug("DummySync", "Performing Dummy no-op sync, as user triggered manual sync is already in-progress");
    }
}

export default new DummySync();