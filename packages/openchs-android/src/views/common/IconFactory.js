import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Entypo from "react-native-vector-icons/Entypo";
import AntDesign from "react-native-vector-icons/AntDesign";

const map = new Map();
map.set("MaterialIcons", MaterialIcons);
map.set("MaterialCommunityIcons", MaterialCommunityIcons);
map.set("FontAwesome5", FontAwesome5);
map.set("Entypo", Entypo);
map.set("AntDesign", AntDesign);

class IconFactory {
    static getIcon(type) {
        const iconType = map.get(type);
        //without this the app crashes. with this it would show a question mark in the icon
        if (_.isNil(iconType)) return MaterialIcons;
        return iconType;
    }
}

export default IconFactory;
