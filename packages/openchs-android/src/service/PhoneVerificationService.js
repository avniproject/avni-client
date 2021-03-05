import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import AuthService from "./AuthService";
import {post} from "../framework/http/requests";
import {AlertMessage} from "../views/common/AlertMessage";
import ServerError from "./ServerError";

@Service("phoneVerificationService")
class PhoneVerificationService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    sendOTP(phoneNumber, otpLength, serverURL) {
        const body = {phoneNumber, otpLength};
        const errorTitle = "Error while sending the OTP";
        this.getService(AuthService)
            .getAuthToken()
            .then(token => post(`${serverURL}/phoneNumberVerification/otp/send`, body, token, true))
            .then(res => res.json())
            .then(({success, msg91Response}) => {
                if (!success) {
                    AlertMessage(errorTitle, msg91Response.message);
                }
            })
            .catch(error => this.catchError(error, errorTitle));
    }

    resendOTP(phoneNumber, otpLength, serverURL) {
        const body = {phoneNumber, otpLength};
        const errorTitle = 'Error while resending the OTP';
        this.getService(AuthService)
            .getAuthToken()
            .then(token => post(`${serverURL}/phoneNumberVerification/otp/resend`, body, token, true))
            .then(res => res.json())
            .then(({success, msg91Response}) => {
                if (!success) {
                    AlertMessage(errorTitle, msg91Response.message)
                }
            })
            .catch(error => this.catchError(error, errorTitle))
    }

    verifyOTP(phoneNumber, otp, otpLength, serverURL, onSuccessVerification) {
        const body = {otp, phoneNumber, otpLength};
        const errorTitle = 'Error while verifying the OTP';
        this.getService(AuthService)
            .getAuthToken()
            .then(token => post(`${serverURL}/phoneNumberVerification/otp/verify`, body, token, true))
            .then(res => res.json())
            .then(({success, msg91Response}) => {
                if (success) {
                    onSuccessVerification();
                } else {
                    AlertMessage(errorTitle, msg91Response.message)
                }
            })
            .catch(error => this.catchError(error, errorTitle))
    }

    catchError(error, errorTitle) {
        if (error instanceof ServerError) {
            error.text ?
                error.text.then(message => AlertMessage(errorTitle, message)) :
                AlertMessage(errorTitle, error.message)
        } else if (typeof error.json === "function") {
            error.json().then(({success, msg91Response}) => {
                AlertMessage(errorTitle, msg91Response.message);
            }).catch(genericError => {
                AlertMessage(errorTitle, "Unknown error occurred");
            });
        } else {
            AlertMessage(errorTitle, "Unknown error occurred");
        }
    };

}

export default PhoneVerificationService;
