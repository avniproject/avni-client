export default class Question {

  static schema = {
    name: 'Question',
    primaryKey: 'id',
    properties: {
      id: 'string',
      content: 'string',
      disease: 'string',
      children: { type: 'list', objectType: 'Answer' },
    },
  };
  
  get answers() {
    return this.children || [];
  }

}
