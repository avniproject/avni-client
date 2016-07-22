import BootstrapRegistry from "./BootstrapRegistry";

export default function Bootstrap(taskName) {
    return (task) => {
        BootstrapRegistry.register(taskName, task);
    };
}