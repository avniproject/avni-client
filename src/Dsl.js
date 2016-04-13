export default {
  ask: (content, { answers }) =>({
    content,
    answers
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
}
