import QuestionFactory from '../../factory/QuestionFactory';

const inferType = (type) => (answers) => {
  return {"type": type, "answers": answers};
};

export let numeric = (answers) => inferType("numeric")(answers);

export let options = (options) => inferType("options")(options);

export let end = QuestionFactory.getEnd();

export let when = (answers) => answers;

export let ask = (question, recurAnswer) => QuestionFactory.getQuestion(question, recurAnswer);