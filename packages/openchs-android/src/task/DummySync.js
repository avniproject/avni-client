import BaseTask from "./BaseTask";

class DummySync extends BaseTask {
    async execute() {
        console.log("Performing Dummy no-op sync, as user triggered manual sync is already in-progress");
    }
}

export default new DummySync();