jest.mock('@react-native-community/datetimepicker', () => ({DateTimePickerAndroid: {open: jest.fn()}}));

import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import DateOfBirthAndAgeFormElement from '../../../../src/views/form/formElement/DateOfBirthAndAgeFormElement';

// The date of birth picker on the registration form must honour the user's date picker setting. #1615
function openPickerWith(userSettings) {
    const element = Object.create(DateOfBirthAndAgeFormElement.prototype);
    element.userSettings = userSettings;
    element.props = {state: {individual: {dateOfBirth: new Date(2000, 0, 1)}}};
    element.showPicker();
    return DateTimePickerAndroid.open.mock.calls[0][0];
}

describe('DateOfBirthAndAgeFormElement.showPicker', () => {
    beforeEach(() => jest.clearAllMocks());

    it('opens a date picker shown as a spinner when the user chose spinner', () => {
        const options = openPickerWith({datePickerMode: 'spinner'});
        expect(options.mode).toBe('date');
        expect(options.display).toBe('spinner');
    });

    it('opens a date picker shown as a calendar by default', () => {
        const options = openPickerWith({datePickerMode: undefined});
        expect(options.mode).toBe('date');
        expect(options.display).toBe('calendar');
    });
});
