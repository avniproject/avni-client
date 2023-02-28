import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../../framework/view/AbstractComponent";
import AbstractDataEntryState from "../../../state/AbstractDataEntryState";
import Distances from "../../primitives/Distances";
import {Individual} from 'avni-models';
import RadioLabelValue from "../../primitives/RadioLabelValue";
import {Actions} from "../../../action/individual/PersonRegisterActions";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";
import UserInfoService from "../../../service/UserInfoService";

class GenderFormElement extends AbstractComponent {
    static propTypes = {
        state: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;

        return <SelectableItemGroup
            locale={currentLocale}
            I18n={this.I18n}
            onPress={(value) => this.dispatchAction(Actions.REGISTRATION_ENTER_GENDER, {value: value})}
            selectionFn={(gender) => gender.equals(this.props.state.individual.gender)}
            labelKey="gender"
            labelValuePairs={this.props.state.genders.map((gender) => new RadioLabelValue(gender.name, gender))}
            validationError={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.GENDER)}
            style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
            mandatory={true}
        />;
    }
}

export default GenderFormElement;
