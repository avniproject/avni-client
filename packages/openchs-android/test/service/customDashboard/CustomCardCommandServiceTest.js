import CustomCardCommandService, {COMMANDS} from "../../../src/service/customDashboard/CustomCardCommandService";

describe("CustomCardCommandService", () => {
    const service = new CustomCardCommandService({}, {});
    const page = {view: {}, reportCard: {}};

    it("ignores a command it does not know", () => {
        expect(COMMANDS).toEqual({});
        ["openSubject", "toString", "constructor", "__proto__", "hasOwnProperty"].forEach((name) => {
            expect(service.dispatch({avniCommand: name, args: {}}, page)).toBe(false);
        });
    });

    it("runs a known command with the service, its args and the page", () => {
        const handler = jest.fn();
        expect(service.dispatch({avniCommand: "ping", args: {a: 1}}, page, {ping: handler})).toBe(true);
        expect(handler).toHaveBeenCalledWith(service, {a: 1}, page);
    });

    it("passes {} for args that are not a plain object", () => {
        const handler = jest.fn();
        [undefined, null, "x", 5, [1], true].forEach((args) => {
            handler.mockClear();
            service.dispatch({avniCommand: "ping", args}, page, {ping: handler});
            expect(handler).toHaveBeenCalledWith(service, {}, page);
        });
    });
});
