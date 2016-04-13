import compiler from 'ljspjs';
import diseases from './diseases';

const ask = (content, answers) => ({ content, answers });

const answer = (content, question) => ({ content, next: () => question });

const answers = (...args) => args.map(c => answer(c, false));

const when = (...args) => args;

const dsl = { ask, answers, answer, when };

export default {
  loadQuestions: (name) => compiler.execute(diseases[name].algorithm, dsl),
};
