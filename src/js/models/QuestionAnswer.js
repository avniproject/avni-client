class QuestionAnswer {
    static schema = {
        name: "QuestionAnswer",
        properties: {
            question: "string",
            answer: "string"
        }
    };
    
    constructor(question, answer) {
        this.question = question;
        this.answer = answer;
    }
}

export default QuestionAnswer;
