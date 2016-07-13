# Dev setup
If running the repository for the first time, make sure you have homebrew
installed. If you have homebrew installed just run
`make install` from the root of this repository.


# Running
To run the application `make run-android`



# Running tests in Intellij
* Install NodeJS plugin in Intellij
* Open the Mocha Run & Debug Configurations
* Set environment variable as `npm_package_scripts_test=test`
* Set Extra Mocha Options as `--require react-native-mock/mock.js --require src/test/testHelper.js`
* Set Node Interpreter as the project node
* Set the Working Directory to the project root
* User interface to `bdd`
