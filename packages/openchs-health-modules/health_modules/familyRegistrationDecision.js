// TO BE MOVED TO WIKI ONCE WE COMPLETE ONE SAMPLE.
// IF SOMETHING IN NOT CLEAR THEN EDIT IT

// It is called multiple times during the flow in which the user fills the data. Imaging this being called every time user does something on the view.
// This output of this function is used to display either next button or register button.
// If false is returned then Register button is shown, else Next button.
const numberOfFormElementGroups = function (family) {
};

// This is called when the user presses next so in the individual all the data filled by the user so far is available.
// Remove form elements that are not applicable based on the data in individual.
// If you return a formElementGroup after removing all the form elements for it then, the filter elements will be automatically be called for nextFormElementGroup.
const filterElements = function (family, formElementGroup) {

};

// This is called before Register is pressed
// All the data filled so far including on the current view
// The platform will perform the data type, mandatory and range validations as defined in the database. But if your mandatory validations are dependent on individual's data
// Return array of ValidationResult objects as explained described below. If the array is empty or null then registration will go through
// passed = boolean
// message = string

class X {}

const validate = function (family) {
    let x = new X();
    return [];
};

export {
    validate,
    filterElements,
    numberOfFormElementGroups
};