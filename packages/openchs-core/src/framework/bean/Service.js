import BeanRegistry from "./BeanRegistry.js";

export default function Service(name) {
    return (service) => {
        BeanRegistry.register(name, service);
    };
}