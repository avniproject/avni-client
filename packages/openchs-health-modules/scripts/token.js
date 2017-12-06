var Cognito = require('amazon-cognito-identity-js');
global.navigator = () => null;

var authenticate = function (poolId, clientId, username, password) {
    var authenticationDetails = new Cognito.AuthenticationDetails({
        Username: username,
        Password: password
    });
    var userPool = new Cognito.CognitoUserPool({
        UserPoolId: poolId,
        ClientId: clientId
    });
    var cognitoUser = new Cognito.CognitoUser({Username: username, Pool: userPool});
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            console.log(result.getAccessToken().getJwtToken());
        },
        onFailure: function (error) {
            console.log("Check Credentials");
        },
        newPasswordRequired: function (userAttributes, requiredAttributes) {
            cognitoUser.completeNewPasswordChallenge(password, userAttributes, this);
        }
    })
};

authenticate(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);