import {PermissionsAndroid, ToastAndroid} from "react-native";
import RNImmediatePhoneCall from "react-native-immediate-phone-call";
import CallService from "../service/CallService";

class PhoneCall {

    static async makeCall(number, context, displayIndicatorCb) {
        const grantSuccess = (grant) => {
            return typeof (grant) === 'boolean' ? grant : PermissionsAndroid.RESULTS.GRANTED === grant;
        };

        const grant = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            {
                'title': 'Make phone call',
                'message': 'This is required to make call to mobile number'
            }
        );

        if (grantSuccess(grant)) {
            context.getService(CallService).callBeneficiary(context, number,
                () => RNImmediatePhoneCall.immediatePhoneCall(number),
                (message) => ToastAndroid.show(message, ToastAndroid.SHORT),
                displayIndicatorCb)
        }
    }
}

export default PhoneCall;
