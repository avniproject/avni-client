import fakeDisease from '../config/translatedConfig.json';

export default class Diseases {

  static configs = {
    Stroke: fakeDisease,
    Hypertension: fakeDisease,
    Diabetes: fakeDisease,
    Pneumonia: fakeDisease,
  };

  static names() {
    return Object.keys(Diseases.configs);
  }

  static forName(name) {
    return Diseases.configs[name];
  }

}
