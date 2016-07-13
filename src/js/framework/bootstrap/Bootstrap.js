import BootstrapRegistry from "./BootstrapRegistry";

export default function Bootstrap(taskName) {
    return (task) => {
        console.log(task.constructor.name);
        console.log(task);
        console.log(taskName);
        BootstrapRegistry.register(task.constructor.name, task);
    };
}