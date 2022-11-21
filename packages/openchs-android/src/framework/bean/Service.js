import GlobalContext from "../../GlobalContext";

export default function Service(name) {
    return (service) => {
        GlobalContext.getInstance().beanRegistry.register(name, service);
    };
}
