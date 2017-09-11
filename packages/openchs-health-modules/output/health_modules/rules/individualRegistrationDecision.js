/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// TO BE MOVED TO WIKI ONCE WE COMPLETE ONE SAMPLE.
// IF SOMETHING IN NOT CLEAR THEN EDIT IT

// It is called multiple times during the flow in which the user fills the data. Imaging this being called every time user does something on the view.
// This output of this function is used to display either next button or register button.
// If false is returned then Register button is shown, else Next button.
var numberOfFormElementGroups = function numberOfFormElementGroups(individual) {};

// This is called when the user presses next so in the individual all the data filled by the user so far is available.
// Remove form elements that are not applicable based on the data in individual.
// If you return a formElementGroup after removing all the form elements for it then, the filter elements will be automatically be called for nextFormElementGroup.
var filterElements = function filterElements(individual, formElementGroup) {};

// This is called before Register is pressed
// All the data filled so far including on the current view
// The platform will perform the data type, mandatory and range validations as defined in the database. But if your mandatory validations are dependent on individual's data
// Return array of ValidationResult objects as explained described below. If the array is empty or null then registration will go through
// passed = boolean
// message = string

var X = function X() {
    _classCallCheck(this, X);
};

var validate = function validate(individual) {
    var x = new X();
    return [];
};

module.exports = {
    validate: validate,
    filterElements: filterElements,
    numberOfFormElementGroups: numberOfFormElementGroups
};

/***/ })
/******/ ]);