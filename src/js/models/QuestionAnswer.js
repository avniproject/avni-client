class QuestionAnswer {
    static schema = {
        name: "QuestionAnswer",
        properties: {
            question: "string",
            answer: "string"
        }
    };

    static newInstance(question, answer) {
        const questionAnswer = new QuestionAnswer();
        questionAnswer.question = question;
        questionAnswer.answer = answer;
        return questionAnswer;
    }
}

export default QuestionAnswer;
