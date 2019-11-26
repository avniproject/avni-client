import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {GenderFilterNames as Actions} from "../../action/mydashboard/GenderFilterActions";
import MultiSelectFilter from "./MultiSelectFilter";
import {MultiSelectFilter as MultiSelectFilterModel} from "openchs-models";
import _ from "lodash";
import {View} from "react-native";
import React from "react";


class GenderFilter extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.genderFilterActions);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.componentWillMount();
    }

    _invokeCallbacks() {
        if (_.isFunction(this.props.onSelect) && this.state.selectedGenders !== this.props.selectedGenders) {
            this.props.onSelect(this.state.selectedGenders);
        }
    }

    renderGenders = () => {
        const {genders, selectedGenders} = this.state;
        const optsFnMap = genders.reduce((genderMap, gender) => genderMap.set(gender.name, gender), new Map());
        const selectedNames = selectedGenders.map(gender => gender.name);
        const filterModel = new MultiSelectFilterModel(this.I18n.t('gender'), optsFnMap, new Map(), selectedNames).selectOption(selectedNames);
        return <View>
            <MultiSelectFilter filter={filterModel}
                               onSelect={(gender) => this.dispatchAction(Actions.ON_GENDER_SELECT, {gender})}/>
        </View>
    };

    render() {
        this._invokeCallbacks();
        return this.renderGenders()
    }
}

export default GenderFilter