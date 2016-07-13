import BootstrapRegistry from "./BootstrapRegistry";

export default function Bootstrap() {
    return (task) => {
        BootstrapRegistry.register(task);
    };
}