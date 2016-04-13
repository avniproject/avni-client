import compiler from 'ljspjs';
import diseases from './diseases';

const dsl = {
  ask: (content, { answers }) => ({
    content,
    answers,
  }),
  answers: (...args) => ({
    answers: args.map((content) => ({
      content,
      next: () => null,
    })),
  }),
  answer: (content, child) => ({
    content,
    next: () => child,
  }),
  when: (...args) => ({
    answers: args,
  }),
};

export default {
  loadQuestions: (name) => compiler.execute(diseases[name].algorithm, dsl),
};
