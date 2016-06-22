class Decision {
    static schema = {
        name: "Decision",
        properties: {
            name: "string",
            code: "string",
            value: "string"
        }
    };
    
    static newInstance(name, code, value) {
        return {
            name: name,
            code: code,
            value: value
        };
    }
}

Decision.EntityName = "Decision";
export default Decision;