import fakeDisease from '../config/translatedConfig.json';

export default class Diseases {

  static configs = {
    stroke: fakeDisease,
    hypertension: fakeDisease,
    diabetes: fakeDisease,
    pneumonia: fakeDisease,
  };

  static names() {
    return Object.keys(Diseases.configs);
  }

  static forName(name) {
    return Diseases.configs[name];
  }

}
