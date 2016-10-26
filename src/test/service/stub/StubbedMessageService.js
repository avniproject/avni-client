class StubbedMessageService {
    getI18n() {
        return {
            t: function (t) {
                return t;
            }
        }
    }
}

export default StubbedMessageService;