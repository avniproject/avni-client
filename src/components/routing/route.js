import React, {Component} from 'react-native';
import invariant from 'invariant';

export default class Route extends Component {
    render() {
        invariant(false, '<Route> elements are for router configuration only and should not be rendered');
    }
}