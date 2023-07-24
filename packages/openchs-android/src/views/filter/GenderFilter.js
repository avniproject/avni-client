import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {GenderFilterNames as Actions} from "../../action/mydashboard/GenderFilterActions";
import MultiSelectFilter from "./MultiSelectFilter";
import _ from "lodash";
import {View} from "react-native";
import React from "react";
import MultiSelectFilterModel from "../../model/MultiSelectFilterModel";
import UserInfoService from "../../service/UserInfoService";
import PropTypes from "prop-types";

class GenderFilter extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.genderFilterActions);
    }

    static propTypes = {
        onSelect: PropTypes.func,
        selectedGenders: PropTypes.array,
        filterLabel: PropTypes.string,
        deprecatedUsage: PropTypes.bool //updating redux state on change. callbacks on render both deprecated.
    }
    static defaultProps = {
        deprecatedUsage: true,
        selectedGenders: []
    };

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.UNSAFE_componentWillMount();
    }

    _invokeCallbacks() {
        if (_.isFunction(this.props.onSelect) && this.state.selectedGenders !== this.props.selectedGenders) {
            this.props.onSelect(this.state.selectedGenders);
        }
    }

    notifyChange(genderName) {
        this.props.onSelect(_.find(this.state.genders, (x) => x.name === genderName));
    }

    renderGenders = () => {
        const locale = this.getService(UserInfoService).getUserSettings().locale || "en";
        const {genders} = this.state;
        const selectedGenders = this.props.selectedGenders;
        const optsFnMap = genders.reduce((genderMap, gender) => genderMap.set(gender.name, gender), new Map());
        const selectedNames = selectedGenders.map(gender => gender.name);
        let label = this.props.filterLabel || this.I18n.t('gender');
        let filterModel = new MultiSelectFilterModel(label, optsFnMap, new Map(), selectedNames);
        return <View>
            <MultiSelectFilter filter={filterModel}
                               locale={locale}
                               I18n={this.I18n}
                               onSelect={(genderName) => this.notifyChange(genderName)}/>
        </View>
    };

    render() {
        return this.renderGenders();
    }
}

export default GenderFilter
