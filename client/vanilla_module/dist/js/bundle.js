(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	module.exports = {
		"find": function find(predicate) {
			if (this === null) {
				throw new TypeError("Array.prototype.find called on null or undefined");
			}
			if (typeof predicate !== "function") {
				throw new TypeError("predicate must be a function");
			}
			var list = Object(this);
			var length = list.length >>> 0;
			var thisArg = arguments[1];
			var value;

			for (var i = 0; i < length; i++) {
				value = list[i];
				if (predicate.call(thisArg, value, i, list)) {
					return value;
				}
			}
			return undefined;
		}
	};
})();


},{}],2:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	var Elements = require("./elements/elements");
	var Config = require("./configs/config");
	var State = require("./state/state");
	var factory = require("./factory/factory");
	var inputElement = require("./partials/input");
	var selectElement = require("./partials/select");
	var resultElement = require("./partials/selectedOption");

	module.exports = function Constructor() {
		var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		var configs = new Config(params);
		var elements = new Elements(document.querySelector(params.anchorReference));
		var state = new State();

		var _methods = {
			"isDecreasing": function isDecreasing() {
				var currentValueLength = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
				var newValueLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

				return newValueLength < currentValueLength;
			},
			"isOnCooldown": function isOnCooldown() {
				return state.get("lastUpdate") ? Date.now() - state.get("lastUpdate") < state.get("queryCooldown") : false;
			},
			"shouldQuery": function shouldQuery(valueLength) {
				return valueLength >= state.get("minLengthToQuery");
			},
			"performQuery": function performQuery() {
				factory.queryCountries(state.get("queryString")).then(function (result) {
					state.commit("queryResults", result);
					state.commit("lastUpdate", Date.now());
				}).catch(function (err) {
					return err;
				}).then(function () {
					if (state.get("queryResults").length >= 1) {
						state.commit("queryCache", state.get("queryResults"));
					}
				});
			},
			"performCacheFilter": function performCacheFilter() {
				state.commit("queryResults", factory.queryCache(state.get("queryCache"), state.get("queryString")));
			},
			"receiveInput": function receiveInput(value) {
				if (!value.length) {
					state.commit("queryString", "");
					state.commit("queryResults", []);
				} else {

					var isDecreasing = _methods.isDecreasing(state.get("queryString").length, value.length);
					var shouldQuery = _methods.shouldQuery(value.length);
					var isOnCooldown = _methods.isOnCooldown();

					state.commit("queryString", value);

					if (isDecreasing || !shouldQuery) {
						_methods.performCacheFilter();
					} else {
						if (isOnCooldown) {
							console.log("will block operation");
						} else {
							_methods.performQuery();
						}
					}
				}
			},
			"handleFocus": function handleFocus() {
				state.commit("openSelect", true);
				console.log("focus");
			},
			"handleBlur": function handleBlur() {
				state.commit("openSelect", false);
				console.log("blur");
			},
			"selectOption": function selectOption(option) {
				var shouldDeselect = false;
				var found = false;
				if (option.code === state.get("selectedCode").code) {
					shouldDeselect = true;
				}
				state.commit("queryResults", state.get("queryResults").map(function (result) {
					if (shouldDeselect) {
						result.selected = false;
					} else {
						result.selected = result.code === option.code;
						if (result.selected) {
							found = option;
						}
					}
					return result;
				}));

				state.commit("selectedCode", found || "");
			}
		};

		return function () {
			var input = inputElement(elements, configs);
			var select = selectElement(elements, configs, state);
			var result = resultElement(elements, configs, state);
			input.events.keyUp = _methods.receiveInput;
			input.events.focus = _methods.handleFocus;
			input.events.blur = _methods.handleBlur;
			select.events.click = _methods.selectOption;
			state.registerDependency("queryResults", select.methods.renderOptions);
			state.registerDependency("openSelect", select.methods.toggleSelect);
			state.registerDependency("selectedCode", result.methods.renderResult);

			return { configs: configs, elements: elements, input: input, select: select };
		}();
	};
})();


},{"./configs/config":3,"./elements/elements":4,"./factory/factory":5,"./partials/input":7,"./partials/select":8,"./partials/selectedOption":9,"./state/state":11}],3:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	module.exports = function Constructor(configs) {
		if (!configs || !configs.queryEndpoint || !configs.anchorReference) {
			throw new Error("Invalid constructor params");
		}
		var _configs = {
			"anchorReference": configs.anchorReference,
			"queryEndpoint": configs.queryEndpoint
		};

		return {
			"get": function get(prop) {
				if (!configs[prop]) {
					throw new Error("Invalid prop " + prop);
				} else {
					return _configs[prop];
				}
			},
			"set": function set(key, value) {
				if (!key) {
					throw new Error("Invalid key to set");
				} else {
					_configs[key] = value;
				}
			}
		};
	};
})();


},{}],4:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	module.exports = function (anchorElement) {
		if (!anchorElement) {
			throw new Error("Can not proceed without a valid HTML element to hold the element");
		} else {
			anchorElement.classList.add("ikt-autocomplete");
		}
		var _elements = {
			"ikt-autocomplete": anchorElement,
			"app-results": document.querySelector("#app-results")
		};

		return {
			"get": function get(el) {
				if (!_elements[el]) {
					throw new Error("Element " + el + " not found");
				} else {
					return _elements[el];
				}
			},
			"set": function set(el) {
				var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";

				if (!el) {
					throw new Error("Invalid element to set");
				} else {
					_elements[el] = value;
				}
			}
		};
	};
})();


},{}],5:[function(require,module,exports){
"use strict";

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function () {
	"use strict";

	var countries = require("../model/countries");

	module.exports = {
		//SIMULATING A KIND OF FILTER QUERY. WOULD TO IT THROUGH A REST API ENCODING/DECODING
		"queryCountries": function queryCountries() {
			var queryString = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
			var fieldToSearch = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";

			return new _promise2.default(function (resolve) {
				setTimeout(function () {
					if (!queryString) {
						resolve([]);
					} else {
						if (fieldToSearch) {
							resolve(countries.filter(function (country) {
								return country[fieldToSearch].indexOf(queryString) > -1;
							}));
						} else {
							resolve(countries.filter(function (country) {
								var found = void 0;
								for (var prop in country) {
									if (country.hasOwnProperty(prop) && typeof country[prop] === "string") {
										found = country[prop].indexOf(queryString) > -1;
										if (found) {
											return true;
										}
									}
								}
								return false;
							}));
						}
					}
				}, 300);
			});
		},
		"queryCache": function queryCache() {
			var results = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
			var queryString = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
			var fieldToSearch = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";

			if (fieldToSearch) {
				return results.filter(function (result) {
					return result[fieldToSearch].indexOf(queryString) > -1;
				});
			} else {
				return results.filter(function (result) {
					var found = void 0;

					for (var prop in result) {
						if (result.hasOwnProperty(prop) && typeof result[prop] === "string") {
							found = result[prop].indexOf(queryString) > -1;
							if (found) {
								return true;
							}
						}
					}
					return found;
				});
			}
		}
	};
})();


},{"../model/countries":6,"babel-runtime/core-js/promise":15}],6:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	module.exports = [{ "name": "Afghanistan", "code": "AF" }, { "name": "Åland Islands", "code": "AX" }, { "name": "Albania", "code": "AL" }, { "name": "Algeria", "code": "DZ" }, { "name": "American Samoa", "code": "AS" }, { "name": "AndorrA", "code": "AD" }, { "name": "Angola", "code": "AO" }, { "name": "Anguilla", "code": "AI" }, { "name": "Antarctica", "code": "AQ" }, { "name": "Antigua and Barbuda", "code": "AG" }, { "name": "Argentina", "code": "AR" }, { "name": "Armenia", "code": "AM" }, { "name": "Aruba", "code": "AW" }, { "name": "Australia", "code": "AU" }, { "name": "Austria", "code": "AT" }, { "name": "Azerbaijan", "code": "AZ" }, { "name": "Bahamas", "code": "BS" }, { "name": "Bahrain", "code": "BH" }, { "name": "Bangladesh", "code": "BD" }, { "name": "Barbados", "code": "BB" }, { "name": "Belarus", "code": "BY" }, { "name": "Belgium", "code": "BE" }, { "name": "Belize", "code": "BZ" }, { "name": "Benin", "code": "BJ" }, { "name": "Bermuda", "code": "BM" }, { "name": "Bhutan", "code": "BT" }, { "name": "Bolivia", "code": "BO" }, { "name": "Bosnia and Herzegovina", "code": "BA" }, { "name": "Botswana", "code": "BW" }, { "name": "Bouvet Island", "code": "BV" }, { "name": "Brazil", "code": "BR" }, { "name": "British Indian Ocean Territory", "code": "IO" }, { "name": "Brunei Darussalam", "code": "BN" }, { "name": "Bulgaria", "code": "BG" }, { "name": "Burkina Faso", "code": "BF" }, { "name": "Burundi", "code": "BI" }, { "name": "Cambodia", "code": "KH" }, { "name": "Cameroon", "code": "CM" }, { "name": "Canada", "code": "CA" }, { "name": "Cape Verde", "code": "CV" }, { "name": "Cayman Islands", "code": "KY" }, { "name": "Central African Republic", "code": "CF" }, { "name": "Chad", "code": "TD" }, { "name": "Chile", "code": "CL" }, { "name": "China", "code": "CN" }, { "name": "Christmas Island", "code": "CX" }, { "name": "Cocos (Keeling) Islands", "code": "CC" }, { "name": "Colombia", "code": "CO" }, { "name": "Comoros", "code": "KM" }, { "name": "Congo", "code": "CG" }, { "name": "Congo, The Democratic Republic of the", "code": "CD" }, { "name": "Cook Islands", "code": "CK" }, { "name": "Costa Rica", "code": "CR" }, { "name": "Cote D\"Ivoire", "code": "CI" }, { "name": "Croatia", "code": "HR" }, { "name": "Cuba", "code": "CU" }, { "name": "Cyprus", "code": "CY" }, { "name": "Czech Republic", "code": "CZ" }, { "name": "Denmark", "code": "DK" }, { "name": "Djibouti", "code": "DJ" }, { "name": "Dominica", "code": "DM" }, { "name": "Dominican Republic", "code": "DO" }, { "name": "Ecuador", "code": "EC" }, { "name": "Egypt", "code": "EG" }, { "name": "El Salvador", "code": "SV" }, { "name": "Equatorial Guinea", "code": "GQ" }, { "name": "Eritrea", "code": "ER" }, { "name": "Estonia", "code": "EE" }, { "name": "Ethiopia", "code": "ET" }, { "name": "Falkland Islands (Malvinas)", "code": "FK" }, { "name": "Faroe Islands", "code": "FO" }, { "name": "Fiji", "code": "FJ" }, { "name": "Finland", "code": "FI" }, { "name": "France", "code": "FR" }, { "name": "French Guiana", "code": "GF" }, { "name": "French Polynesia", "code": "PF" }, { "name": "French Southern Territories", "code": "TF" }, { "name": "Gabon", "code": "GA" }, { "name": "Gambia", "code": "GM" }, { "name": "Georgia", "code": "GE" }, { "name": "Germany", "code": "DE" }, { "name": "Ghana", "code": "GH" }, { "name": "Gibraltar", "code": "GI" }, { "name": "Greece", "code": "GR" }, { "name": "Greenland", "code": "GL" }, { "name": "Grenada", "code": "GD" }, { "name": "Guadeloupe", "code": "GP" }, { "name": "Guam", "code": "GU" }, { "name": "Guatemala", "code": "GT" }, { "name": "Guernsey", "code": "GG" }, { "name": "Guinea", "code": "GN" }, { "name": "Guinea-Bissau", "code": "GW" }, { "name": "Guyana", "code": "GY" }, { "name": "Haiti", "code": "HT" }, { "name": "Heard Island and Mcdonald Islands", "code": "HM" }, { "name": "Holy See (Vatican City State)", "code": "VA" }, { "name": "Honduras", "code": "HN" }, { "name": "Hong Kong", "code": "HK" }, { "name": "Hungary", "code": "HU" }, { "name": "Iceland", "code": "IS" }, { "name": "India", "code": "IN" }, { "name": "Indonesia", "code": "ID" }, { "name": "Iran, Islamic Republic Of", "code": "IR" }, { "name": "Iraq", "code": "IQ" }, { "name": "Ireland", "code": "IE" }, { "name": "Isle of Man", "code": "IM" }, { "name": "Israel", "code": "IL" }, { "name": "Italy", "code": "IT" }, { "name": "Jamaica", "code": "JM" }, { "name": "Japan", "code": "JP" }, { "name": "Jersey", "code": "JE" }, { "name": "Jordan", "code": "JO" }, { "name": "Kazakhstan", "code": "KZ" }, { "name": "Kenya", "code": "KE" }, { "name": "Kiribati", "code": "KI" }, { "name": "Korea, Democratic People\"S Republic of", "code": "KP" }, { "name": "Korea, Republic of", "code": "KR" }, { "name": "Kuwait", "code": "KW" }, { "name": "Kyrgyzstan", "code": "KG" }, { "name": "Lao People\"S Democratic Republic", "code": "LA" }, { "name": "Latvia", "code": "LV" }, { "name": "Lebanon", "code": "LB" }, { "name": "Lesotho", "code": "LS" }, { "name": "Liberia", "code": "LR" }, { "name": "Libyan Arab Jamahiriya", "code": "LY" }, { "name": "Liechtenstein", "code": "LI" }, { "name": "Lithuania", "code": "LT" }, { "name": "Luxembourg", "code": "LU" }, { "name": "Macao", "code": "MO" }, { "name": "Macedonia, The Former Yugoslav Republic of", "code": "MK" }, { "name": "Madagascar", "code": "MG" }, { "name": "Malawi", "code": "MW" }, { "name": "Malaysia", "code": "MY" }, { "name": "Maldives", "code": "MV" }, { "name": "Mali", "code": "ML" }, { "name": "Malta", "code": "MT" }, { "name": "Marshall Islands", "code": "MH" }, { "name": "Martinique", "code": "MQ" }, { "name": "Mauritania", "code": "MR" }, { "name": "Mauritius", "code": "MU" }, { "name": "Mayotte", "code": "YT" }, { "name": "Mexico", "code": "MX" }, { "name": "Micronesia, Federated States of", "code": "FM" }, { "name": "Moldova, Republic of", "code": "MD" }, { "name": "Monaco", "code": "MC" }, { "name": "Mongolia", "code": "MN" }, { "name": "Montserrat", "code": "MS" }, { "name": "Morocco", "code": "MA" }, { "name": "Mozambique", "code": "MZ" }, { "name": "Myanmar", "code": "MM" }, { "name": "Namibia", "code": "NA" }, { "name": "Nauru", "code": "NR" }, { "name": "Nepal", "code": "NP" }, { "name": "Netherlands", "code": "NL" }, { "name": "Netherlands Antilles", "code": "AN" }, { "name": "New Caledonia", "code": "NC" }, { "name": "New Zealand", "code": "NZ" }, { "name": "Nicaragua", "code": "NI" }, { "name": "Niger", "code": "NE" }, { "name": "Nigeria", "code": "NG" }, { "name": "Niue", "code": "NU" }, { "name": "Norfolk Island", "code": "NF" }, { "name": "Northern Mariana Islands", "code": "MP" }, { "name": "Norway", "code": "NO" }, { "name": "Oman", "code": "OM" }, { "name": "Pakistan", "code": "PK" }, { "name": "Palau", "code": "PW" }, { "name": "Palestinian Territory, Occupied", "code": "PS" }, { "name": "Panama", "code": "PA" }, { "name": "Papua New Guinea", "code": "PG" }, { "name": "Paraguay", "code": "PY" }, { "name": "Peru", "code": "PE" }, { "name": "Philippines", "code": "PH" }, { "name": "Pitcairn", "code": "PN" }, { "name": "Poland", "code": "PL" }, { "name": "Portugal", "code": "PT" }, { "name": "Puerto Rico", "code": "PR" }, { "name": "Qatar", "code": "QA" }, { "name": "Reunion", "code": "RE" }, { "name": "Romania", "code": "RO" }, { "name": "Russian Federation", "code": "RU" }, { "name": "RWANDA", "code": "RW" }, { "name": "Saint Helena", "code": "SH" }, { "name": "Saint Kitts and Nevis", "code": "KN" }, { "name": "Saint Lucia", "code": "LC" }, { "name": "Saint Pierre and Miquelon", "code": "PM" }, { "name": "Saint Vincent and the Grenadines", "code": "VC" }, { "name": "Samoa", "code": "WS" }, { "name": "San Marino", "code": "SM" }, { "name": "Sao Tome and Principe", "code": "ST" }, { "name": "Saudi Arabia", "code": "SA" }, { "name": "Senegal", "code": "SN" }, { "name": "Serbia and Montenegro", "code": "CS" }, { "name": "Seychelles", "code": "SC" }, { "name": "Sierra Leone", "code": "SL" }, { "name": "Singapore", "code": "SG" }, { "name": "Slovakia", "code": "SK" }, { "name": "Slovenia", "code": "SI" }, { "name": "Solomon Islands", "code": "SB" }, { "name": "Somalia", "code": "SO" }, { "name": "South Africa", "code": "ZA" }, { "name": "South Georgia and the South Sandwich Islands", "code": "GS" }, { "name": "Spain", "code": "ES" }, { "name": "Sri Lanka", "code": "LK" }, { "name": "Sudan", "code": "SD" }, { "name": "Suriname", "code": "SR" }, { "name": "Svalbard and Jan Mayen", "code": "SJ" }, { "name": "Swaziland", "code": "SZ" }, { "name": "Sweden", "code": "SE" }, { "name": "Switzerland", "code": "CH" }, { "name": "Syrian Arab Republic", "code": "SY" }, { "name": "Taiwan, Province of China", "code": "TW" }, { "name": "Tajikistan", "code": "TJ" }, { "name": "Tanzania, United Republic of", "code": "TZ" }, { "name": "Thailand", "code": "TH" }, { "name": "Timor-Leste", "code": "TL" }, { "name": "Togo", "code": "TG" }, { "name": "Tokelau", "code": "TK" }, { "name": "Tonga", "code": "TO" }, { "name": "Trinidad and Tobago", "code": "TT" }, { "name": "Tunisia", "code": "TN" }, { "name": "Turkey", "code": "TR" }, { "name": "Turkmenistan", "code": "TM" }, { "name": "Turks and Caicos Islands", "code": "TC" }, { "name": "Tuvalu", "code": "TV" }, { "name": "Uganda", "code": "UG" }, { "name": "Ukraine", "code": "UA" }, { "name": "United Arab Emirates", "code": "AE" }, { "name": "United Kingdom", "code": "GB" }, { "name": "United States", "code": "US" }, { "name": "United States Minor Outlying Islands", "code": "UM" }, { "name": "Uruguay", "code": "UY" }, { "name": "Uzbekistan", "code": "UZ" }, { "name": "Vanuatu", "code": "VU" }, { "name": "Venezuela", "code": "VE" }, { "name": "Viet Nam", "code": "VN" }, { "name": "Virgin Islands, British", "code": "VG" }, { "name": "Virgin Islands, U.S.", "code": "VI" }, { "name": "Wallis and Futuna", "code": "WF" }, { "name": "Western Sahara", "code": "EH" }, { "name": "Yemen", "code": "YE" }, { "name": "Zambia", "code": "ZM" }, { "name": "Zimbabwe", "code": "ZW" }];
})();


},{}],7:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	module.exports = function (elements) {
		var methods = {};
		var events = {
			"keyUp": function keyUp() {
				return false;
			},
			"focus": function focus() {
				return false;
			},
			"blur": function blur() {
				return false;
			}
		};

		var _builder = {
			"setIcon": function setIcon() {
				var span = document.createElement("span");
				var i = document.createElement("i");
				span.classList.add("icon");
				span.classList.add("is-small");
				span.classList.add("is-left");
				i.classList.add("fal");
				i.classList.add("fa-search");
				span.appendChild(i);
				elements.get("ikt-autocomplete-input-wrapper").appendChild(span);
				return this;
			},
			"setPlaceholder": function setPlaceholder() {
				elements.get("ikt-autocomplete-input").setAttribute("placeholder", "Type to search");
				return this;
			},
			"setInputClass": function setInputClass() {
				elements.get("ikt-autocomplete-input").classList.add("ikt-autocomplete-input");
				elements.get("ikt-autocomplete-input").classList.add("input");
				elements.get("ikt-autocomplete-input-wrapper").classList.add("has-icons-left");
				elements.get("ikt-autocomplete-input-wrapper").classList.add("control");

				return this;
			},
			"setEvents": function setEvents() {
				elements.get("ikt-autocomplete-input").addEventListener("keyup", function (ev) {
					ev.stopPropagation();
					return ev.key.length > 1 && ev.key !== "Backspace" ? false : events.keyUp(elements.get("ikt-autocomplete-input").value || "");
				});
				elements.get("ikt-autocomplete-input").addEventListener("focus", function (ev) {
					ev.stopPropagation();
					return events.focus(this);
				});
				elements.get("ikt-autocomplete-input").addEventListener("blur", function (ev) {
					ev.stopPropagation();
					return events.blur(this);
				});
				return this;
			},
			"attachToAnchor": function attachToAnchor() {
				elements.get("ikt-autocomplete-input-wrapper").appendChild(elements.get("ikt-autocomplete-input"));

				elements.get("ikt-autocomplete").appendChild(elements.get("ikt-autocomplete-input-wrapper"));
				return this;
			},
			"createInput": function createInput() {
				elements.set("ikt-autocomplete-input-wrapper", document.createElement("p"));
				elements.set("ikt-autocomplete-input", document.createElement("input"));
				return this.setInputClass().setPlaceholder().setEvents().setIcon().attachToAnchor();
			}
		};

		_builder.createInput();
		return { methods: methods, events: events };
	};
})();


},{}],8:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	module.exports = function (elements) {

		var props = {
			"currentOptions": []
		};

		var methods = {
			"renderOptions": function renderOptions(options) {
				props.currentOptions = options;
				return _builder.buildOptions(props.currentOptions);
			},
			"toggleSelect": function toggleSelect(isClosed) {
				if (isClosed) {
					elements.get("ikt-autocomplete-select").classList.remove("is__hidden");
				} else {
					setTimeout(function () {
						elements.get("ikt-autocomplete-select").classList.add("is__hidden");
					}, 300);
				}
			}
		};
		var events = {
			"click": function click() {
				return false;
			}
		};

		var _builder = {
			"setSelectClass": function setSelectClass() {
				elements.get("ikt-autocomplete-select").classList.add("ikt-autocomplete-select");
				elements.get("ikt-autocomplete-select").classList.add("is__hidden");
				return this;
			},
			"setEvents": function setEvents(element) {
				element.addEventListener("click", function (ev) {
					ev.stopPropagation();
					return events.click(props.currentOptions[this.getAttribute("data-id")]);
				});
				return this;
			},
			"clearOptions": function clearOptions() {
				while (elements.get("ikt-autocomplete-select").firstChild) {
					elements.get("ikt-autocomplete-select").removeChild(elements.get("ikt-autocomplete-select").firstChild);
				}
			},
			"buildOptionTile": function buildOptionTile(key, value) {
				var span = document.createElement("span");
				var info_value = document.createElement("span");
				info_value.appendChild(document.createTextNode(value));
				span.classList.add("ikt-autocomplete-select-option-tile");
				info_value.classList.add("ikt-autocomplete-select-option-tile-value");
				span.appendChild(info_value);
				return span;
			},
			"buildOption": function buildOption() {
				var option = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var index = arguments[1];

				var optionDiv = document.createElement("div");
				this.setEvents(optionDiv);

				if (option.selected) {
					optionDiv.classList.add("is__selected");
				}

				optionDiv.classList.add("ikt-autocomplete-select-option");
				optionDiv.setAttribute("data-id", index);
				for (var prop in option) {
					if (option.hasOwnProperty(prop) && typeof option[prop] === "string") {
						optionDiv.appendChild(this.buildOptionTile(prop, option[prop]));
					}
				}
				return optionDiv;
			},
			"buildEmptyOption": function buildEmptyOption() {
				var emptyOptionDiv = document.createElement("div");
				var optionText = document.createElement("span");

				emptyOptionDiv.classList.add("ikt-autocomplete-select-option");
				emptyOptionDiv.classList.add("is__empty");
				optionText.appendChild(document.createTextNode("No results found. Try changing your query"));

				emptyOptionDiv.appendChild(optionText);
				return emptyOptionDiv;
			},
			"buildOptions": function buildOptions() {
				var _this = this;

				var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

				var optionsDiv = document.createElement("div");
				optionsDiv.classList.add("ikt-autocomplete-select-options");

				if (options.length) {
					options.forEach(function (option, index) {
						optionsDiv.appendChild(_this.buildOption(option, index));
					});
				} else {
					optionsDiv.appendChild(this.buildEmptyOption());
				}

				this.clearOptions();
				elements.get("ikt-autocomplete-select").appendChild(optionsDiv);
			},
			"attachToAnchor": function attachToAnchor() {
				elements.get("ikt-autocomplete").appendChild(elements.get("ikt-autocomplete-select"));
				return this;
			},
			"createSelect": function createSelect() {
				elements.set("ikt-autocomplete-select", document.createElement("div"));
				return this.setSelectClass().attachToAnchor();
			}
		};

		_builder.createSelect();
		return { methods: methods, events: events };
	};
})();


},{}],9:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	module.exports = function (elements) {

		var props = {
			"selectedOption": []
		};

		var methods = {
			"renderResult": function renderResult(option) {
				props.selectedOption = option;
				_builder.clearOptions();
				return _builder.buildResults(props.selectedOption);
			}
		};
		var events = {
			"click": function click() {
				return false;
			}
		};

		var _builder = {
			"setSelectClass": function setSelectClass() {
				elements.get("ikt-autocomplete-result").classList.add("ikt-autocomplete-result");
				return this;
			},
			"setEvents": function setEvents(element) {
				element.addEventListener("click", function (ev) {
					ev.stopPropagation();
					return events.click(this);
				});
				return this;
			},
			"buildResults": function buildResults() {
				if (props.selectedOption) {
					var div = document.createElement("div");
					var country = document.createElement("span");
					var countryCode = document.createElement("span");

					country.classList.add("tag");
					country.classList.add("is-dark");

					countryCode.classList.add("tag");
					countryCode.classList.add("is-dark");

					country.appendChild(document.createTextNode(props.selectedOption.name));
					countryCode.appendChild(document.createTextNode(props.selectedOption.code));

					div.appendChild(country);
					div.appendChild(countryCode);

					elements.get("ikt-autocomplete-result").appendChild(div);
				}
			},
			"clearOptions": function clearOptions() {
				while (elements.get("ikt-autocomplete-result").firstChild) {
					elements.get("ikt-autocomplete-result").removeChild(elements.get("ikt-autocomplete-result").firstChild);
				}
			},
			"attachToAnchor": function attachToAnchor() {
				elements.get("app-results").appendChild(elements.get("ikt-autocomplete-result"));
				return this;
			},
			"createHolder": function createHolder() {
				elements.set("ikt-autocomplete-result", document.createElement("div"));
				return this.setSelectClass().attachToAnchor();
			}
		};

		_builder.createHolder();
		return { methods: methods, events: events };
	};
})();


},{}],10:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	module.exports = function () {
		var _hooks = {
			"queryResults": [],
			"openSelect": [],
			"selectedCode": []
		};
		return {
			"get": function get(prop) {
				return _hooks[prop];
			},
			"setDependency": function setDependency(prop, handler) {
				if (!prop) {
					throw new Error("Invalid hook to set");
				} else {
					if (_hooks[prop] && _hooks[prop].length) {
						_hooks[prop] = [handler];
					} else {
						_hooks[prop].push(handler);
					}
				}
			},
			"resetDependencies": function resetDependencies(prop) {
				_hooks[prop] = [];
			},
			"propagate": function propagate(prop, newValue) {
				if (!prop) {
					throw new Error("Invalid value to set");
				} else {
					_hooks[prop].forEach(function (dependency) {
						return dependency(newValue);
					});
				}
			}
		};
	};
})();


},{}],11:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	var hooks = require("./hooks")();

	module.exports = function () {
		var _state = {
			"minLengthToQuery": 3,
			"queryCooldown": 500,
			"queryString": "",
			"lastUpdate": 0,
			"queryResults": [],
			"queryCache": [],
			"openSelect": false,
			"selectedCode": ""
		};
		return {
			"get": function get(prop) {
				if (!_state.hasOwnProperty([prop])) {
					throw new Error("Property " + prop + " not found");
				} else {
					return _state[prop];
				}
			},
			"commit": function commit(prop) {
				var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";

				if (!prop) {
					throw new Error("Invalid value to set");
				} else {
					_state[prop] = value;
					if (hooks.get(prop)) {

						hooks.propagate(prop, _state[prop]);
					}
				}
			},
			"registerDependency": function registerDependency(prop, handler) {
				hooks.setDependency(prop, handler);
			}
		};
	};
})();


},{"./hooks":10}],12:[function(require,module,exports){
"use strict";

(function () {
	"use strict";

	require("shim-keyboard-event-key");
	if (!Array.prototype.find) {
		Array.prototype.find = require("../../etc/shared_libs/polyfills").find;
	}

	if (!window.Promise) {
		window.Promise = require("promise-polyfill");
	}

	require("@fortawesome/fontawesome");
	require("@fortawesome/fontawesome-pro-light");

	var Autocomplete = require("./components/autocomplete/autocomplete");
	new Autocomplete({
		"anchorReference": "#app-search-autocomplete",
		"queryEndpoint": "url"
	});
})();


},{"../../etc/shared_libs/polyfills":1,"./components/autocomplete/autocomplete":2,"@fortawesome/fontawesome":14,"@fortawesome/fontawesome-pro-light":13,"promise-polyfill":85,"shim-keyboard-event-key":86}],13:[function(require,module,exports){
/*!
 * Font Awesome Pro 5.0.6 by @fontawesome - http://fontawesome.com
 * License - http://fontawesome.com/license (Commercial License)
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global['fontawesome-pro-light'] = {})));
}(this, (function (exports) { 'use strict';

var _WINDOW = {};
try {
  if (typeof window !== 'undefined') _WINDOW = window;
  
} catch (e) {}

var _ref = _WINDOW.navigator || {};
var _ref$userAgent = _ref.userAgent;
var userAgent = _ref$userAgent === undefined ? '' : _ref$userAgent;

var WINDOW = _WINDOW;





var IS_IE = ~userAgent.indexOf('MSIE') || ~userAgent.indexOf('Trident/');

var NAMESPACE_IDENTIFIER = '___FONT_AWESOME___';







var PRODUCTION = function () {
  try {
    return "development" === 'production';
  } catch (e) {
    return false;
  }
}();

var oneToTen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
var oneToTwenty = oneToTen.concat([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);



var RESERVED_CLASSES = ['xs', 'sm', 'lg', 'fw', 'ul', 'li', 'border', 'pull-left', 'pull-right', 'spin', 'pulse', 'rotate-90', 'rotate-180', 'rotate-270', 'flip-horizontal', 'flip-vertical', 'stack', 'stack-1x', 'stack-2x', 'inverse', 'layers', 'layers-text', 'layers-counter'].concat(oneToTen.map(function (n) {
  return n + 'x';
})).concat(oneToTwenty.map(function (n) {
  return 'w-' + n;
}));

function bunker(fn) {
  try {
    fn();
  } catch (e) {
    if (!PRODUCTION) {
      throw e;
    }
  }
}

var w = WINDOW || {};

if (!w[NAMESPACE_IDENTIFIER]) w[NAMESPACE_IDENTIFIER] = {};
if (!w[NAMESPACE_IDENTIFIER].styles) w[NAMESPACE_IDENTIFIER].styles = {};
if (!w[NAMESPACE_IDENTIFIER].hooks) w[NAMESPACE_IDENTIFIER].hooks = {};
if (!w[NAMESPACE_IDENTIFIER].shims) w[NAMESPACE_IDENTIFIER].shims = [];

var namespace = w[NAMESPACE_IDENTIFIER];

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function define(prefix, icons) {
  var normalized = Object.keys(icons).reduce(function (acc, iconName) {
    var icon = icons[iconName];
    var expanded = !!icon.icon;

    if (expanded) {
      acc[icon.iconName] = icon.icon;
    } else {
      acc[iconName] = icon;
    }
    return acc;
  }, {});

  if (typeof namespace.hooks.addPack === 'function') {
    namespace.hooks.addPack(prefix, normalized);
  } else {
    namespace.styles[prefix] = _extends({}, namespace.styles[prefix] || {}, normalized);
  }

  /**
   * Font Awesome 4 used the prefix of `fa` for all icons. With the introduction
   * of new styles we needed to differentiate between them. Prefix `fa` is now an alias
   * for `fas` so we'll easy the upgrade process for our users by automatically defining
   * this as well.
   */
  if (prefix === 'fas') {
    define('fa', icons);
  }
}

var prefix = "fal";
var faAddressBook = { prefix: 'fal', iconName: 'address-book', icon: [448, 512, [], "f2b9", "M436 160c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-20V48c0-26.51-21.49-48-48-48H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h320c26.51 0 48-21.49 48-48v-48h20c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-20v-64h20c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-20v-64h20zm-52-52v356c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V48c0-8.822 7.178-16 16-16h320c8.822 0 16 7.178 16 16v60zM270.425 257.948C281.408 244.249 288 226.884 288 208c0-44.112-35.888-80-80-80s-80 35.888-80 80c0 18.884 6.592 36.249 17.575 49.948C107.25 270.543 96 305.706 96 326.363V340c0 24.262 19.738 44 44 44h136c24.262 0 44-19.738 44-44v-13.637c0-20.83-11.439-55.883-49.575-68.415zM208 160c26.51 0 48 21.49 48 48s-21.49 48-48 48-48-21.49-48-48 21.49-48 48-48zm80 180c0 6.627-5.373 12-12 12H140c-6.627 0-12-5.373-12-12v-13.637c0-17.859 11.839-33.555 29.011-38.461l20.641-5.897C187.017 285.859 197.261 288 208 288s20.983-2.141 30.348-5.996l20.641 5.897C276.161 292.808 288 308.503 288 326.363V340z"] };
var faAddressCard = { prefix: 'fal', iconName: 'address-card', icon: [512, 512, [], "f2bb", "M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm16 336c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V112c0-8.822 7.178-16 16-16h416c8.822 0 16 7.178 16 16v288zm-44-80H332c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h104c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12zm0-64H332c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h104c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12zm0-64H332c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h104c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12zm-197.575 65.948C249.408 244.249 256 226.884 256 208c0-44.112-35.888-80-80-80s-80 35.888-80 80c0 18.884 6.592 36.249 17.575 49.948C75.25 270.543 64 305.706 64 326.363V340c0 24.262 19.738 44 44 44h136c24.262 0 44-19.738 44-44v-13.637c0-20.83-11.439-55.883-49.575-68.415zM176 160c26.51 0 48 21.49 48 48s-21.49 48-48 48-48-21.49-48-48 21.49-48 48-48zm80 180c0 6.627-5.373 12-12 12H108c-6.627 0-12-5.373-12-12v-13.637c0-17.859 11.839-33.555 29.011-38.461l20.641-5.897C155.017 285.859 165.261 288 176 288s20.983-2.141 30.348-5.996l20.641 5.897C244.161 292.808 256 308.503 256 326.363V340z"] };
var faAdjust = { prefix: 'fal', iconName: 'adjust', icon: [512, 512, [], "f042", "M256 40c119.945 0 216 97.337 216 216 0 119.945-97.337 216-216 216-119.945 0-216-97.337-216-216 0-119.945 97.337-216 216-216m0-32C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm-32 124.01v247.98c-53.855-13.8-96-63.001-96-123.99 0-60.99 42.145-110.19 96-123.99M256 96c-88.366 0-160 71.634-160 160s71.634 160 160 160V96z"] };
var faAlarmClock = { prefix: 'fal', iconName: 'alarm-clock', icon: [448, 512, [], "f34e", "M298.3 348.7l-4.5 6.6c-3.8 5.5-11.2 6.8-16.7 3.1l-63.8-43.9c-3.3-2.2-5.2-5.9-5.2-9.9V172c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v122l55.2 38c5.3 3.8 6.7 11.2 3 16.7zM377.6 451l33.7 33.7c6.2 6.2 6.2 16.4 0 22.6-6.2 6.3-16.4 6.2-22.6 0l-36-36C316.3 497 271.9 512 224 512s-92.3-15-128.7-40.7l-36 36c-6.2 6.3-16.4 6.2-22.6 0-6.2-6.2-6.2-16.4 0-22.6L70.4 451C27 410.2 0 352.2 0 288c0-37.7 9.3-73.3 25.8-104.5C9.7 164.1 0 139.2 0 112 0 50.1 50.1 0 112 0c44.8 0 83.4 26.3 101.3 64.2 7.1-.3 14.5-.3 21.3 0C252.4 26.6 290.9 0 336 0c61.9 0 112 50.1 112 112 0 27.2-9.7 52.1-25.8 71.5C438.7 214.7 448 250.3 448 288c0 64.2-27 122.2-70.4 163zM268.9 68.5c55 11.2 102.6 42.5 134.9 85.9 7.7-12.3 12.2-26.8 12.2-42.4 0-44.1-35.9-80-80-80-28.1 0-52.8 14.6-67.1 36.5zM32 112c0 15.6 4.5 30.1 12.2 42.4 32.3-43.4 80-74.7 134.9-85.9C164.8 46.6 140.1 32 112 32c-44.1 0-80 35.9-80 80zm192-16C118 96 32 182 32 288s86 192 192 192 192-86 192-192S330 96 224 96z"] };
var faAlignCenter = { prefix: 'fal', iconName: 'align-center', icon: [448, 512, [], "f037", "M352 52v24a6 6 0 0 1-6 6H102a6 6 0 0 1-6-6V52a6 6 0 0 1 6-6h244a6 6 0 0 1 6 6zM6 210h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm0 256h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm340-164H102a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h244a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6z"] };
var faAlignJustify = { prefix: 'fal', iconName: 'align-justify', icon: [448, 512, [], "f039", "M0 76V52a6 6 0 0 1 6-6h436a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6zm6 134h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm0 256h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm0-128h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6z"] };
var faAlignLeft = { prefix: 'fal', iconName: 'align-left', icon: [448, 512, [], "f036", "M288 52v24a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V52a6 6 0 0 1 6-6h276a6 6 0 0 1 6 6zM6 210h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm0 256h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm276-164H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h276a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6z"] };
var faAlignRight = { prefix: 'fal', iconName: 'align-right', icon: [448, 512, [], "f038", "M160 76V52a6 6 0 0 1 6-6h276a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H166a6 6 0 0 1-6-6zM6 210h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm0 256h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm160-128h276a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H166a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6z"] };
var faAmbulance = { prefix: 'fal', iconName: 'ambulance', icon: [640, 512, [], "f0f9", "M592 32H272c-26.51 0-48 21.49-48 48v48h-44.118a48 48 0 0 0-33.941 14.059l-99.882 99.882A48 48 0 0 0 32 275.882V384H20c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h45.604A80.321 80.321 0 0 0 64 432c0 44.183 35.817 80 80 80s80-35.817 80-80c0-5.48-.554-10.83-1.604-16h195.207a80.321 80.321 0 0 0-1.604 16c0 44.183 35.817 80 80 80s80-35.817 80-80c0-5.48-.554-10.83-1.604-16H592c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zM224 384h-15.999c-14.595-19.43-37.829-32-64.001-32s-49.406 12.57-64.001 32H64V275.882c0-4.274 1.664-8.292 4.686-11.314l99.882-99.882A15.895 15.895 0 0 1 179.882 160H224v224zm384-16c0 8.822-7.177 16-16 16h-31.999c-14.595-19.43-37.829-32-64.001-32s-49.406 12.57-64.001 32H256V80c0-8.822 7.177-16 16-16h320c8.823 0 16 7.178 16 16v288zm-96-160v32c0 6.627-5.373 12-12 12h-56v56c0 6.627-5.373 12-12 12h-32c-6.627 0-12-5.373-12-12v-56h-56c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h56v-56c0-6.627 5.373-12 12-12h32c6.627 0 12 5.373 12 12v56h56c6.627 0 12 5.373 12 12zm-405.757 69.757l75.515-75.515c3.78-3.78 10.243-1.103 10.243 4.243V282a6 6 0 0 1-6 6h-75.515c-5.346 0-8.023-6.463-4.243-10.243zM496 384c26.467 0 48 21.533 48 48s-21.533 48-48 48-48-21.533-48-48 21.533-48 48-48m-352 0c26.467 0 48 21.533 48 48s-21.533 48-48 48-48-21.533-48-48 21.533-48 48-48"] };
var faAmericanSignLanguageInterpreting = { prefix: 'fal', iconName: 'american-sign-language-interpreting', icon: [640, 512, [], "f2a3", "M635.911 213.253c-.045-.093-41.257-83.132-41.257-83.132-9.56-19.264-33.638-28.471-54.396-18.015l-55.286 27.965-78.952-7.382c-5.055-.473-32.514-.683-59.345 15.805-7.534-14.398-18.539-20.492-32.873-26.108 16.996-32.511-6.854-77.022-51.844-70.832C263.498 24.219 241.849 0 213.389 0a48.617 48.617 0 0 0-31.052 11.246c-45.016 37.243-74.076 89.85-81.702 147.675l-32.554 59.166S20.03 245.65 19.942 245.702C1.691 256.481-5.125 279.581 4.088 298.764c.045.094 41.257 83.134 41.257 83.134 9.568 19.272 33.649 28.466 54.398 18.014l55.298-27.971c81.093 7.492 81.198 7.493 82.716 7.493 19.907 0 39.089-5.738 55.551-15.943 4.735 9.067 12.196 16.433 21.549 21.145 2.639 1.327 7.038 3.311 11.342 4.997-16.887 32.303 6.88 77.014 51.844 70.832-1.569 27.845 20.681 51.535 48.6 51.535 11.349 0 22.372-3.995 31.052-11.252 45.011-37.252 74.049-89.855 81.67-147.649l32.555-59.166s48.05-27.563 48.138-27.615c18.252-10.78 25.068-33.881 15.853-53.065zM416.166 450.077c12.527-10.656 23.131-22.35 31.515-34.755 5.014-7.418-4.005-15.969-11.146-11.081-19.896 13.62-41.791 21.968-65.073 24.811-21.645 2.682-26.23-30.802-4.233-33.312 15.382-1.87 30.19-7.025 44.016-15.322 7.743-4.646 2.97-16.618-5.838-14.672-24.314 5.358-52.812 1.72-76.152-9.688-20.755-10.457-4.518-39.824 14.393-30.504 20.417 10.285 44.537 11.747 66.174 4.014 8.409-3.005 6.256-15.533-2.692-15.533-33.381 0-58.926-15.111-71.936-42.561-9.435-19.831 20.546-34.625 29.991-14.407l.051.105c7.006 14.438 21.188 23.408 37.011 23.408 22.551 0 40.897-18.456 40.897-41.141 0-25.412-21.229-41.142-40.897-41.142-15.823 0-30.005 8.97-37.011 23.408l-.051.105c-9.433 20.192-39.439 5.452-29.986-14.418 12.478-26.326 38.591-42.704 68.221-42.808l85.466 7.991a7.967 7.967 0 0 0 4.356-.826l61.414-31.064a8.382 8.382 0 0 1 11.337 3.662l41.097 82.799c2.005 4.223.575 9.3-3.265 11.596l-53.664 30.781a7.994 7.994 0 0 0-3.028 3.083l-38.039 69.132a7.977 7.977 0 0 0-.942 2.976c-5.726 51.666-30.908 98.341-70.955 131.462-16.46 13.817-38.683-11.351-21.031-26.099zM238.061 347.434c-4.683-.397-63.97-5.869-86.953-7.992a7.987 7.987 0 0 0-4.348.827l-61.413 31.064a8.383 8.383 0 0 1-11.338-3.661l-41.096-82.8c-2.005-4.225-.574-9.303 3.267-11.598l53.663-30.779a7.994 7.994 0 0 0 3.028-3.083l38.037-69.132c.507-.92.827-1.932.942-2.976 5.727-51.667 30.909-98.342 70.94-131.449 16.611-13.874 38.728 11.312 21.043 26.087-12.53 10.658-23.133 22.352-31.515 34.755-4.918 7.276 3.882 16.052 11.146 11.081 19.897-13.62 41.791-21.968 65.159-24.822 8.599-1.136 17.074 4.325 18.513 14.601 1.215 9.271-5.077 17.663-14.366 18.723-15.381 1.87-30.189 7.025-44.015 15.322-7.713 4.628-3.022 16.612 5.838 14.672 24.313-5.358 52.814-1.721 76.151 9.688 20.611 10.383 4.667 39.855-14.426 30.486-20.412-10.271-44.515-11.726-66.14-3.996-8.409 3.006-6.256 15.533 2.692 15.533 33.381 0 58.926 15.111 71.935 42.561 9.242 19.424-19.76 34.864-30.041 14.302-7.006-14.438-21.188-23.408-37.011-23.408-22.551 0-40.897 18.456-40.897 41.141 0 25.412 21.229 41.142 40.897 41.142 15.823 0 30.005-8.97 37.011-23.408.018-.035.034-.071.051-.106 9.448-20.224 39.417-5.41 29.985 14.419-12.279 25.911-38.45 42.687-66.739 42.806zm9.906-74.853c-1.954 3.338-3.55 9.141-10.211 9.141-2.787 0-8.897-2.302-8.897-9.141 0-5.126 3.908-9.141 8.897-9.141 6.598-.001 8.158 5.634 10.211 9.141zm144.065-33.142c1.947-3.326 3.544-9.141 10.211-9.141 2.787 0 8.898 2.302 8.898 9.141 0 5.126-3.908 9.141-8.898 9.141-6.598 0-8.157-5.634-10.211-9.141z"] };
var faAnchor = { prefix: 'fal', iconName: 'anchor', icon: [576, 512, [], "f13d", "M504.485 264.485c-4.686-4.686-12.284-4.686-16.971 0l-67.029 67.029c-7.56 7.56-2.206 20.485 8.485 20.485h49.129C461.111 420.749 390.501 473.6 304 479.452V192h52c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-52v-34.016c28.513-7.339 49.336-33.833 47.933-64.947-1.48-32.811-28.101-59.458-60.911-60.967C254.302-1.619 224 27.652 224 64c0 29.821 20.396 54.879 48 61.984V160h-52c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h52v287.452C185.498 473.6 114.888 420.749 97.901 352h49.129c10.691 0 16.045-12.926 8.485-20.485l-67.029-67.03c-4.686-4.686-12.284-4.686-16.971 0l-67.029 67.03C-3.074 339.074 2.28 352 12.971 352h52.136C83.963 448.392 182.863 512 288 512c110.901 0 204.938-68.213 222.893-160h52.136c10.691 0 16.045-12.926 8.485-20.485l-67.029-67.03zM256 64c0-17.645 14.355-32 32-32s32 14.355 32 32-14.355 32-32 32-32-14.355-32-32zM61.255 320L80 301.255 98.745 320h-37.49zm416 0L496 301.255 514.745 320h-37.49z"] };
var faAngleDoubleDown = { prefix: 'fal', iconName: 'angle-double-down', icon: [256, 512, [], "f103", "M119.5 262.9L3.5 145.1c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0L128 223.3l100.4-102.2c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L136.5 263c-4.7 4.6-12.3 4.6-17-.1zm17 128l116-117.8c4.7-4.7 4.7-12.3 0-17l-7.1-7.1c-4.7-4.7-12.3-4.7-17 0L128 351.3 27.6 249.1c-4.7-4.7-12.3-4.7-17 0l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17l116 117.8c4.7 4.6 12.3 4.6 17-.1z"] };
var faAngleDoubleLeft = { prefix: 'fal', iconName: 'angle-double-left', icon: [320, 512, [], "f100", "M153.1 247.5l117.8-116c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L192.7 256l102.2 100.4c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0L153 264.5c-4.6-4.7-4.6-12.3.1-17zm-128 17l117.8 116c4.7 4.7 12.3 4.7 17 0l7.1-7.1c4.7-4.7 4.7-12.3 0-17L64.7 256l102.2-100.4c4.7-4.7 4.7-12.3 0-17l-7.1-7.1c-4.7-4.7-12.3-4.7-17 0L25 247.5c-4.6 4.7-4.6 12.3.1 17z"] };
var faAngleDoubleRight = { prefix: 'fal', iconName: 'angle-double-right', icon: [320, 512, [], "f101", "M166.9 264.5l-117.8 116c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17L127.3 256 25.1 155.6c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0l117.8 116c4.6 4.7 4.6 12.3-.1 17zm128-17l-117.8-116c-4.7-4.7-12.3-4.7-17 0l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17L255.3 256 153.1 356.4c-4.7 4.7-4.7 12.3 0 17l7.1 7.1c4.7 4.7 12.3 4.7 17 0l117.8-116c4.6-4.7 4.6-12.3-.1-17z"] };
var faAngleDoubleUp = { prefix: 'fal', iconName: 'angle-double-up', icon: [256, 512, [], "f102", "M136.5 249.1l116 117.8c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0L128 288.7 27.6 390.9c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17l116-117.8c4.7-4.6 12.3-4.6 17 .1zm-17-128L3.5 238.9c-4.7 4.7-4.7 12.3 0 17l7.1 7.1c4.7 4.7 12.3 4.7 17 0L128 160.7l100.4 102.2c4.7 4.7 12.3 4.7 17 0l7.1-7.1c4.7-4.7 4.7-12.3 0-17L136.5 121c-4.7-4.6-12.3-4.6-17 .1z"] };
var faAngleDown = { prefix: 'fal', iconName: 'angle-down', icon: [256, 512, [], "f107", "M119.5 326.9L3.5 209.1c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0L128 287.3l100.4-102.2c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L136.5 327c-4.7 4.6-12.3 4.6-17-.1z"] };
var faAngleLeft = { prefix: 'fal', iconName: 'angle-left', icon: [192, 512, [], "f104", "M25.1 247.5l117.8-116c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L64.7 256l102.2 100.4c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0L25 264.5c-4.6-4.7-4.6-12.3.1-17z"] };
var faAngleRight = { prefix: 'fal', iconName: 'angle-right', icon: [192, 512, [], "f105", "M166.9 264.5l-117.8 116c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17L127.3 256 25.1 155.6c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0l117.8 116c4.6 4.7 4.6 12.3-.1 17z"] };
var faAngleUp = { prefix: 'fal', iconName: 'angle-up', icon: [256, 512, [], "f106", "M136.5 185.1l116 117.8c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0L128 224.7 27.6 326.9c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17l116-117.8c4.7-4.6 12.3-4.6 17 .1z"] };
var faArchive = { prefix: 'fal', iconName: 'archive', icon: [512, 512, [], "f187", "M464 32H48C21.533 32 0 53.533 0 80v32c0 22.105 15.024 40.757 35.393 46.308A47.726 47.726 0 0 0 32 176v256c0 26.467 21.533 48 48 48h352c26.467 0 48-21.533 48-48V176a47.726 47.726 0 0 0-3.393-17.692C496.976 152.757 512 134.105 512 112V80c0-26.467-21.533-48-48-48zm-16 400c0 8.837-7.164 16-16 16H80c-8.837 0-16-7.163-16-16V176c0-8.837 7.163-16 16-16h352c8.836 0 16 7.163 16 16v256zm32-320c0 8.837-7.163 16-16 16H48c-8.837 0-16-7.163-16-16V80c0-8.837 7.163-16 16-16h416c8.837 0 16 7.163 16 16v32zM308 256H204c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h104c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12z"] };
var faArrowAltCircleDown = { prefix: 'fal', iconName: 'arrow-alt-circle-down', icon: [512, 512, [], "f358", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm216 248c0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216zm-88-32h-64V120c0-13.2-10.8-24-24-24h-80c-13.2 0-24 10.8-24 24v104h-64c-28.4 0-42.8 34.5-22.6 54.6l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c20-20.1 5.8-54.6-22.7-54.6zM256 384L128 256h96V128h64v128h96L256 384z"] };
var faArrowAltCircleLeft = { prefix: 'fal', iconName: 'arrow-alt-circle-left', icon: [512, 512, [], "f359", "M504 256C504 119 393 8 256 8S8 119 8 256s111 248 248 248 248-111 248-248zM256 472c-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216zm32-88v-64h104c13.2 0 24-10.8 24-24v-80c0-13.2-10.8-24-24-24H288v-64c0-28.4-34.5-42.8-54.6-22.6l-128 128c-12.5 12.5-12.5 32.8 0 45.3l128 128c20.1 20 54.6 5.8 54.6-22.7zM128 256l128-128v96h128v64H256v96L128 256z"] };
var faArrowAltCircleRight = { prefix: 'fal', iconName: 'arrow-alt-circle-right', icon: [512, 512, [], "f35a", "M8 256c0 137 111 248 248 248s248-111 248-248S393 8 256 8 8 119 8 256zM256 40c118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216zm-32 88v64H120c-13.2 0-24 10.8-24 24v80c0 13.2 10.8 24 24 24h104v64c0 28.4 34.5 42.8 54.6 22.6l128-128c12.5-12.5 12.5-32.8 0-45.3l-128-128c-20.1-20-54.6-5.8-54.6 22.7zm160 128L256 384v-96H128v-64h128v-96l128 128z"] };
var faArrowAltCircleUp = { prefix: 'fal', iconName: 'arrow-alt-circle-up', icon: [512, 512, [], "f35b", "M256 504c137 0 248-111 248-248S393 8 256 8 8 119 8 256s111 248 248 248zM40 256c0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216zm88 32h64v104c0 13.2 10.8 24 24 24h80c13.2 0 24-10.8 24-24V288h64c28.4 0 42.8-34.5 22.6-54.6l-128-128c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-20 20.1-5.8 54.6 22.7 54.6zm128-160l128 128h-96v128h-64V256h-96l128-128z"] };
var faArrowAltDown = { prefix: 'fal', iconName: 'arrow-alt-down', icon: [448, 512, [], "f354", "M267.427 64C278.789 64 288 73.211 288 84.572v171.437h116.979c7.125 0 10.695 8.612 5.66 13.653L238.556 441.965c-8.036 8.046-21.076 8.047-29.112 0L37.36 269.662c-5.035-5.041-1.464-13.653 5.66-13.653H160V84.572C160 73.211 169.211 64 180.573 64h86.854m0-32h-86.855C151.584 32 128 55.584 128 84.572v139.437H43.021c-35.507 0-53.497 43.04-28.302 68.266l172.083 172.303c20.55 20.576 53.842 20.58 74.396 0l172.083-172.303c25.091-25.122 7.351-68.266-28.302-68.266H320V84.572C320 55.584 296.416 32 267.427 32z"] };
var faArrowAltFromBottom = { prefix: 'fal', iconName: 'arrow-alt-from-bottom', icon: [384, 512, [], "f346", "M372 480H12c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h360c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12zm-218.9-96h77.7c8.8 0 16-7.2 16-16V224h93.9c7.1 0 10.7-8.6 5.7-13.6L203.3 66.8c-6.3-6.3-16.4-6.3-22.7 0l-143 143.6c-5 5-1.5 13.6 5.7 13.6h93.9v144c-.1 8.8 7.1 16 15.9 16m0 32c-26.5 0-48-21.5-48-48V256H43.3c-35.6 0-53.4-43.1-28.3-68.2L158 44.2c18.8-18.8 49.2-18.8 68 0l143.1 143.5c25.2 25.2 7.2 68.2-28.3 68.2h-61.9v112c0 26.5-21.5 48-48 48h-77.8v.1z"] };
var faArrowAltFromLeft = { prefix: 'fal', iconName: 'arrow-alt-from-left', icon: [448, 512, [], "f347", "M0 436V76c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v360c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12zm96-218.9v77.7c0 8.8 7.2 16 16 16h144v93.9c0 7.1 8.6 10.7 13.6 5.7l141.6-143.1c6.3-6.3 6.3-16.4 0-22.7l-141.6-143c-5-5-13.6-1.5-13.6 5.7v93.9H112c-8.8-.1-16 7.1-16 15.9m-32 0c0-26.5 21.5-48 48-48h112v-61.9c0-35.6 43.1-53.4 68.2-28.3L433.9 222c18.8 18.8 18.8 49.2 0 68L292.2 433.1c-25.2 25.2-68.2 7.2-68.2-28.3v-61.9H112c-26.5 0-48-21.5-48-48v-77.8z"] };
var faArrowAltFromRight = { prefix: 'fal', iconName: 'arrow-alt-from-right', icon: [448, 512, [], "f348", "M448 76v360c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12V76c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12zm-96 218.9v-77.7c0-8.8-7.2-16-16-16H192v-93.9c0-7.1-8.6-10.7-13.6-5.7L36.7 244.7c-6.3 6.3-6.3 16.4 0 22.7l141.6 143.1c5 5 13.6 1.5 13.6-5.7v-93.9h144c8.9 0 16.1-7.2 16.1-16m32 0c0 26.5-21.5 48-48 48H224v61.9c0 35.6-43.1 53.4-68.2 28.3L14.1 290c-18.8-18.8-18.8-49.2 0-68L155.8 78.9C181 53.8 224 71.8 224 107.3v61.9h112c26.5 0 48 21.5 48 48v77.7z"] };
var faArrowAltFromTop = { prefix: 'fal', iconName: 'arrow-alt-from-top', icon: [384, 512, [], "f349", "M12 32h360c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H12C5.4 64 0 58.6 0 52v-8c0-6.6 5.4-12 12-12zm218.9 96h-77.7c-8.8 0-16 7.2-16 16v144H43.3c-7.1 0-10.7 8.6-5.7 13.6l143.1 143.5c6.3 6.3 16.4 6.3 22.7 0l143.1-143.5c5-5 1.5-13.6-5.7-13.6h-93.9V144c0-8.8-7.2-16-16-16m0-32c26.5 0 48 21.5 48 48v112h61.9c35.6 0 53.4 43.1 28.3 68.2L226 467.8c-18.8 18.8-49.2 18.8-68 0L14.9 324.2C-10.2 299 7.8 256 43.3 256h61.9V144c0-26.5 21.5-48 48-48h77.7z"] };
var faArrowAltLeft = { prefix: 'fal', iconName: 'arrow-alt-left', icon: [448, 512, [], "f355", "M416.012 299.427c0 11.362-9.211 20.573-20.572 20.573H224.002v116.979c0 7.125-8.612 10.695-13.653 5.66L38.047 270.556c-8.046-8.036-8.047-21.076 0-29.112L210.349 69.36c5.041-5.035 13.653-1.464 13.653 5.66V192h171.437c11.362 0 20.572 9.211 20.572 20.573v86.854m32.001 0v-86.855c0-28.989-23.584-52.573-52.572-52.573H256.002V75.021c0-35.507-43.04-53.497-68.266-28.302L15.433 218.802c-20.576 20.55-20.58 53.842 0 74.396l172.303 172.083c25.122 25.091 68.266 7.351 68.266-28.302V352h139.437c28.989 0 52.573-23.584 52.573-52.573z"] };
var faArrowAltRight = { prefix: 'fal', iconName: 'arrow-alt-right', icon: [448, 512, [], "f356", "M32 212.573C32 201.211 41.211 192 52.572 192h171.437V75.021c0-7.125 8.612-10.695 13.653-5.66l172.303 172.083c8.046 8.036 8.047 21.076 0 29.112L237.662 442.64c-5.041 5.035-13.653 1.464-13.653-5.66V320H52.572C41.211 320 32 310.789 32 299.427v-86.854m-32 0v86.855C0 328.416 23.584 352 52.572 352h139.437v84.979c0 35.507 43.04 53.497 68.266 28.302l172.303-172.083c20.576-20.55 20.58-53.842 0-74.396L260.276 46.719c-25.122-25.091-68.266-7.351-68.266 28.302V160H52.572C23.584 160 0 183.584 0 212.573z"] };
var faArrowAltSquareDown = { prefix: 'fal', iconName: 'arrow-alt-square-down', icon: [448, 512, [], "f350", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352zm-64-208h-64V120c0-13.2-10.8-24-24-24h-80c-13.2 0-24 10.8-24 24v104H96c-28.4 0-42.8 34.5-22.6 54.6l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c20-20.1 5.8-54.6-22.7-54.6zM224 384L96 256h96V128h64v128h96L224 384z"] };
var faArrowAltSquareLeft = { prefix: 'fal', iconName: 'arrow-alt-square-left', icon: [448, 512, [], "f351", "M448 432V80c0-26.5-21.5-48-48-48H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48zM48 448c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48zm208-64v-64h104c13.2 0 24-10.8 24-24v-80c0-13.2-10.8-24-24-24H256v-64c0-28.4-34.5-42.8-54.6-22.6l-128 128c-12.5 12.5-12.5 32.8 0 45.3l128 128c20.1 20 54.6 5.8 54.6-22.7zM96 256l128-128v96h128v64H224v96L96 256z"] };
var faArrowAltSquareRight = { prefix: 'fal', iconName: 'arrow-alt-square-right', icon: [448, 512, [], "f352", "M0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48H48C21.5 32 0 53.5 0 80zm400-16c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352zm-208 64v64H88c-13.2 0-24 10.8-24 24v80c0 13.2 10.8 24 24 24h104v64c0 28.4 34.5 42.8 54.6 22.6l128-128c12.5-12.5 12.5-32.8 0-45.3l-128-128c-20.1-20-54.6-5.8-54.6 22.7zm160 128L224 384v-96H96v-64h128v-96l128 128z"] };
var faArrowAltSquareUp = { prefix: 'fal', iconName: 'arrow-alt-square-up', icon: [448, 512, [], "f353", "M48 480h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48zM32 80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80zm64 208h64v104c0 13.2 10.8 24 24 24h80c13.2 0 24-10.8 24-24V288h64c28.4 0 42.8-34.5 22.6-54.6l-128-128c-12.5-12.5-32.8-12.5-45.3 0l-128 128C53.3 253.5 67.5 288 96 288zm128-160l128 128h-96v128h-64V256H96l128-128z"] };
var faArrowAltToBottom = { prefix: 'fal', iconName: 'arrow-alt-to-bottom', icon: [384, 512, [], "f34a", "M230.9 64c8.8 0 16 7.2 16 16v144h93.9c7.1 0 10.7 8.6 5.7 13.6L203.3 381.2c-6.3 6.3-16.4 6.3-22.7 0l-143-143.6c-5-5-1.5-13.6 5.7-13.6h93.9V80c0-8.8 7.2-16 16-16h77.7m0-32h-77.7c-26.5 0-48 21.5-48 48v112H43.3c-35.5 0-53.5 43-28.3 68.2l143 143.6c18.8 18.8 49.2 18.8 68 0l143.1-143.5c25.1-25.1 7.3-68.2-28.3-68.2h-61.9V80c0-26.5-21.6-48-48-48zM384 468v-8c0-6.6-5.4-12-12-12H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h360c6.6 0 12-5.4 12-12z"] };
var faArrowAltToLeft = { prefix: 'fal', iconName: 'arrow-alt-to-left', icon: [448, 512, [], "f34b", "M416 294.9c0 8.8-7.2 16-16 16H256v93.9c0 7.1-8.6 10.7-13.6 5.7L98.8 267.3c-6.3-6.3-6.3-16.4 0-22.7l143.5-143.1c5-5 13.6-1.5 13.6 5.7v93.9h144c8.8 0 16 7.2 16 16v77.8m32.1 0v-77.7c0-26.5-21.5-48-48-48H288v-61.9c0-35.5-43-53.5-68.2-28.3L76.2 222c-18.8 18.8-18.8 49.2 0 68l143.5 143.1c25.1 25.1 68.2 7.3 68.2-28.3v-61.9h112c26.6 0 48.1-21.6 48.1-48zM12 448h8c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12h-8C5.4 64 0 69.4 0 76v360c0 6.6 5.4 12 12 12z"] };
var faArrowAltToRight = { prefix: 'fal', iconName: 'arrow-alt-to-right', icon: [448, 512, [], "f34c", "M32 217.1c0-8.8 7.2-16 16-16h144v-93.9c0-7.1 8.6-10.7 13.6-5.7l143.5 143.1c6.3 6.3 6.3 16.4 0 22.7L205.6 410.4c-5 5-13.6 1.5-13.6-5.7v-93.9H48c-8.8 0-16-7.2-16-16v-77.7m-32 0v77.7c0 26.5 21.5 48 48 48h112v61.9c0 35.5 43 53.5 68.2 28.3l143.6-143c18.8-18.8 18.8-49.2 0-68L228.2 78.9c-25.1-25.1-68.2-7.3-68.2 28.3v61.9H48c-26.5 0-48 21.6-48 48zM436 64h-8c-6.6 0-12 5.4-12 12v360c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12z"] };
var faArrowAltToTop = { prefix: 'fal', iconName: 'arrow-alt-to-top', icon: [384, 512, [], "f34d", "M153.1 448c-8.8 0-16-7.2-16-16V288H43.3c-7.1 0-10.7-8.6-5.7-13.6l143.1-143.5c6.3-6.3 16.4-6.3 22.7 0l143.1 143.5c5 5 1.5 13.6-5.7 13.6h-93.9v144c0 8.8-7.2 16-16 16h-77.8m0 32h77.7c26.5 0 48-21.5 48-48V320h61.9c35.5 0 53.5-43 28.3-68.2L226 108.2c-18.8-18.8-49.2-18.8-68 0L14.9 251.8c-25 25.1-7.3 68.2 28.4 68.2h61.9v112c-.1 26.5 21.5 48 47.9 48zM0 44v8c0 6.6 5.4 12 12 12h360c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12H12C5.4 32 0 37.4 0 44z"] };
var faArrowAltUp = { prefix: 'fal', iconName: 'arrow-alt-up', icon: [448, 512, [], "f357", "M180.573 448C169.211 448 160 438.789 160 427.428V255.991H43.021c-7.125 0-10.695-8.612-5.66-13.653L209.444 70.035c8.036-8.046 21.076-8.047 29.112 0L410.64 242.338c5.035 5.041 1.464 13.653-5.66 13.653H288v171.437C288 438.79 278.789 448 267.427 448h-86.854m0 32h86.855C296.416 480 320 456.416 320 427.428V287.991h84.979c35.507 0 53.497-43.04 28.302-68.266L261.198 47.422c-20.55-20.576-53.842-20.58-74.396 0L14.719 219.724c-25.091 25.122-7.351 68.266 28.302 68.266H128v139.437C128 456.416 151.584 480 180.573 480z"] };
var faArrowCircleDown = { prefix: 'fal', iconName: 'arrow-circle-down', icon: [512, 512, [], "f0ab", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm216 248c0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216zm-92.5-4.5l-6.9-6.9c-4.7-4.7-12.5-4.7-17.1.2L273 330.3V140c0-6.6-5.4-12-12-12h-10c-6.6 0-12 5.4-12 12v190.3l-82.5-85.6c-4.7-4.8-12.4-4.9-17.1-.2l-6.9 6.9c-4.7 4.7-4.7 12.3 0 17l115 115.1c4.7 4.7 12.3 4.7 17 0l115-115.1c4.7-4.6 4.7-12.2 0-16.9z"] };
var faArrowCircleLeft = { prefix: 'fal', iconName: 'arrow-circle-left', icon: [512, 512, [], "f0a8", "M504 256C504 119 393 8 256 8S8 119 8 256s111 248 248 248 248-111 248-248zM256 472c-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216zm-12.5-92.5l-115.1-115c-4.7-4.7-4.7-12.3 0-17l115.1-115c4.7-4.7 12.3-4.7 17 0l6.9 6.9c4.7 4.7 4.7 12.5-.2 17.1L181.7 239H372c6.6 0 12 5.4 12 12v10c0 6.6-5.4 12-12 12H181.7l85.6 82.5c4.8 4.7 4.9 12.4.2 17.1l-6.9 6.9c-4.8 4.7-12.4 4.7-17.1 0z"] };
var faArrowCircleRight = { prefix: 'fal', iconName: 'arrow-circle-right', icon: [512, 512, [], "f0a9", "M8 256c0 137 111 248 248 248s248-111 248-248S393 8 256 8 8 119 8 256zM256 40c118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216zm12.5 92.5l115.1 115c4.7 4.7 4.7 12.3 0 17l-115.1 115c-4.7 4.7-12.3 4.7-17 0l-6.9-6.9c-4.7-4.7-4.7-12.5.2-17.1l85.6-82.5H140c-6.6 0-12-5.4-12-12v-10c0-6.6 5.4-12 12-12h190.3l-85.6-82.5c-4.8-4.7-4.9-12.4-.2-17.1l6.9-6.9c4.8-4.7 12.4-4.7 17.1 0z"] };
var faArrowCircleUp = { prefix: 'fal', iconName: 'arrow-circle-up', icon: [512, 512, [], "f0aa", "M256 504c137 0 248-111 248-248S393 8 256 8 8 119 8 256s111 248 248 248zM40 256c0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216zm92.5-12.5l115-115.1c4.7-4.7 12.3-4.7 17 0l115 115.1c4.7 4.7 4.7 12.3 0 17l-6.9 6.9c-4.7 4.7-12.5 4.7-17.1-.2L273 181.7V372c0 6.6-5.4 12-12 12h-10c-6.6 0-12-5.4-12-12V181.7l-82.5 85.6c-4.7 4.8-12.4 4.9-17.1.2l-6.9-6.9c-4.7-4.8-4.7-12.4 0-17.1z"] };
var faArrowDown = { prefix: 'fal', iconName: 'arrow-down', icon: [448, 512, [], "f063", "M443.5 248.5l-7.1-7.1c-4.7-4.7-12.3-4.7-17 0L241 419.9V44c0-6.6-5.4-12-12-12h-10c-6.6 0-12 5.4-12 12v375.9L28.5 241.4c-4.7-4.7-12.3-4.7-17 0l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17l211 211.1c4.7 4.7 12.3 4.7 17 0l211-211.1c4.8-4.8 4.8-12.3.1-17z"] };
var faArrowFromBottom = { prefix: 'fal', iconName: 'arrow-from-bottom', icon: [384, 512, [], "f342", "M35.5 184l148-148.5c4.7-4.7 12.3-4.7 17 0l148 148.5c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0L209 92.1V404c0 6.6-5.4 12-12 12h-10c-6.6 0-12-5.4-12-12V92.1L59.6 208c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.6-4.7-12.2 0-16.9zM384 468v-8c0-6.6-5.4-12-12-12H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h360c6.6 0 12-5.4 12-12z"] };
var faArrowFromLeft = { prefix: 'fal', iconName: 'arrow-from-left', icon: [448, 512, [], "f343", "M296 99.5l148.5 148c4.7 4.7 4.7 12.3 0 17L296 412.5c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17l116-115.4H76c-6.6 0-12-5.4-12-12v-10c0-6.6 5.4-12 12-12h311.9L272 123.6c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.6-4.7 12.2-4.7 16.9 0zM12 448h8c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12h-8C5.4 64 0 69.4 0 76v360c0 6.6 5.4 12 12 12z"] };
var faArrowFromRight = { prefix: 'fal', iconName: 'arrow-from-right', icon: [448, 512, [], "f344", "M152 412.5L3.5 264.5c-4.7-4.7-4.7-12.3 0-17L152 99.5c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L60.1 239H372c6.6 0 12 5.4 12 12v10c0 6.6-5.4 12-12 12H60.1L176 388.4c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.6 4.7-12.2 4.7-16.9 0zM436 64h-8c-6.6 0-12 5.4-12 12v360c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12z"] };
var faArrowFromTop = { prefix: 'fal', iconName: 'arrow-from-top', icon: [384, 512, [], "f345", "M348.5 328l-148 148.5c-4.7 4.7-12.3 4.7-17 0L35.5 328c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0l115.4 116V108c0-6.6 5.4-12 12-12h10c6.6 0 12 5.4 12 12v311.9L324.4 304c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.6 4.7 12.2 0 16.9zM0 44v8c0 6.6 5.4 12 12 12h360c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12H12C5.4 32 0 37.4 0 44z"] };
var faArrowLeft = { prefix: 'fal', iconName: 'arrow-left', icon: [448, 512, [], "f060", "M231.536 475.535l7.071-7.07c4.686-4.686 4.686-12.284 0-16.971L60.113 273H436c6.627 0 12-5.373 12-12v-10c0-6.627-5.373-12-12-12H60.113L238.607 60.506c4.686-4.686 4.686-12.284 0-16.971l-7.071-7.07c-4.686-4.686-12.284-4.686-16.97 0L3.515 247.515c-4.686 4.686-4.686 12.284 0 16.971l211.051 211.05c4.686 4.686 12.284 4.686 16.97-.001z"] };
var faArrowRight = { prefix: 'fal', iconName: 'arrow-right', icon: [448, 512, [], "f061", "M216.464 36.465l-7.071 7.07c-4.686 4.686-4.686 12.284 0 16.971L387.887 239H12c-6.627 0-12 5.373-12 12v10c0 6.627 5.373 12 12 12h375.887L209.393 451.494c-4.686 4.686-4.686 12.284 0 16.971l7.071 7.07c4.686 4.686 12.284 4.686 16.97 0l211.051-211.05c4.686-4.686 4.686-12.284 0-16.971L233.434 36.465c-4.686-4.687-12.284-4.687-16.97 0z"] };
var faArrowSquareDown = { prefix: 'fal', iconName: 'arrow-square-down', icon: [448, 512, [], "f339", "M347.5 268.5l-115 115.1c-4.7 4.7-12.3 4.7-17 0l-115-115.1c-4.7-4.7-4.7-12.3 0-17l6.9-6.9c4.7-4.7 12.5-4.7 17.1.2l82.5 85.6V140c0-6.6 5.4-12 12-12h10c6.6 0 12 5.4 12 12v190.3l82.5-85.6c4.7-4.8 12.4-4.9 17.1-.2l6.9 6.9c4.7 4.8 4.7 12.4 0 17.1zM448 80v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h352c26.5 0 48 21.5 48 48zm-32 0c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v352c0 8.8 7.2 16 16 16h352c8.8 0 16-7.2 16-16V80z"] };
var faArrowSquareLeft = { prefix: 'fal', iconName: 'arrow-square-left', icon: [448, 512, [], "f33a", "M211.5 379.5l-115.1-115c-4.7-4.7-4.7-12.3 0-17l115.1-115c4.7-4.7 12.3-4.7 17 0l6.9 6.9c4.7 4.7 4.7 12.5-.2 17.1L149.7 239H340c6.6 0 12 5.4 12 12v10c0 6.6-5.4 12-12 12H149.7l85.6 82.5c4.8 4.7 4.9 12.4.2 17.1l-6.9 6.9c-4.8 4.7-12.4 4.7-17.1 0zM400 480H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h352c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48zm0-32c8.8 0 16-7.2 16-16V80c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v352c0 8.8 7.2 16 16 16h352z"] };
var faArrowSquareRight = { prefix: 'fal', iconName: 'arrow-square-right', icon: [448, 512, [], "f33b", "M236.5 132.5l115.1 115c4.7 4.7 4.7 12.3 0 17l-115.1 115c-4.7 4.7-12.3 4.7-17 0l-6.9-6.9c-4.7-4.7-4.7-12.5.2-17.1l85.6-82.5H108c-6.6 0-12-5.4-12-12v-10c0-6.6 5.4-12 12-12h190.3l-85.6-82.5c-4.8-4.7-4.9-12.4-.2-17.1l6.9-6.9c4.8-4.7 12.4-4.7 17.1 0zM48 32h352c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48zm0 32c-8.8 0-16 7.2-16 16v352c0 8.8 7.2 16 16 16h352c8.8 0 16-7.2 16-16V80c0-8.8-7.2-16-16-16H48z"] };
var faArrowSquareUp = { prefix: 'fal', iconName: 'arrow-square-up', icon: [448, 512, [], "f33c", "M100.5 243.5l115-115.1c4.7-4.7 12.3-4.7 17 0l115 115.1c4.7 4.7 4.7 12.3 0 17l-6.9 6.9c-4.7 4.7-12.5 4.7-17.1-.2L241 181.7V372c0 6.6-5.4 12-12 12h-10c-6.6 0-12-5.4-12-12V181.7l-82.5 85.6c-4.7 4.8-12.4 4.9-17.1.2l-6.9-6.9c-4.7-4.8-4.7-12.4 0-17.1zM0 432V80c0-26.5 21.5-48 48-48h352c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48zm32 0c0 8.8 7.2 16 16 16h352c8.8 0 16-7.2 16-16V80c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v352z"] };
var faArrowToBottom = { prefix: 'fal', iconName: 'arrow-to-bottom', icon: [384, 512, [], "f33d", "M348.5 264l-148 148.5c-4.7 4.7-12.3 4.7-17 0L35.5 264c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0l115.4 116V44c0-6.6 5.4-12 12-12h10c6.6 0 12 5.4 12 12v311.9L324.4 240c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.6 4.7 12.2 0 16.9zM384 468v-8c0-6.6-5.4-12-12-12H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h360c6.6 0 12-5.4 12-12z"] };
var faArrowToLeft = { prefix: 'fal', iconName: 'arrow-to-left', icon: [448, 512, [], "f33e", "M216 412.5l-148.5-148c-4.7-4.7-4.7-12.3 0-17L216 99.5c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L124.1 239H436c6.6 0 12 5.4 12 12v10c0 6.6-5.4 12-12 12H124.1L240 388.4c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.6 4.7-12.2 4.7-16.9 0zM12 448h8c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12h-8C5.4 64 0 69.4 0 76v360c0 6.6 5.4 12 12 12z"] };
var faArrowToRight = { prefix: 'fal', iconName: 'arrow-to-right', icon: [448, 512, [], "f340", "M215 99.5l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17l116 115.4H12c-6.6 0-12 5.4-12 12v10c0 6.6 5.4 12 12 12h311.9L208 388.4c-4.7 4.7-4.7 12.3 0 17l7.1 7.1c4.7 4.7 12.3 4.7 17 0l148.5-148c4.7-4.7 4.7-12.3 0-17L232 99.5c-4.7-4.7-12.3-4.7-17 0zM448 76v360c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12V76c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12z"] };
var faArrowToTop = { prefix: 'fal', iconName: 'arrow-to-top', icon: [384, 512, [], "f341", "M35.5 248l148-148.5c4.7-4.7 12.3-4.7 17 0l148 148.5c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0L209 156.1V468c0 6.6-5.4 12-12 12h-10c-6.6 0-12-5.4-12-12V156.1L59.6 272c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.6-4.7-12.2 0-16.9zM0 44v8c0 6.6 5.4 12 12 12h360c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12H12C5.4 32 0 37.4 0 44z"] };
var faArrowUp = { prefix: 'fal', iconName: 'arrow-up', icon: [448, 512, [], "f062", "M4.465 263.536l7.07 7.071c4.686 4.686 12.284 4.686 16.971 0L207 92.113V468c0 6.627 5.373 12 12 12h10c6.627 0 12-5.373 12-12V92.113l178.494 178.493c4.686 4.686 12.284 4.686 16.971 0l7.07-7.071c4.686-4.686 4.686-12.284 0-16.97l-211.05-211.05c-4.686-4.686-12.284-4.686-16.971 0L4.465 246.566c-4.687 4.686-4.687 12.284 0 16.97z"] };
var faArrows = { prefix: 'fal', iconName: 'arrows', icon: [512, 512, [], "f047", "M337.782 434.704l-73.297 73.782c-4.686 4.686-12.284 4.686-16.971 0l-73.296-73.782c-4.686-4.686-4.686-12.284 0-16.97l7.07-7.07c4.686-4.686 12.284-4.686 16.971 0L239 451.887h1V272H60.113v1l41.224 40.741c4.686 4.686 4.686 12.284 0 16.971l-7.071 7.07c-4.686 4.686-12.284 4.686-16.97 0L3.515 264.485c-4.686-4.686-4.686-12.284 0-16.971l73.782-73.297c4.686-4.686 12.284-4.686 16.971 0l7.071 7.071c4.686 4.686 4.686 12.284 0 16.971L60.113 239v1H240V60.113h-1l-40.741 41.224c-4.686 4.686-12.284 4.686-16.971 0l-7.07-7.071c-4.686-4.686-4.687-12.284 0-16.97l73.297-73.782c4.686-4.686 12.284-4.686 16.971 0l73.297 73.782c4.686 4.686 4.686 12.284 0 16.971l-7.071 7.071c-4.686 4.686-12.284 4.686-16.971 0L273 60.113h-1V240h179.887v-1l-41.224-40.741c-4.686-4.686-4.686-12.284 0-16.971l7.071-7.07c4.686-4.686 12.284-4.686 16.97 0l73.782 73.297c4.687 4.686 4.686 12.284 0 16.971l-73.782 73.297c-4.686 4.686-12.284 4.686-16.97 0l-7.071-7.07c-4.686-4.686-4.686-12.284 0-16.971L451.887 273v-1H272v179.887h1l40.741-41.224c4.686-4.686 12.284-4.686 16.971 0l7.07 7.071c4.686 4.685 4.686 12.283 0 16.97z"] };
var faArrowsAlt = { prefix: 'fal', iconName: 'arrows-alt', icon: [512, 512, [], "f0b2", "M322.469 379.56L272 379.558V272h107.556l-.003 50.467c0 29.287 35.534 44.064 56.284 23.314l66.506-66.467c12.875-12.875 12.877-33.751 0-46.627l-66.499-66.466c-20.709-20.709-56.284-6.032-56.284 23.314L379.558 240H272V132.444l50.463.003c29.287 0 44.064-35.534 23.314-56.284L279.31 9.657c-12.875-12.875-33.751-12.877-46.627 0l-66.466 66.499c-20.709 20.709-6.032 56.284 23.314 56.284l50.469.002V240H132.444l.003-50.467c0-29.287-35.533-44.064-56.284-23.314L9.657 232.686c-12.875 12.875-12.877 33.751 0 46.628l66.499 66.466c20.709 20.709 56.284 6.032 56.284-23.314l.002-50.466H240v107.556l-50.463-.003c-29.287 0-44.064 35.534-23.314 56.284l66.467 66.506c12.875 12.875 33.751 12.877 46.627 0l66.466-66.499c20.709-20.709 6.032-56.284-23.314-56.284zm92.981-192.935l66.493 66.46a4.117 4.117 0 0 1 .006 5.823l-66.512 66.473c-2.61 2.609-7.036.746-7.036-2.914l.007-132.932c.002-3.656 4.428-5.524 7.042-2.91zM189.531 103.59c-3.655 0-5.523-4.426-2.909-7.041l66.46-66.493a4.117 4.117 0 0 1 5.823-.006l66.473 66.512c2.609 2.61.746 7.036-2.914 7.036l-132.933-.008zM96.55 325.375l-66.493-66.46a4.117 4.117 0 0 1-.006-5.823l66.512-66.473c2.61-2.609 7.036-.746 7.036 2.914l-.007 132.932c-.002 3.656-4.428 5.524-7.042 2.91zM253.095 481.95l-66.473-66.512c-2.609-2.61-.746-7.036 2.914-7.036l132.932.007c3.655 0 5.523 4.426 2.909 7.041l-66.46 66.493a4.115 4.115 0 0 1-5.822.007z"] };
var faArrowsAltH = { prefix: 'fal', iconName: 'arrows-alt-h', icon: [512, 512, [], "f337", "M384 192.032V239H128v-46.962c0-28.425-34.488-42.767-54.627-22.627l-64 63.962c-12.496 12.496-12.498 32.757 0 45.255l64 63.968C93.472 362.695 128 348.45 128 319.968V273h256v46.962c0 28.425 34.487 42.767 54.627 22.627l64-63.962c12.496-12.496 12.498-32.757 0-45.255l-64-63.968C418.528 149.305 384 163.55 384 192.032zM100 319.968c0 3.548-4.296 5.361-6.833 2.823l-63.995-63.963a3.995 3.995 0 0 1-.006-5.651l64.006-63.968c2.533-2.532 6.829-.724 6.829 2.828v127.931zm318.833-130.76l63.995 63.963a3.995 3.995 0 0 1 .006 5.651l-64.006 63.968c-2.532 2.532-6.829.725-6.829-2.828v-127.93c.001-3.548 4.297-5.361 6.834-2.824z"] };
var faArrowsAltV = { prefix: 'fal', iconName: 'arrows-alt-v', icon: [192, 512, [], "f338", "M159.968 384H113V128h46.962c28.425 0 42.767-34.488 22.627-54.627l-63.962-64c-12.496-12.496-32.757-12.498-45.255 0l-63.968 64C-10.695 93.472 3.55 128 32.032 128H79v256H32.038c-28.425 0-42.767 34.487-22.627 54.627l63.962 64c12.496 12.496 32.757 12.498 45.255 0l63.968-64C202.695 418.528 188.45 384 159.968 384zM32.032 100c-3.548 0-5.361-4.296-2.823-6.833l63.963-63.995a3.995 3.995 0 0 1 5.651-.006l63.968 64.006c2.532 2.533.724 6.829-2.828 6.829H32.032zm130.76 318.833l-63.963 63.995a3.995 3.995 0 0 1-5.651.006L29.21 418.829c-2.532-2.532-.725-6.829 2.828-6.829h127.93c3.548 0 5.361 4.296 2.824 6.833z"] };
var faArrowsH = { prefix: 'fal', iconName: 'arrows-h', icon: [512, 512, [], "f07e", "M399.959 170.585c-4.686 4.686-4.686 12.284 0 16.971L451.887 239H60.113l51.928-51.444c4.686-4.686 4.686-12.284 0-16.971l-7.071-7.07c-4.686-4.686-12.284-4.686-16.97 0l-84.485 84c-4.686 4.686-4.686 12.284 0 16.971l84.485 84c4.686 4.686 12.284 4.686 16.97 0l7.071-7.07c4.686-4.686 4.686-12.284 0-16.971L60.113 273h391.773l-51.928 51.444c-4.686 4.686-4.686 12.284 0 16.971l7.071 7.07c4.686 4.686 12.284 4.686 16.97 0l84.485-84c4.687-4.686 4.687-12.284 0-16.971l-84.485-84c-4.686-4.686-12.284-4.686-16.97 0l-7.07 7.071z"] };
var faArrowsV = { prefix: 'fal', iconName: 'arrows-v', icon: [192, 512, [], "f07d", "M181.415 399.959c-4.686-4.686-12.284-4.686-16.971 0L113 451.887V60.113l51.444 51.928c4.686 4.686 12.284 4.686 16.971 0l7.07-7.071c4.686-4.686 4.686-12.284 0-16.97l-84-84.485c-4.686-4.686-12.284-4.686-16.971 0L3.515 88c-4.686 4.686-4.686 12.284 0 16.97l7.07 7.071c4.686 4.686 12.284 4.686 16.971 0L79 60.113v391.773l-51.444-51.928c-4.686-4.686-12.284-4.686-16.971 0l-7.07 7.071c-4.686 4.686-4.686 12.284 0 16.97l84 84.485c4.686 4.687 12.284 4.687 16.971 0l84-84.485c4.686-4.686 4.686-12.284 0-16.97l-7.071-7.07z"] };
var faAssistiveListeningSystems = { prefix: 'fal', iconName: 'assistive-listening-systems', icon: [512, 512, [], "f2a2", "M217.6 512c-8.837 0-16-7.163-16-16s7.163-16 16-16c41.172 0 74.667-33.495 74.667-74.666 0-85.174 73.391-93.9 73.391-165.334 0-71.167-57.899-129.066-129.067-129.066-71.167 0-129.066 57.899-129.066 129.066 0 8.837-7.163 16-16 16s-16-7.163-16-16c0-88.812 72.254-161.066 161.066-161.066S397.657 151.188 397.657 240c0 86.857-73.391 96.041-73.391 165.334C324.267 464.149 276.416 512 217.6 512zm115.733-272c0-53.816-43.783-97.6-97.6-97.6s-97.6 43.783-97.6 97.6c0 8.837 7.163 16 16 16s16-7.163 16-16c0-36.172 29.428-65.6 65.6-65.6s65.6 29.428 65.6 65.6c0 8.837 7.163 16 16 16s16-7.163 16-16zm106.47-45.984c8.448-2.591 13.195-11.541 10.604-19.988-14.644-47.732-45.384-89.796-86.559-118.441-7.254-5.046-17.226-3.259-22.271 3.996-5.047 7.254-3.258 17.226 3.996 22.271 35.322 24.574 61.688 60.643 74.242 101.559 2.593 8.453 11.545 13.193 19.988 10.603zm60.888-18.65c8.447-2.594 13.193-11.544 10.601-19.991C492.386 93.787 452.886 39.627 400.059 2.868c-7.253-5.046-17.225-3.259-22.272 3.995-5.047 7.253-3.258 17.225 3.995 22.272 46.978 32.688 82.105 80.855 98.918 135.631 2.593 8.447 11.541 13.192 19.991 10.6zM240 256c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm-64 64c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm-96 96c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm-64 64c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm155.313-75.313l-64-64-22.627 22.627 64 64 22.627-22.627z"] };
var faAsterisk = { prefix: 'fal', iconName: 'asterisk', icon: [512, 512, [], "f069", "M475.31 364.144L288 256l187.31-108.144c5.74-3.314 7.706-10.653 4.392-16.392l-4-6.928c-3.314-5.74-10.653-7.706-16.392-4.392L272 228.287V12c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12v216.287L52.69 120.144c-5.74-3.314-13.079-1.347-16.392 4.392l-4 6.928c-3.314 5.74-1.347 13.079 4.392 16.392L224 256 36.69 364.144c-5.74 3.314-7.706 10.653-4.392 16.392l4 6.928c3.314 5.74 10.653 7.706 16.392 4.392L240 283.713V500c0 6.627 5.373 12 12 12h8c6.627 0 12-5.373 12-12V283.713l187.31 108.143c5.74 3.314 13.079 1.347 16.392-4.392l4-6.928c3.314-5.74 1.347-13.079-4.392-16.392z"] };
var faAt = { prefix: 'fal', iconName: 'at', icon: [512, 512, [], "f1fa", "M256 8C118.941 8 8 118.919 8 256c0 137.058 110.919 248 248 248 52.925 0 104.68-17.078 147.092-48.319 5.501-4.052 6.423-11.924 2.095-17.211l-5.074-6.198c-4.018-4.909-11.193-5.883-16.307-2.129C346.93 457.208 301.974 472 256 472c-119.373 0-216-96.607-216-216 0-119.375 96.607-216 216-216 118.445 0 216 80.024 216 200 0 72.873-52.819 108.241-116.065 108.241-19.734 0-23.695-10.816-19.503-33.868l32.07-164.071c1.449-7.411-4.226-14.302-11.777-14.302h-12.421a12 12 0 0 0-11.781 9.718c-2.294 11.846-2.86 13.464-3.861 25.647-11.729-27.078-38.639-43.023-73.375-43.023-68.044 0-133.176 62.95-133.176 157.027 0 61.587 33.915 98.354 90.723 98.354 39.729 0 70.601-24.278 86.633-46.982-1.211 27.786 17.455 42.213 45.975 42.213C453.089 378.954 504 321.729 504 240 504 103.814 393.863 8 256 8zm-37.92 342.627c-36.681 0-58.58-25.108-58.58-67.166 0-74.69 50.765-121.545 97.217-121.545 38.857 0 58.102 27.79 58.102 65.735 0 58.133-38.369 122.976-96.739 122.976z"] };
var faAudioDescription = { prefix: 'fal', iconName: 'audio-description', icon: [512, 512, [], "f29e", "M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm16 336c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V112c0-8.822 7.178-16 16-16h416c8.822 0 16 7.178 16 16v288zm-293.411-97.217h-67.335l-13.508 40.974A11.999 11.999 0 0 1 94.35 352H84.01c-8.276 0-14.067-8.18-11.319-15.986l59.155-168a12 12 0 0 1 11.319-8.015h19.514a12 12 0 0 1 11.319 8.015l59.155 168C235.902 343.82 230.11 352 221.834 352h-10.34c-5.18 0-9.775-3.324-11.397-8.243l-13.508-40.974zm-33.802-109.521s-4.327 18.93-8.113 29.746l-17.036 51.38h50.298l-17.037-51.38c-3.515-10.817-7.571-29.746-7.571-29.746h-.541zM263.385 172c0-6.627 5.373-12 12-12h53.443c59.222 0 97.893 35.155 97.893 95.73 0 60.574-38.67 96.27-97.893 96.27h-53.443c-6.627 0-12-5.373-12-12V172zm63.549 149.983c38.941 0 63.819-22.986 63.819-66.253 0-42.727-25.419-65.713-63.819-65.713H298.27v131.966h28.664z"] };
var faBackward = { prefix: 'fal', iconName: 'backward', icon: [512, 512, [], "f04a", "M267.5 281.1l192 159.4c20.6 17.2 52.5 2.8 52.5-24.6V96c0-27.4-31.9-41.8-52.5-24.6L267.5 232c-15.3 12.8-15.3 36.4 0 49.1zm20.5-24.5L480 96v320L288 256.6zM11.5 281.1l192 159.4c20.6 17.2 52.5 2.8 52.5-24.6V96c0-27.4-31.9-41.8-52.5-24.6L11.5 232c-15.3 12.8-15.3 36.4 0 49.1zM32 256.6L224 96v320L32 256.6z"] };
var faBadge = { prefix: 'fal', iconName: 'badge', icon: [512, 512, [], "f335", "M256 512c-35.5 0-68.1-19.4-85.5-49.6-32.1 8.7-69 1.1-95.5-25.4-25.1-25.1-34.5-61.9-25.4-95.5C19.4 324.2 0 291.5 0 256s19.4-68.2 49.6-85.5c-9.1-33.6.3-70.4 25.4-95.5 25.1-25.1 61.9-34.5 95.5-25.4C187.8 19.4 220.5 0 256 0s68.2 19.4 85.5 49.6c33.6-9.1 70.4.3 95.5 25.4 25.1 25.1 34.5 61.9 25.4 95.5 30.2 17.3 49.6 50 49.6 85.5s-19.4 68.2-49.6 85.5c9.1 33.6-.3 70.4-25.4 95.5-26.1 26.1-62.8 34.3-95.5 25.4-17.4 30.2-50 49.6-85.5 49.6zm-68.3-91.1c3.6 9.6 16.2 59.1 68.3 59.1 51 0 63.7-47 68.3-59.1 32.6 14.8 61.2 22.4 90.1-6.5 36-36 11.8-78.3 6.5-90.1 9.6-3.6 59.1-16.2 59.1-68.3 0-51-47-63.7-59.1-68.3 4.4-9.6 30.3-53.4-6.5-90.1-36-36-78.3-11.8-90.1-6.5C320.7 81.5 308.1 32 256 32c-51 0-63.7 47-68.3 59.1-9.3-4.2-53.3-30.4-90.1 6.5-36 36-11.8 78.3-6.5 90.1C81.5 191.3 32 203.9 32 256c0 51 47 63.7 59.1 68.3-4.4 9.6-30.3 53.4 6.5 90.1 28.8 28.7 57.5 21.3 90.1 6.5z"] };
var faBadgeCheck = { prefix: 'fal', iconName: 'badge-check', icon: [512, 512, [], "f336", "M512 256c0-35.496-19.411-68.153-49.598-85.502 9.075-33.611-.289-70.424-25.383-95.517-25.092-25.094-61.902-34.458-95.518-25.384C324.153 19.411 291.496 0 256 0s-68.153 19.411-85.502 49.598c-33.612-9.076-70.425.291-95.518 25.384-25.094 25.093-34.458 61.905-25.383 95.517C19.411 187.847 0 220.504 0 256s19.411 68.153 49.598 85.502c-9.075 33.611.289 70.424 25.383 95.519 26.511 26.507 63.455 34.154 95.532 25.406C187.865 492.6 220.514 512 256 512s68.135-19.4 85.487-49.573c32.709 8.92 69.471.651 95.532-25.407 25.094-25.094 34.458-61.906 25.383-95.518C492.589 324.153 512 291.496 512 256zm-91.145 68.29c5.346 11.778 29.582 54.057-6.463 90.102-28.863 28.861-57.547 21.24-90.103 6.464C319.745 432.959 306.99 480 256 480c-52.106 0-64.681-49.533-68.29-59.145-32.611 14.801-61.35 22.286-90.103-6.463-36.746-36.747-10.826-80.49-6.463-90.103C79.042 319.745 32 306.99 32 256c0-52.106 49.533-64.681 59.145-68.29-5.346-11.778-29.582-54.057 6.463-90.102 36.836-36.833 80.756-10.706 90.103-6.464C192.255 79.041 205.01 32 256 32c52.106 0 64.681 49.533 68.29 59.145 11.769-5.342 54.059-29.58 90.103 6.464 36.746 36.745 10.826 80.489 6.463 90.102C432.958 192.255 480 205.01 480 256c0 52.106-49.533 64.681-59.145 68.29zm-32.404-138.802L207.971 364.52c-4.705 4.667-12.303 4.637-16.97-.068l-85.878-86.572c-4.667-4.705-4.637-12.303.068-16.97l8.52-8.451c4.705-4.667 12.303-4.637 16.971.068l68.976 69.533 163.441-162.129c4.705-4.667 12.303-4.637 16.97.068l8.452 8.52c4.666 4.703 4.635 12.301-.07 16.969z"] };
var faBalanceScale = { prefix: 'fal', iconName: 'balance-scale', icon: [576, 512, [], "f24e", "M304 157.984c27.604-7.105 48-32.162 48-61.984h116c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H343.417c-24.684-42.653-86.166-42.624-110.833 0H108c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h116c0 29.821 20.396 54.879 48 61.984V448H108c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h360c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H304V157.984zM256 96c0-17.645 14.355-32 32-32s32 14.355 32 32-14.355 32-32 32-32-14.355-32-32zm319.983 192c-.001-13.131 1.55-6.723-84.847-144.96-12.505-20.009-41.735-20.059-54.272 0-86.898 139.037-84.847 132.113-84.847 144.96H352c0 55.355 52.671 96 112 96 58.921 0 112-40.307 112-96h-.017zM464 160l80 128H384l80-128zm-69.237 160h138.475c-30.942 42.68-107.597 42.593-138.475 0zM224 288h-.017c-.001-13.131 1.55-6.723-84.847-144.96-12.505-20.009-41.735-20.059-54.272 0C-2.034 282.077.017 275.153.017 288H0c0 55.862 53.283 96 112 96 58.784 0 112-40.193 112-96zM112 160l80 128H32l80-128zM42.763 320h138.475c-30.942 42.68-107.597 42.593-138.475 0z"] };
var faBan = { prefix: 'fal', iconName: 'ban', icon: [512, 512, [], "f05e", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zM103.265 408.735c-80.622-80.622-84.149-208.957-10.9-293.743l304.644 304.643c-84.804 73.264-213.138 69.706-293.744-10.9zm316.37-11.727L114.992 92.365c84.804-73.263 213.137-69.705 293.743 10.9 80.622 80.621 84.149 208.957 10.9 293.743z"] };
var faBarcode = { prefix: 'fal', iconName: 'barcode', icon: [512, 512, [], "f02a", "M0 448V64h18v384H0zm26.857-.273V64H36v383.727h-9.143zm27.143 0V64h8.857v383.727H54zm44.857 0V64h8.857v383.727h-8.857zm36 0V64h17.714v383.727h-17.714zm44.857 0V64h8.857v383.727h-8.857zm18 0V64h8.857v383.727h-8.857zm18 0V64h8.857v383.727h-8.857zm35.715 0V64h18v383.727h-18zm44.857 0V64h18v383.727h-18zm35.999 0V64h18.001v383.727h-18.001zm36.001 0V64h18.001v383.727h-18.001zm26.857 0V64h18v383.727h-18zm45.143 0V64h26.857v383.727h-26.857zm35.714 0V64h9.143v383.727H476zm18 .273V64h18v384h-18z"] };
var faBars = { prefix: 'fal', iconName: 'bars', icon: [448, 512, [], "f0c9", "M442 114H6a6 6 0 0 1-6-6V84a6 6 0 0 1 6-6h436a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6zm0 160H6a6 6 0 0 1-6-6v-24a6 6 0 0 1 6-6h436a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6zm0 160H6a6 6 0 0 1-6-6v-24a6 6 0 0 1 6-6h436a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6z"] };
var faBaseball = { prefix: 'fal', iconName: 'baseball', icon: [640, 512, [], "f432", "M627.2 60.1l-23.6-32.5C581-3.5 538.9-8.2 510 12.8L307.7 159.6c-45.6 33.1-87.3 71.3-124.3 113.8-29 33.3-72.5 78.6-130.3 120.6l-21.6 15.7c-.2-.3-11.3-17.4-25.5-6.2-6.9 5.5-8 15.6-2.5 22.5l64 80c5.2 6.5 15.2 8.3 22.5 2.5.5-.4 12.9-9.5.1-25.5l18.2-13.2c66-47.9 122.3-72.6 155.1-86.5 51.9-22 101.2-49.9 146.8-83l202.3-146.8c29.8-21.7 36.4-63.5 14.7-93.4zM70.1 458l-18.6-23.2c28.9-20.9 71.8-50.7 125-106.3l32.3 44.4C140.6 405.7 99.2 436.8 70.1 458zm523.5-330.4c-247 179.2-243.1 182.5-359.9 233.8L195 308.3c84.9-95.1 86.5-90.2 333.8-269.6 14.8-10.7 36.9-8.7 48.9 7.7l23.6 32.5c11.4 15.6 7.9 37.4-7.7 48.7zM496 352c-44.1 0-80 35.9-80 80s35.9 80 80 80 80-35.9 80-80-35.9-80-80-80zm0 128c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z"] };
var faBaseballBall = { prefix: 'fal', iconName: 'baseball-ball', icon: [496, 512, [], "f433", "M248 8C111.2 8 0 119.2 0 256s111.2 248 248 248 248-111.2 248-248S384.8 8 248 8zM103.5 416.1c16.7-17.4 30.6-37.2 41.3-59.1L118 344c-9.1 18.8-21.8 35.1-36 50-85.6-102.8-45.3-221.5 0-276 14.2 14.9 26.8 31.2 36 49.8l26.8-13.1c-10.6-21.8-24.5-41.5-41.2-58.9 79.1-71.4 203.1-77.6 289-.1-16.7 17.4-30.6 37.1-41.2 59l26.8 13c9.1-18.7 21.7-35 36-50 78.1 93.7 54.6 210.4.1 275.9-14.3-14.9-26.9-31.2-36-49.9l-26.8 13.1c10.7 21.9 24.5 41.6 41.3 58.9-90 81.5-214.3 68.2-289.3.4zm53.2-88.6l-28.3-9.2c12.2-37.5 14-81.5-.1-124.7l28.3-9.2c16.3 50 14 100.4.1 143.1zm211-9.2l-28.3 9.2c-16.3-50-14-100.5-.1-143.1l28.3 9.2c-12.2 37.6-13.9 81.6.1 124.7z"] };
var faBasketballBall = { prefix: 'fal', iconName: 'basketball-ball', icon: [496, 512, [], "f434", "M423.4 80.6c-96.7-96.7-254.2-96.7-350.9 0s-96.7 254.2 0 350.9c96.8 96.8 254.2 96.7 350.9 0 96.8-96.8 96.8-254.2 0-350.9zM241.2 471.7c-48-1.5-95.6-18.9-134.1-52.1l140.9-141 56.8 56.8c-33.9 38.3-56 85.7-63.6 136.3zm86.7-113.2l61 61c-33.3 28.7-73.2 45.6-114.4 50.6 7.4-41.3 25.8-79.8 53.4-111.6zm22.6-22.6c31.8-27.6 70.3-46 111.6-53.3-5.1 41.2-21.9 81.1-50.6 114.4l-61-61.1zm113.2-86.7c-50.6 7.6-98 29.7-136.3 63.5L270.6 256l140.9-140.9c33.3 38.5 50.7 86.1 52.2 134.1zm-315-69.9c-32.6 28.4-72.6 47.2-115.4 54.1 4.4-42.6 21.6-84 51.2-118.3l64.2 64.2zm-41.6-86.9c34.3-29.6 75.7-46.7 118.3-51.2-6.9 42.8-25.7 82.8-54.1 115.4l-64.2-64.2zm150.6-51.9c47 2.1 93.4 19.4 131.2 52L248 233.4l-54.1-54.1c34.5-38.9 56.7-87.2 63.8-138.8zM32.5 265.7c51.6-7.2 99.9-29.4 138.8-63.8l54.1 54.1-141 140.9c-32.5-37.8-49.8-84.1-51.9-131.2z"] };
var faBasketballHoop = { prefix: 'fal', iconName: 'basketball-hoop', icon: [640, 512, [], "f435", "M640 339.7c0 19.5-10.4 36.9-28.5 44.4l-108.3 44.5 2.5-35.7 93.6-38.4c6-2.5 9.9-8.3 9.9-14.8V216C527.1-8 115.7-8.9 33.2 216v123.7c0 6.5 3.9 12.3 9.9 14.8l93.6 38.4 2.5 35.7L31 384.1c-18.1-7.5-31-24.9-31-44.4l.8-131.4C1.4 206.3 69.3 16 321.2 16s317.3 190.3 317.9 192.3c1.2 7.1.9-9.1.9 131.4zM462.4 512L387 440.4 321.2 512l-65.8-71.6L180 512l-18.2-224h-24.6c-4.4 0-8-3.6-8-8v-16c0-4.4 3.6-8 8-8h368c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8h-24.6l-18.2 224zM207.9 352.4l46.7 43.6 44-44-42.1-42.1-48.6 42.5zm113.3-23l41.4-41.4h-82.8l41.4 41.4zm22.6 22.6l44 44 46.7-43.6-48.5-42.5-42.2 42.1zm104.7-64h-39l36.5 31.9 2.5-31.9zm-254.6 0l2.6 31.9L233 288h-39.1zM232 418.6l-29.9-27.9 4.3 53.5 25.6-25.6zm132.4-.8l-43.2-43.2-43.2 43.2 43.2 40.3 43.2-40.3zm71.6 26.4l4.3-53.5-29.9 27.9 25.6 25.6zM465.2 224v-89.9h-288V224h32v-57.9h224V224h32z"] };
var faBath = { prefix: 'fal', iconName: 'bath', icon: [512, 512, [], "f2cd", "M500 256H64V104c0-22.056 17.944-40 40-40 16.819 0 31.237 10.44 37.14 25.175-18.241 23.852-17.441 57.684 2.42 80.645-3.794 3.794-3.794 9.946 0 13.74l8.88 8.88c3.794 3.794 9.946 3.794 13.74 0l90.26-90.26c3.794-3.794 3.794-9.946 0-13.74l-8.88-8.88c-3.794-3.794-9.946-3.794-13.74 0-18.818-16.277-44.942-19.76-66.887-10.445C154.635 47.003 131.047 32 104 32c-39.701 0-72 32.299-72 72v152H12c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h20v64c0 28.43 12.362 53.969 32 71.547V468c0 6.627 5.373 12 12 12h8c6.627 0 12-5.373 12-12v-25.47a95.842 95.842 0 0 0 32 5.47h256a95.842 95.842 0 0 0 32-5.47V468c0 6.627 5.373 12 12 12h8c6.627 0 12-5.373 12-12v-44.453c19.638-17.578 32-43.117 32-71.547v-64h20c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12zM169.37 105.37c11.36-11.35 29.19-12.37 41.71-3.07l-44.78 44.78c-9.3-12.52-8.28-30.35 3.07-41.71zM448 352c0 35.29-28.71 64-64 64H128c-35.29 0-64-28.71-64-64v-64h384v64z"] };
var faBatteryBolt = { prefix: 'fal', iconName: 'battery-bolt', icon: [640, 512, [], "f376", "M640 184v144c0 13.255-10.745 24-24 24h-8v16c0 26.51-21.49 48-48 48H400.69l18.028-32H560c8.823 0 16-7.177 16-16v-48h32V192h-32v-48c0-8.823-7.177-16-16-16h-90.776c-13.223-9.205-28.229-14.344-43.41-15.66l3.971-15.195c.101-.381.191-.763.287-1.145H560c26.51 0 48 21.49 48 48v16h8c13.255 0 24 10.745 24 24zM32 368V144c0-8.823 7.177-16 16-16h95.388l3.21-32H48c-26.51 0-48 21.49-48 48v224c0 26.51 21.49 48 48 48h149.734c.034-.133.063-.267.097-.4l7.71-31.6H48c-8.823 0-16-7.177-16-16zm422.616-145.511L321.664 458.482C314.042 472.12 299.81 480 284.985 480c-27.295 0-47.645-25.901-40.605-52.684L278.374 288h-56.37c-24.74 0-44.15-21.313-41.812-45.964l17.252-172C199.487 48.472 217.595 32 239.255 32h103.557c27.656 0 47.711 26.272 40.563 52.892L363.745 160h54.208c32.032 0 52.288 34.528 36.663 62.489zM417.952 192h-95.646l30.11-115.2.027-.104.028-.103c1.7-6.331-3.078-12.593-9.658-12.593H239.255a9.96 9.96 0 0 0-9.956 9.056l-.008.087-.009.087-17.24 171.881c-.523 5.829 4.089 10.89 9.96 10.89h97.117l-43.653 178.902-.067.275-.072.274c-1.723 6.555 3.374 12.548 9.656 12.548 2.842 0 6.632-1.347 8.744-5.128l.027-.048.027-.048L426.69 206.86c3.693-6.634-1.12-14.86-8.738-14.86z"] };
var faBatteryEmpty = { prefix: 'fal', iconName: 'battery-empty', icon: [640, 512, [], "f244", "M560 128c8.823 0 16 7.177 16 16v48h32v128h-32v48c0 8.823-7.177 16-16 16H48c-8.823 0-16-7.177-16-16V144c0-8.823 7.177-16 16-16h512m0-32H48c-26.51 0-48 21.49-48 48v224c0 26.51 21.49 48 48 48h512c26.51 0 48-21.49 48-48v-16h8c13.255 0 24-10.745 24-24V184c0-13.255-10.745-24-24-24h-8v-16c0-26.51-21.49-48-48-48z"] };
var faBatteryFull = { prefix: 'fal', iconName: 'battery-full', icon: [640, 512, [], "f240", "M560 128c8.823 0 16 7.177 16 16v48h32v128h-32v48c0 8.823-7.177 16-16 16H48c-8.823 0-16-7.177-16-16V144c0-8.823 7.177-16 16-16h512m0-32H48c-26.51 0-48 21.49-48 48v224c0 26.51 21.49 48 48 48h512c26.51 0 48-21.49 48-48v-16h8c13.255 0 24-10.745 24-24V184c0-13.255-10.745-24-24-24h-8v-16c0-26.51-21.49-48-48-48zM128 314V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6z"] };
var faBatteryHalf = { prefix: 'fal', iconName: 'battery-half', icon: [640, 512, [], "f242", "M560 128c8.823 0 16 7.177 16 16v48h32v128h-32v48c0 8.823-7.177 16-16 16H48c-8.823 0-16-7.177-16-16V144c0-8.823 7.177-16 16-16h512m0-32H48c-26.51 0-48 21.49-48 48v224c0 26.51 21.49 48 48 48h512c26.51 0 48-21.49 48-48v-16h8c13.255 0 24-10.745 24-24V184c0-13.255-10.745-24-24-24h-8v-16c0-26.51-21.49-48-48-48zM128 314V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6z"] };
var faBatteryQuarter = { prefix: 'fal', iconName: 'battery-quarter', icon: [640, 512, [], "f243", "M560 128c8.823 0 16 7.177 16 16v48h32v128h-32v48c0 8.823-7.177 16-16 16H48c-8.823 0-16-7.177-16-16V144c0-8.823 7.177-16 16-16h512m0-32H48c-26.51 0-48 21.49-48 48v224c0 26.51 21.49 48 48 48h512c26.51 0 48-21.49 48-48v-16h8c13.255 0 24-10.745 24-24V184c0-13.255-10.745-24-24-24h-8v-16c0-26.51-21.49-48-48-48zM128 314V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6z"] };
var faBatterySlash = { prefix: 'fal', iconName: 'battery-slash', icon: [640, 512, [], "f377", "M333.525 384l23 32H48c-26.51 0-48-21.49-48-48V144c0-26.51 21.49-48 48-48h78.525l23 32H48c-8.822 0-16 7.177-16 16v224c0 8.823 7.178 16 16 16h285.525zM640 184v144c0 13.255-10.745 24-24 24h-8v16c0 26.51-21.49 48-48 48H454.363l52.216 72.648c3.87 5.384 2.642 12.884-2.741 16.754l-6.04 4.341a11.95 11.95 0 0 1-6.996 2.257 11.988 11.988 0 0 1-9.758-4.999L133.421 23.352c-3.87-5.384-2.642-12.884 2.741-16.754l6.04-4.341A11.95 11.95 0 0 1 149.198 0c3.734 0 7.413 1.736 9.758 4.999L224.363 96H560c26.51 0 48 21.49 48 48v16h8c13.255 0 24 10.745 24 24zm-32 8h-32v-48c0-8.823-7.178-16-16-16H247.363l184 256H560c8.822 0 16-7.177 16-16v-48h32V192z"] };
var faBatteryThreeQuarters = { prefix: 'fal', iconName: 'battery-three-quarters', icon: [640, 512, [], "f241", "M560 128c8.823 0 16 7.177 16 16v48h32v128h-32v48c0 8.823-7.177 16-16 16H48c-8.823 0-16-7.177-16-16V144c0-8.823 7.177-16 16-16h512m0-32H48c-26.51 0-48 21.49-48 48v224c0 26.51 21.49 48 48 48h512c26.51 0 48-21.49 48-48v-16h8c13.255 0 24-10.745 24-24V184c0-13.255-10.745-24-24-24h-8v-16c0-26.51-21.49-48-48-48zM128 314V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6zm64 0V198a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v116a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6z"] };
var faBed = { prefix: 'fal', iconName: 'bed', icon: [576, 512, [], "f236", "M32 76v244h532c6.627 0 12 5.373 12 12v116h-32v-96H32v96H0V76c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12zm32 116c0-53.019 42.981-96 96-96s96 42.981 96 96-42.981 96-96 96-96-42.981-96-96zm32 0c0 35.29 28.71 64 64 64s64-28.71 64-64-28.71-64-64-64-64 28.71-64 64zm480 32v64H288V152c0-13.255 10.745-24 24-24h168c53.019 0 96 42.981 96 96zm-32 0c0-35.29-28.71-64-64-64H320v96h224v-32z"] };
var faBeer = { prefix: 'fal', iconName: 'beer', icon: [448, 512, [], "f0fc", "M384 96h-32V80c0-26.51-21.49-48-48-48H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h256c26.51 0 48-21.49 48-48v-22.112l60.621-30.311C434.443 368.666 448 346.731 448 322.334V160c0-35.29-28.71-64-64-64zm-64 336c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h256c8.822 0 16 7.178 16 16v352zm96-109.666c0 12.199-6.778 23.166-17.689 28.622L352 374.112V128h32c17.645 0 32 14.355 32 32v162.334zM192 144v224c0 8.837-7.164 16-16 16s-16-7.163-16-16V144c0-8.837 7.164-16 16-16s16 7.163 16 16zm-64 0v224c0 8.837-7.164 16-16 16s-16-7.163-16-16V144c0-8.837 7.164-16 16-16s16 7.163 16 16zm128 0v224c0 8.837-7.163 16-16 16s-16-7.163-16-16V144c0-8.837 7.163-16 16-16s16 7.163 16 16z"] };
var faBell = { prefix: 'fal', iconName: 'bell', icon: [448, 512, [], "f0f3", "M433.884 366.059C411.634 343.809 384 316.118 384 208c0-79.394-57.831-145.269-133.663-157.83A31.845 31.845 0 0 0 256 32c0-17.673-14.327-32-32-32s-32 14.327-32 32c0 6.75 2.095 13.008 5.663 18.17C121.831 62.731 64 128.606 64 208c0 108.118-27.643 135.809-49.893 158.059C-16.042 396.208 5.325 448 48.048 448H160c0 35.29 28.71 64 64 64s64-28.71 64-64h111.943c42.638 0 64.151-51.731 33.941-81.941zM224 480c-17.645 0-32-14.355-32-32h64c0 17.645-14.355 32-32 32zm175.943-64H48.048c-14.223 0-21.331-17.296-11.314-27.314C71.585 353.836 96 314.825 96 208c0-70.741 57.249-128 128-128 70.74 0 128 57.249 128 128 0 106.419 24.206 145.635 59.257 180.686C421.314 398.744 414.11 416 399.943 416z"] };
var faBellSlash = { prefix: 'fal', iconName: 'bell-slash', icon: [576, 512, [], "f1f6", "M112.048 416c-14.223 0-21.331-17.296-11.314-27.314 32.601-32.6 56.068-68.847 58.962-160.832l-31.492-27.893A163.61 163.61 0 0 0 128 208c0 108.118-27.643 135.809-49.893 158.059C47.958 396.208 69.325 448 112.048 448H224c0 35.29 28.71 64 64 64s64-28.71 64-64h56.249l-36.129-32H112.048zM288 480c-17.645 0-32-14.355-32-32h64c0 17.645-14.355 32-32 32zm283.923 4.926l-67.381-59.421c10.968-17.668 10.688-42.101-6.658-59.447C475.634 343.809 448 316.118 448 208c0-79.394-57.831-145.269-133.663-157.83A31.845 31.845 0 0 0 320 32c0-17.673-14.327-32-32-32s-32 14.327-32 32c0 6.75 2.095 13.008 5.663 18.17-43.924 7.276-81.79 32.451-105.893 67.767L25.467 3.028C20.465-1.382 12.819-.921 8.389 4.059L3.042 10.07c-4.43 4.98-3.966 12.592 1.035 17.003l546.456 481.898c5.002 4.411 12.648 3.949 17.078-1.031l5.348-6.011c4.429-4.979 3.966-12.592-1.036-17.003zM288 80c70.74 0 128 57.249 128 128 0 106.419 24.206 145.635 59.257 180.686 4.252 4.252 5.416 9.788 4.274 14.763L179.987 139.294C202.695 103.642 242.551 80 288 80z"] };
var faBicycle = { prefix: 'fal', iconName: 'bicycle', icon: [640, 512, [], "f206", "M512.303 192c-19.586-.047-38.147 4.313-54.759 12.132L373.508 71.439A16 16 0 0 0 359.991 64h-67.998c-6.627 0-12 5.373-12 12v8c0 6.627 5.372 12 12 12h59.193l40.532 64H255.994v-20c0-6.627-5.372-12-12-12h-83.998c-8.836 0-16 7.163-16 16s7.163 16 16 16h55.999l-31.808 44.969c-17.085-8.362-36.303-13.035-56.622-12.968C56.937 192.234-.001 249.37 0 320c.001 70.692 57.307 128 127.997 128 59.641 0 109.755-40.793 123.964-96h52.031a16.001 16.001 0 0 0 13.107-6.824l100.744-143.924 12.677 20.018c-28.385 23.449-46.487 58.903-46.531 98.587-.077 69.963 56.843 127.499 126.801 128.138 70.559.644 128.101-55.842 129.193-125.995 1.099-70.503-57.17-129.829-127.68-130zM127.997 416c-52.933 0-95.998-43.065-95.998-96s43.064-96 95.998-96c13.307 0 25.989 2.724 37.521 7.639L98.89 326.824C91.47 337.423 99.083 352 111.997 352h106.506c-13.207 37.248-48.788 64-90.506 64zm95.998-96h-81.268l49.744-71.065c19.354 17.575 31.524 42.925 31.524 71.065zm71.668 0h-39.669c0-39.04-17.483-73.992-45.04-97.47L232.325 192H385.26l-89.597 128zm212.533 95.927c-50.058-1.938-90.528-42.677-92.154-92.747-.961-29.57 11.533-56.303 31.81-74.546l52.759 83.306c3.546 5.599 10.959 7.263 16.558 3.717l6.758-4.281c5.599-3.546 7.263-10.96 3.717-16.558l-52.785-83.346c11.427-4.811 23.972-7.473 37.128-7.473 52.933 0 95.998 43.065 95.998 96 .001 54.194-45.136 98.043-99.789 95.928z"] };
var faBinoculars = { prefix: 'fal', iconName: 'binoculars', icon: [512, 512, [], "f1e5", "M448 120c0-13.255-10.745-24-24-24h-8V56c0-13.255-10.745-24-24-24h-80c-13.255 0-24 10.745-24 24v40h-64V56c0-13.255-10.745-24-24-24h-80c-13.255 0-24 10.745-24 24v40h-8c-13.255 0-24 10.745-24 24C64 224 0 240 0 384v48c0 26.51 21.49 48 48 48h96c26.51 0 48-21.49 48-48V300c0-6.627 5.373-12 12-12h104c6.627 0 12 5.373 12 12v132c0 26.51 21.49 48 48 48h96c26.51 0 48-21.49 48-48v-48c0-144-64-160-64-264zM160 432c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16v-16h128v16zm32-174.323c-18.445 5.238-32 22.222-32 42.323v84H32c0-31.855 3.377-59.458 10.325-84.387 6.129-21.992 14.133-39.297 22.607-57.619C79.449 210.606 94.436 178.202 95.886 128H192v129.677zM192 96h-64V64h64v32zm96 160h-64V128h64v128zm32-192h64v32h-64V64zm0 193.677V128h96.114c1.45 50.202 16.437 82.606 30.954 113.994 8.474 18.322 16.478 35.628 22.607 57.619C476.623 324.542 480 352.145 480 384H352v-84c0-20.101-13.555-37.085-32-42.323zM464 448h-96c-8.822 0-16-7.178-16-16v-16h128v16c0 8.822-7.178 16-16 16z"] };
var faBirthdayCake = { prefix: 'fal', iconName: 'birthday-cake', icon: [448, 512, [], "f1fd", "M96 96c-17.75 0-32-14.25-32-32 0-31 32-23 32-64 12 0 32 29.5 32 56s-14.25 40-32 40zm128 0c-17.75 0-32-14.25-32-32 0-31 32-23 32-64 12 0 32 29.5 32 56s-14.25 40-32 40zm128 0c-17.75 0-32-14.25-32-32 0-31 32-23 32-64 12 0 32 29.5 32 56s-14.25 40-32 40zm48 160h-32V112h-32v144h-96V112h-32v144h-96V112H80v144H48c-26.5 0-48 21.5-48 48v208h448V304c0-26.5-21.5-48-48-48zm16 224H32v-72.043C48.222 398.478 55.928 384 74.75 384c27.951 0 31.253 32 74.75 32 42.843 0 47.217-32 74.5-32 28.148 0 31.201 32 74.75 32 43.357 0 46.767-32 74.75-32 18.488 0 26.245 14.475 42.5 23.955V480zm0-112.374C406.374 359.752 394.783 352 373.5 352c-43.43 0-46.825 32-74.75 32-27.695 0-31.454-32-74.75-32-42.842 0-47.218 32-74.5 32-28.148 0-31.202-32-74.75-32-21.463 0-33.101 7.774-42.75 15.658V304c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v63.626z"] };
var faBlind = { prefix: 'fal', iconName: 'blind', icon: [384, 512, [], "f29d", "M206.817 489.959c3.334 8.184-.598 17.521-8.78 20.854-8.166 3.329-17.515-.582-20.854-8.78L110.14 337.476l15.549-46.648 81.128 199.131zM102.663 121.531a4 4 0 0 1 6.562-4.577l112.933 161.912c3.815 5.468 11.307 6.742 16.708 2.976 5.356-3.737 6.796-11.232 2.976-16.708l-120-172a11.978 11.978 0 0 0-9.842-5.13V88H80v.013c-3.294.001-6.574 1.337-8.943 3.985L0 171.415V272c0 6.627 5.373 12 12 12s12-5.373 12-12v-91.415l48-53.646v198.465L16.821 490.936c-2.795 8.383 1.736 17.444 10.119 20.238 8.381 2.794 17.444-1.735 20.238-10.119L120 282.597v-136.21l-17.337-24.856zm280.725 384.343L245.791 286.463a20.279 20.279 0 0 1-6.78 4.245l137.6 219.416a4 4 0 1 0 6.777-4.25zM96 0C73.909 0 56 17.909 56 40s17.909 40 40 40 40-17.909 40-40S118.091 0 96 0z"] };
var faBold = { prefix: 'fal', iconName: 'bold', icon: [320, 512, [], "f032", "M249.139 242.128c33.922-18.988 53.22-53.503 53.22-95.748 0-42.421-19.499-80.713-49.665-97.55C232.561 37.505 207.478 32 176.01 32H12C5.373 32 0 37.373 0 44v8c0 6.627 5.373 12 12 12h19.95v384H12c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h169.68c19.934 0 45.622-1.177 67.493-10.348C292.198 451.781 320 406.247 320 353.65c0-52.496-28.196-96.372-70.861-111.522zM66.041 64.201H176.01c24.929 0 43.694 4.153 57.357 12.692 21.38 13.439 33.642 38.537 33.642 68.858 0 49.531-32.265 82.81-80.289 82.81H66.041V64.201zm167.194 375.685c-12.585 5.325-29.449 7.914-51.555 7.914H66.041V260.76h124.458c56.314 0 94.151 37.837 94.151 94.151 0 40.208-19.2 71.966-51.415 84.975z"] };
var faBolt = { prefix: 'fal', iconName: 'bolt', icon: [320, 512, [], "f0e7", "M186.071 32c10.515 0 18.18 9.991 15.453 20.149L168.268 176h103.678c12.176 0 19.904 13.181 13.965 23.809L133.967 471.798A16.033 16.033 0 0 1 119.983 480c-10.146 0-18.187-9.689-15.457-20.074L153.926 272H48.004c-9.409 0-16.819-8.12-15.928-17.511L51.792 46.49A15.934 15.934 0 0 1 67.72 32h118.351m0-32H67.72C42.965 0 22.271 18.825 19.934 43.469l-19.716 208C-2.453 279.642 19.729 304 48.004 304h64.423l-38.85 147.79C65.531 482.398 88.788 512 119.983 512c16.943 0 33.209-9.005 41.919-24.592l151.945-271.993C331.704 183.461 308.555 144 271.945 144h-61.951l22.435-83.552C240.598 30.026 217.678 0 186.071 0z"] };
var faBomb = { prefix: 'fal', iconName: 'bomb', icon: [512, 512, [], "f1e2", "M420.7 68.7l-56 56-38.1-38.1c-12.5-12.5-32.8-12.5-45.3 0l-17.1 17.1c-17.9-5-36.8-7.7-56.3-7.7C96 96 3.3 185.9.1 297.8-3.3 415.5 91.1 512 208 512c115.1 0 208-94.2 208-208 0-19.5-2.7-38.4-7.7-56.3l17.1-17.1c12.5-12.5 12.5-32.8 0-45.3l-38.1-38.1 56-56-22.6-22.5zm-48.3 169.6c5.8 20.5 11.6 37.8 11.6 65.7 0 96.2-78.5 176-176 176-24.2 0-47.7-4.8-69.7-14.3-65.2-28.2-108.4-93.4-106.2-167C34.8 204.1 113.2 128 208 128c27.9 0 45.1 5.8 65.7 11.6l30.3-30.3 98.7 98.7s-1.8 1.9-30.3 30.3zM512 72c0 6.6-5.4 12-12 12h-24c-6.6 0-12-5.4-12-12s5.4-12 12-12h24c6.6 0 12 5.4 12 12zm-60-60v24c0 6.6-5.4 12-12 12s-12-5.4-12-12V12c0-6.6 5.4-12 12-12s12 5.4 12 12zm5 43c-4.7-4.7-4.7-12.3 0-17l17-17c4.7-4.7 12.3-4.7 17 0 4.7 4.7 4.7 12.3 0 17l-17 17c-4.7 4.7-12.3 4.7-17 0zm-67.9-16.9c-4.7-4.7-4.7-12.3 0-17 4.7-4.7 12.3-4.7 17 0l17 17c4.7 4.7 4.7 12.3 0 17-4.7 4.7-12.3 4.7-17 0l-17-17zm101.8 67.8c4.7 4.7 4.7 12.3 0 17-4.7 4.7-12.3 4.7-17 0l-17-17c-4.7-4.7-4.7-12.3 0-17 4.7-4.7 12.3-4.7 17 0l17 17zM192 192c0 8.8-7.2 16-16 16-35.3 0-64 28.7-64 64 0 8.8-7.2 16-16 16s-16-7.2-16-16c0-52.9 43.1-96 96-96 8.8 0 16 7.2 16 16z"] };
var faBook = { prefix: 'fal', iconName: 'book', icon: [448, 512, [], "f02d", "M356 160H188c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12zm12 52v-8c0-6.6-5.4-12-12-12H188c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h168c6.6 0 12-5.4 12-12zm64.7 268h3.3c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H80c-44.2 0-80-35.8-80-80V80C0 35.8 35.8 0 80 0h344c13.3 0 24 10.7 24 24v368c0 10-6.2 18.6-14.9 22.2-3.6 16.1-4.4 45.6-.4 65.8zM128 384h288V32H128v352zm-96 16c13.4-10 30-16 48-16h16V32H80c-26.5 0-48 21.5-48 48v320zm372.3 80c-3.1-20.4-2.9-45.2 0-64H80c-64 0-64 64 0 64h324.3z"] };
var faBookmark = { prefix: 'fal', iconName: 'bookmark', icon: [384, 512, [], "f02e", "M336 0H48C21.49 0 0 21.49 0 48v464l192-112 192 112V48c0-26.51-21.49-48-48-48zm16 456.287l-160-93.333-160 93.333V48c0-8.822 7.178-16 16-16h288c8.822 0 16 7.178 16 16v408.287z"] };
var faBowlingBall = { prefix: 'fal', iconName: 'bowling-ball', icon: [496, 512, [], "f436", "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 464c-119.1 0-216-96.9-216-216S128.9 40 248 40s216 96.9 216 216-96.9 216-216 216zm-96-312c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm112-32c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.3 32-32zm-16 64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z"] };
var faBowlingPins = { prefix: 'fal', iconName: 'bowling-pins', icon: [480, 512, [], "f437", "M475.2 312.2c-13-54.4-49.3-89.2-53.9-137.8-3.4-34.7 21.2-57.4 18.7-99.4-2.6-43.3-32.9-74.9-72-75-39.1.1-69.3 31.7-71.9 75-2.5 42 22 64.8 18.7 99.4-4.6 48.6-41 83.5-53.9 137.8-12.5 52.3.4 139.9 28.2 191.3l4.5 8.4h149l4.5-8.4c27.7-51.4 40.6-139 28.1-191.3zM408 76.9c1.7 28.6-16.1 49.3-18.7 83.1h-42.6c-2.6-33.9-20.5-54.4-18.7-83.1 3.6-60.1 76.4-60.1 80 0zm15.1 403H312.9c-21-45.2-31-118.7-21-160.3 10.7-44.8 41.9-77 52.1-127.7h48c10.2 50.7 41.4 82.9 52.1 127.7 9.9 41.7-.1 115.1-21 160.3zM165.3 174.5c-3.3-34.7 21.2-57.4 18.7-99.4-2.6-43.4-32.9-74.9-72-75-39.1 0-69.3 31.6-72 75-2.6 42 22 64.7 18.7 99.4-4.6 48.7-41 83.5-53.9 137.8-12.5 52.3.4 140 28.2 191.4l4.5 8.4h149l4.5-8.4c27.8-51.4 40.7-139 28.2-191.4-12.9-54.3-49.3-89.2-53.9-137.8zM152 77c1.7 28.7-16.1 49.1-18.7 83H90.7c-2.6-33.9-20.5-54.3-18.7-83 3.6-60.1 76.4-60.1 80 0zm15.1 403H56.9c-21-45.2-31-118.7-21-160.3 10.7-44.8 42-77 52.1-127.7h48c10.2 50.7 41.4 82.9 52.1 127.7 10 41.6 0 115.1-21 160.3z"] };
var faBoxingGlove = { prefix: 'fal', iconName: 'boxing-glove', icon: [448, 512, [], "f438", "M252.4 360.8l7.2 14.3c2 4 .4 8.8-3.6 10.7L227.8 400l28.2 14.1c4 2 5.6 6.8 3.6 10.7l-7.2 14.3c-2 4-6.8 5.6-10.7 3.6L192 417.9l-49.7 24.8c-4 2-8.8.4-10.7-3.6l-7.2-14.3c-2-4-.4-8.8 3.6-10.7l28.2-14.1-28.2-14.1c-4-2-5.6-6.8-3.6-10.7l7.2-14.3c2-4 6.8-5.6 10.7-3.6l49.7 24.8 49.7-24.8c3.9-2 8.7-.4 10.7 3.5zm134 13.9L352 406.9V480c0 17.7-14.3 32-32 32H64c-17.7 0-32-14.3-32-32v-96l-17.1-96.5C5 227.6 0 166.6 0 106 0 47.6 47.2 0 105.2 0H280c57.3 0 104 47.6 104 106v43.6c37.2 12.6 64 45.9 64 85.4 0 52.8-21.9 102.4-61.6 139.7zm-21.9-23.4C397.7 320.2 416 278.9 416 235c0-32.5-28.7-59-64-59h-31.2c-26.3 0-48.3 20.8-48.8 47.1-.5 24.6 17.6 45.1 41.1 48.4 4 .6 6.9 4.1 6.9 8.1v16c0 4.7-4.1 8.5-8.8 8-40-4.4-71.2-38.4-71.2-79.5 0-11.4 2.5-22.2 6.8-32h-89.5c-30.6 0-59.5-10.9-82.3-30.8-3.5-3.1-3.7-8.4-.4-11.7l11.3-11.3c3-3 7.7-3.1 10.9-.4 16.9 14.4 38.1 22.3 60.5 22.3H272v.4c13.4-10.1 29.9-16.4 48-16.4h32v-38c0-41.5-31.6-74-72-74H105.2C64.8 32 32 65.2 32 106c0 149.6 31.7 252.5 31.8 278H88c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H63.8l.2 64h256v-64h-24c-4.4 0-8-3.6-8-8v-16c0-4.4 3.6-8 8-8h33.7l34.8-32.7z"] };
var faBraille = { prefix: 'fal', iconName: 'braille', icon: [640, 512, [], "f2a1", "M64 256c0 17.673-14.327 32-32 32S0 273.673 0 256s14.327-32 32-32 32 14.327 32 32zM32 400c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm0-336C14.327 64 0 78.327 0 96s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm160 176c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm0 160c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm0-336c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm256 176c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm0 160c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm0-336c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm160 176c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm0 160c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm0-320c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16z"] };
var faBriefcase = { prefix: 'fal', iconName: 'briefcase', icon: [512, 512, [], "f0b1", "M464 96H352V56c0-13.255-10.745-24-24-24H184c-13.255 0-24 10.745-24 24v40H48c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V144c0-26.51-21.49-48-48-48zM192 64h128v32H192V64zm288 368c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V288h160v40c0 13.255 10.745 24 24 24h80c13.255 0 24-10.745 24-24v-40h160v144zM224 288h64v32h-64v-32zM32 256V144c0-8.822 7.178-16 16-16h416c8.822 0 16 7.178 16 16v112H32z"] };
var faBrowser = { prefix: 'fal', iconName: 'browser', icon: [512, 512, [], "f37e", "M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zM32 80c0-8.8 7.2-16 16-16h48v64H32V80zm448 352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V160h448v272zm0-304H128V64h336c8.8 0 16 7.2 16 16v48z"] };
var faBug = { prefix: 'fal', iconName: 'bug', icon: [576, 512, [], "f188", "M544 272h-64V150.627l35.313-35.313c6.249-6.248 6.249-16.379 0-22.627-6.248-6.248-16.379-6.248-22.627 0L457.373 128H417C417 57.26 359.751 0 289 0c-70.74 0-128 57.249-128 128h-42.373L75.314 84.687c-6.249-6.248-16.379-6.248-22.628 0-6.248 6.248-6.248 16.379 0 22.627L96 150.627V272H32c-8.836 0-16 7.163-16 16s7.164 16 16 16h64v24c0 36.634 11.256 70.686 30.484 98.889l-57.797 57.797c-6.249 6.248-6.249 16.379 0 22.627 6.249 6.249 16.379 6.248 22.627 0l55.616-55.616C178.851 483.971 223.128 504 272 504h32c48.872 0 93.149-20.029 125.071-52.302l55.616 55.616c6.249 6.249 16.379 6.248 22.627 0 6.249-6.248 6.249-16.379 0-22.627l-57.797-57.797C468.744 398.686 480 364.634 480 328v-24h64c8.837 0 16-7.163 16-16s-7.163-16-16-16zM289 32c53.019 0 96 42.981 96 96H193c0-53.019 42.981-96 96-96zm15 440V236c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12v236c-79.402 0-144-64.599-144-144V160h320v168c0 79.401-64.599 144-144 144z"] };
var faBuilding = { prefix: 'fal', iconName: 'building', icon: [448, 512, [], "f1ad", "M192 107v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm116-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12zm-128 96h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12zm128 0h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12zm-128 96h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12zm128 0h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12zm140 205v20H0v-20c0-6.627 5.373-12 12-12h20V24C32 10.745 42.745 0 56 0h336c13.255 0 24 10.745 24 24v456h20c6.627 0 12 5.373 12 12zm-64-12V32H64v448h128v-85c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v85h128z"] };
var faBullhorn = { prefix: 'fal', iconName: 'bullhorn', icon: [576, 512, [], "f0a1", "M544 192V32c0-17.7-14.3-32-32-32-65 56-174 128-304 128H48c-26.5 0-48 21.5-48 48v96c0 26.5 21.5 48 48 48h16.8c-5.3 58.6 15 107 28.9 151.6 1.5 5 4.3 9.5 8 13.2C119 502.1 142.8 512 167 512c31.8 0 60.9-17 75.5-47.7 7-14.7 1.9-32.3-11.9-40.9-27.9-17.4-32-22.5-26.8-31.5 6.9-12.1 5.2-27.3-4.2-37.6-5.3-5.8-1.3-27.4 11-34.3 128.9.9 236.9 72.4 301.5 128 17.7 0 32-14.3 32-32V256c17.7 0 32-14.3 32-32s-14.4-32-32.1-32zM213.7 450.5c-17.4 36.7-63.5 37.4-89.4 11.6C110.5 417.6 91.4 372.9 97 320h73.7c-8.3 19.2-7.6 42.1 5.3 56-19.9 34.7 8 56 37.7 74.5zM32 272v-96c0-8.8 7.2-16 16-16h176v128H48c-8.8 0-16-7.2-16-16zm480 134.4c-36.6-29.1-74.7-53.4-113.7-72.2-47.3-22.9-95-37.4-142.3-43.2V157c47.3-5.9 95-20.3 142.3-43.2 38.9-18.9 77.1-43.1 113.7-72.2v364.8z"] };
var faBullseye = { prefix: 'fal', iconName: 'bullseye', icon: [512, 512, [], "f140", "M256 40c118.663 0 216 96.055 216 216 0 118.663-96.055 216-216 216-118.663 0-216-96.055-216-216 0-118.663 96.055-216 216-216m0-32C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 128c66.319 0 120 53.67 120 120 0 66.319-53.67 120-120 120-66.319 0-120-53.67-120-120 0-66.319 53.67-120 120-120m0-32c-83.947 0-152 68.053-152 152s68.053 152 152 152 152-68.053 152-152-68.053-152-152-152zm0 96c-30.928 0-56 25.072-56 56s25.072 56 56 56 56-25.072 56-56-25.072-56-56-56z"] };
var faBus = { prefix: 'fal', iconName: 'bus', icon: [512, 512, [], "f207", "M160 352c0 17.673-14.327 32-32 32s-32-14.327-32-32 14.327-32 32-32 32 14.327 32 32zm224-32c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm128-168v80c0 13.255-10.745 24-24 24h-8v144c0 20.858-13.377 38.643-32 45.248V472c0 22.091-17.909 40-40 40h-48c-22.091 0-40-17.909-40-40v-24H192v24c0 22.091-17.909 40-40 40h-48c-22.091 0-40-17.909-40-40v-26.752c-18.623-6.605-32-24.39-32-45.248V256h-8c-13.255 0-24-10.745-24-24v-80c0-13.255 10.745-24 24-24h8v-27.429C32 21.453 175.336 0 256 0c80.976 0 224 21.456 224 100.571V128h8c13.255 0 24 10.745 24 24zM64 256h384V128H64v128zm.435-160h383.13C440.977 60.261 357.736 32 256 32S71.023 60.261 64.435 96zM160 448H96v24c0 4.411 3.589 8 8 8h48c4.411 0 8-3.589 8-8v-24zm256 24v-24h-64v24c0 4.411 3.589 8 8 8h48c4.411 0 8-3.589 8-8zm32-72V288H64v112c0 8.837 7.163 16 16 16h352c8.837 0 16-7.163 16-16z"] };
var faCalculator = { prefix: 'fal', iconName: 'calculator', icon: [384, 512, [], "f1ec", "M336 0H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48V48c0-26.51-21.49-48-48-48zM48 32h288c8.822 0 16 7.178 16 16v80H32V48c0-8.822 7.178-16 16-16zm288 448H48c-8.822 0-16-7.178-16-16V160h320v304c0 8.822-7.178 16-16 16zM128 204v40c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm96 0v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm96 0v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm-192 96v40c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm96 0v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm96 0v136c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12V300c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm-192 96v40c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm96 0v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12z"] };
var faCalendar = { prefix: 'fal', iconName: 'calendar', icon: [448, 512, [], "f133", "M400 64h-48V12c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12v52H128V12c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12v52H48C21.49 64 0 85.49 0 112v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zM48 96h352c8.822 0 16 7.178 16 16v48H32v-48c0-8.822 7.178-16 16-16zm352 384H48c-8.822 0-16-7.178-16-16V192h384v272c0 8.822-7.178 16-16 16z"] };
var faCalendarAlt = { prefix: 'fal', iconName: 'calendar-alt', icon: [448, 512, [], "f073", "M400 64h-48V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H128V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM48 96h352c8.8 0 16 7.2 16 16v48H32v-48c0-8.8 7.2-16 16-16zm352 384H48c-8.8 0-16-7.2-16-16V192h384v272c0 8.8-7.2 16-16 16zM148 320h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm96 0h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm96 0h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm-96 96h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm-96 0h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm192 0h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12z"] };
var faCalendarCheck = { prefix: 'fal', iconName: 'calendar-check', icon: [448, 512, [], "f274", "M400 64h-48V12c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12v52H128V12c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12v52H48C21.49 64 0 85.49 0 112v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zM48 96h352c8.822 0 16 7.178 16 16v48H32v-48c0-8.822 7.178-16 16-16zm352 384H48c-8.822 0-16-7.178-16-16V192h384v272c0 8.822-7.178 16-16 16zm-66.467-194.937l-134.791 133.71c-4.7 4.663-12.288 4.642-16.963-.046l-67.358-67.552c-4.683-4.697-4.672-12.301.024-16.985l8.505-8.48c4.697-4.683 12.301-4.672 16.984.024l50.442 50.587 117.782-116.837c4.709-4.671 12.313-4.641 16.985.068l8.458 8.527c4.672 4.709 4.641 12.313-.068 16.984z"] };
var faCalendarEdit = { prefix: 'fal', iconName: 'calendar-edit', icon: [448, 512, [], "f333", "M400 64h-48V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H128V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM48 96h352c8.8 0 16 7.2 16 16v48H32v-48c0-8.8 7.2-16 16-16zm352 384H48c-8.8 0-16-7.2-16-16V192h384v272c0 8.8-7.2 16-16 16zM255.7 269.7l34.6 34.6c2.1 2.1 2.1 5.4 0 7.4L159.1 442.9l-35.1 5c-6.9 1-12.9-4.9-11.9-11.9l5-35.1 131.2-131.2c2-2 5.4-2 7.4 0zm75.2 1.4l-19.2 19.2c-2.1 2.1-5.4 2.1-7.4 0l-34.6-34.6c-2.1-2.1-2.1-5.4 0-7.4l19.2-19.2c6.8-6.8 17.9-6.8 24.7 0l17.3 17.3c6.8 6.8 6.8 17.9 0 24.7z"] };
var faCalendarExclamation = { prefix: 'fal', iconName: 'calendar-exclamation', icon: [448, 512, [], "f334", "M400 64h-48V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H128V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM48 96h352c8.8 0 16 7.2 16 16v48H32v-48c0-8.8 7.2-16 16-16zm352 384H48c-8.8 0-16-7.2-16-16V192h384v272c0 8.8-7.2 16-16 16zM212.7 224h22.6c6.9 0 12.4 5.8 12 12.7l-6.7 120c-.4 6.4-5.6 11.3-12 11.3h-9.3c-6.4 0-11.6-5-12-11.3l-6.7-120c-.3-6.9 5.2-12.7 12.1-12.7zM252 416c0 15.5-12.5 28-28 28s-28-12.5-28-28 12.5-28 28-28 28 12.5 28 28z"] };
var faCalendarMinus = { prefix: 'fal', iconName: 'calendar-minus', icon: [448, 512, [], "f272", "M400 64h-48V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H128V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM48 96h352c8.8 0 16 7.2 16 16v48H32v-48c0-8.8 7.2-16 16-16zm352 384H48c-8.8 0-16-7.2-16-16V192h384v272c0 8.8-7.2 16-16 16zm-92-128H140c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12z"] };
var faCalendarPlus = { prefix: 'fal', iconName: 'calendar-plus', icon: [448, 512, [], "f271", "M320 332v8c0 6.6-5.4 12-12 12h-68v68c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12v-68h-68c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h68v-68c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v68h68c6.6 0 12 5.4 12 12zm128-220v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V112c0-26.5 21.5-48 48-48h48V12c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v52h192V12c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v52h48c26.5 0 48 21.5 48 48zm-416 0v48h384v-48c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16zm384 352V192H32v272c0 8.8 7.2 16 16 16h352c8.8 0 16-7.2 16-16z"] };
var faCalendarTimes = { prefix: 'fal', iconName: 'calendar-times', icon: [448, 512, [], "f273", "M400 64h-48V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H128V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM48 96h352c8.8 0 16 7.2 16 16v48H32v-48c0-8.8 7.2-16 16-16zm352 384H48c-8.8 0-16-7.2-16-16V192h384v272c0 8.8-7.2 16-16 16zm-105.3-95.9c4.7 4.7 4.7 12.3 0 17l-5.7 5.7c-4.7 4.7-12.3 4.7-17 0l-48-48.2-48.1 48.1c-4.7 4.7-12.3 4.7-17 0l-5.7-5.7c-4.7-4.7-4.7-12.3 0-17l48.1-48.1-48.1-48.1c-4.7-4.7-4.7-12.3 0-17l5.7-5.7c4.7-4.7 12.3-4.7 17 0l48.1 48.1 48.1-48.1c4.7-4.7 12.3-4.7 17 0l5.7 5.7c4.7 4.7 4.7 12.3 0 17L246.6 336l48.1 48.1z"] };
var faCamera = { prefix: 'fal', iconName: 'camera', icon: [512, 512, [], "f030", "M324.3 64c3.3 0 6.3 2.1 7.5 5.2l22.1 58.8H464c8.8 0 16 7.2 16 16v288c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16h110.2l20.1-53.6c2.3-6.2 8.3-10.4 15-10.4h131m0-32h-131c-20 0-37.9 12.4-44.9 31.1L136 96H48c-26.5 0-48 21.5-48 48v288c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V144c0-26.5-21.5-48-48-48h-88l-14.3-38c-5.8-15.7-20.7-26-37.4-26zM256 408c-66.2 0-120-53.8-120-120s53.8-120 120-120 120 53.8 120 120-53.8 120-120 120zm0-208c-48.5 0-88 39.5-88 88s39.5 88 88 88 88-39.5 88-88-39.5-88-88-88z"] };
var faCameraAlt = { prefix: 'fal', iconName: 'camera-alt', icon: [512, 512, [], "f332", "M256 408c-66.2 0-120-53.8-120-120s53.8-120 120-120 120 53.8 120 120-53.8 120-120 120zm0-208c-48.5 0-88 39.5-88 88s39.5 88 88 88 88-39.5 88-88-39.5-88-88-88zm-32 88c0-17.6 14.4-32 32-32 8.8 0 16-7.2 16-16s-7.2-16-16-16c-35.3 0-64 28.7-64 64 0 8.8 7.2 16 16 16s16-7.2 16-16zM324.3 64c3.3 0 6.3 2.1 7.5 5.2l22.1 58.8H464c8.8 0 16 7.2 16 16v288c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16h110.2l20.1-53.6c2.3-6.2 8.3-10.4 15-10.4h131m0-32h-131c-20 0-37.9 12.4-44.9 31.1L136 96H48c-26.5 0-48 21.5-48 48v288c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V144c0-26.5-21.5-48-48-48h-88l-14.3-38c-5.8-15.7-20.7-26-37.4-26z"] };
var faCameraRetro = { prefix: 'fal', iconName: 'camera-retro', icon: [512, 512, [], "f083", "M32 58V38c0-3.3 2.7-6 6-6h116c3.3 0 6 2.7 6 6v20c0 3.3-2.7 6-6 6H38c-3.3 0-6-2.7-6-6zm344 230c0-66.2-53.8-120-120-120s-120 53.8-120 120 53.8 120 120 120 120-53.8 120-120zm-32 0c0 48.5-39.5 88-88 88s-88-39.5-88-88 39.5-88 88-88 88 39.5 88 88zm-120 0c0-17.6 14.4-32 32-32 8.8 0 16-7.2 16-16s-7.2-16-16-16c-35.3 0-64 28.7-64 64 0 8.8 7.2 16 16 16s16-7.2 16-16zM512 80v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V144c0-26.5 21.5-48 48-48h136l33.6-44.8C226.7 39.1 240.9 32 256 32h208c26.5 0 48 21.5 48 48zM224 96h240c5.6 0 11 1 16 2.7V80c0-8.8-7.2-16-16-16H256c-5 0-9.8 2.4-12.8 6.4L224 96zm256 48c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h416c8.8 0 16-7.2 16-16V144z"] };
var faCar = { prefix: 'fal', iconName: 'car', icon: [512, 512, [], "f1b9", "M152 304c0 17.673-30.327 16-48 16s-32-14.327-32-32 14.327-32 32-32 48 30.327 48 48zm256-48c-17.673 0-48 30.327-48 48s30.327 16 48 16 32-14.327 32-32-14.327-32-32-32zm103.375-88.205l-8 24A12 12 0 0 1 491.991 200H463.49c19.933 17.591 32.51 43.325 32.51 72v56c0 15.254-6.107 29.077-16 39.176V408c0 22.091-17.909 40-40 40h-48c-22.091 0-40-17.909-40-40v-24H160v24c0 22.091-17.909 40-40 40H72c-22.091 0-40-17.909-40-40v-40.823c-9.893-10.1-16-23.922-16-39.176v-56c0-28.675 12.577-54.409 32.51-72H20.009a12 12 0 0 1-11.384-8.205l-8-24C-1.965 160.024 3.818 152 12.009 152h31.982a12 12 0 0 1 11.384 8.205l5.167 15.501 30.583-65.536C104.214 82.122 132.67 64 163.621 64H348.38c30.951 0 59.406 18.123 72.494 46.17l30.584 65.536 5.167-15.501A12 12 0 0 1 468.009 152h31.982c8.191 0 13.974 8.024 11.384 15.795zm-416.356 9.702A96.655 96.655 0 0 1 112 176h288c5.794 0 11.469.514 16.981 1.497l-25.105-53.795C384.023 106.873 366.95 96 348.38 96H163.621c-18.57 0-35.644 10.874-43.497 27.702l-25.105 53.795zM128 384c-60.544 0-58.319.235-64-.578V408c0 4.411 3.589 8 8 8h48c4.411 0 8-3.589 8-8v-24zm320-.578c-5.686.814-3.559.578-64 .578v24c0 4.411 3.589 8 8 8h48c4.411 0 8-3.589 8-8v-24.578zM400 208H112c-35.29 0-64 28.71-64 64v56c0 13.234 10.766 24 24 24h368c13.234 0 24-10.766 24-24v-56c0-35.29-28.71-64-64-64zm-70 80H182c-3.507 0-6 2.216-6 8 0 13.255 10.745 24 24 24h112c13.255 0 24-10.745 24-24 0-5.788-2.497-8-6-8z"] };
var faCaretCircleDown = { prefix: 'fal', iconName: 'caret-circle-down', icon: [512, 512, [], "f32d", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm216 248c0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216zm-120-32l-96 96-96-96h192m-192-32c-28.4 0-42.8 34.5-22.6 54.6l96 96c12.5 12.5 32.8 12.5 45.3 0l96-96c20.1-20.1 5.9-54.6-22.6-54.6H160z"] };
var faCaretCircleLeft = { prefix: 'fal', iconName: 'caret-circle-left', icon: [512, 512, [], "f32e", "M504 256C504 119 393 8 256 8S8 119 8 256s111 248 248 248 248-111 248-248zM256 472c-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216zm32-120l-96-96 96-96v192m32-192c0-28.4-34.5-42.8-54.6-22.6l-96 96c-12.5 12.5-12.5 32.8 0 45.3l96 96c20.1 20.1 54.6 5.9 54.6-22.6V160z"] };
var faCaretCircleRight = { prefix: 'fal', iconName: 'caret-circle-right', icon: [512, 512, [], "f330", "M8 256c0 137 111 248 248 248s248-111 248-248S393 8 256 8 8 119 8 256zM256 40c118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216zm-32 120l96 96-96 96V160m-32 192c0 28.4 34.5 42.8 54.6 22.6l96-96c12.5-12.5 12.5-32.8 0-45.3l-96-96c-20.1-20.1-54.6-5.9-54.6 22.6V352z"] };
var faCaretCircleUp = { prefix: 'fal', iconName: 'caret-circle-up', icon: [512, 512, [], "f331", "M256 504c137 0 248-111 248-248S393 8 256 8 8 119 8 256s111 248 248 248zM40 256c0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216zm120 32l96-96 96 96H160m192 32c28.4 0 42.8-34.5 22.6-54.6l-96-96c-12.5-12.5-32.8-12.5-45.3 0l-96 96c-20.1 20.1-5.9 54.6 22.6 54.6H352z"] };
var faCaretDown = { prefix: 'fal', iconName: 'caret-down', icon: [320, 512, [], "f0d7", "M287.968 160H32.038c-28.425 0-42.767 34.488-22.627 54.627l127.962 128c12.496 12.496 32.758 12.497 45.255 0l127.968-128C330.695 194.528 316.45 160 287.968 160zM160 320L32 192h256L160 320z"] };
var faCaretLeft = { prefix: 'fal', iconName: 'caret-left', icon: [192, 512, [], "f0d9", "M192 383.968v-255.93c0-28.425-34.488-42.767-54.627-22.627l-128 127.962c-12.496 12.496-12.497 32.758 0 45.255l128 127.968C157.472 426.695 192 412.45 192 383.968zM32 256l128-128v256L32 256z"] };
var faCaretRight = { prefix: 'fal', iconName: 'caret-right', icon: [192, 512, [], "f0da", "M0 128.032v255.93c0 28.425 34.488 42.767 54.627 22.627l128-127.962c12.496-12.496 12.497-32.758 0-45.255l-128-127.968C34.528 85.305 0 99.55 0 128.032zM160 256L32 384V128l128 128z"] };
var faCaretSquareDown = { prefix: 'fal', iconName: 'caret-square-down', icon: [448, 512, [], "f150", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352zm-96-208l-96 96-96-96h192m-192-32c-28.4 0-42.8 34.5-22.6 54.6l96 96c12.5 12.5 32.8 12.5 45.3 0l96-96c20.1-20.1 5.9-54.6-22.6-54.6H128z"] };
var faCaretSquareLeft = { prefix: 'fal', iconName: 'caret-square-left', icon: [448, 512, [], "f191", "M448 432V80c0-26.5-21.5-48-48-48H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48zM48 448c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48zm208-96l-96-96 96-96v192m32-192c0-28.4-34.5-42.8-54.6-22.6l-96 96c-12.5 12.5-12.5 32.8 0 45.3l96 96c20.1 20.1 54.6 5.9 54.6-22.6V160z"] };
var faCaretSquareRight = { prefix: 'fal', iconName: 'caret-square-right', icon: [448, 512, [], "f152", "M0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48H48C21.5 32 0 53.5 0 80zm400-16c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352zm-208 96l96 96-96 96V160m-32 192c0 28.4 34.5 42.8 54.6 22.6l96-96c12.5-12.5 12.5-32.8 0-45.3l-96-96c-20.1-20.1-54.6-5.9-54.6 22.6V352z"] };
var faCaretSquareUp = { prefix: 'fal', iconName: 'caret-square-up', icon: [448, 512, [], "f151", "M48 480h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48zM32 80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80zm96 208l96-96 96 96H128m192 32c28.4 0 42.8-34.5 22.6-54.6l-96-96c-12.5-12.5-32.8-12.5-45.3 0l-96 96c-20 20.1-5.8 54.6 22.7 54.6h192z"] };
var faCaretUp = { prefix: 'fal', iconName: 'caret-up', icon: [320, 512, [], "f0d8", "M32.032 352h255.93c28.425 0 42.767-34.488 22.627-54.627l-127.962-128c-12.496-12.496-32.758-12.497-45.255 0l-127.968 128C-10.695 317.472 3.55 352 32.032 352zM160 192l128 128H32l128-128z"] };
var faCartArrowDown = { prefix: 'fal', iconName: 'cart-arrow-down', icon: [576, 512, [], "f218", "M551.991 64H129.28l-8.329-44.423C118.822 8.226 108.911 0 97.362 0H12C5.373 0 0 5.373 0 12v8c0 6.627 5.373 12 12 12h78.72l69.927 372.946C150.305 416.314 144 431.42 144 448c0 35.346 28.654 64 64 64s64-28.654 64-64a63.681 63.681 0 0 0-8.583-32h145.167a63.681 63.681 0 0 0-8.583 32c0 35.346 28.654 64 64 64 35.346 0 64-28.654 64-64 0-17.993-7.435-34.24-19.388-45.868C506.022 391.891 496.76 384 485.328 384H189.28l-12-64h331.381c11.368 0 21.177-7.976 23.496-19.105l43.331-208C578.592 77.991 567.215 64 551.991 64zM240 448c0 17.645-14.355 32-32 32s-32-14.355-32-32 14.355-32 32-32 32 14.355 32 32zm224 32c-17.645 0-32-14.355-32-32s14.355-32 32-32 32 14.355 32 32-14.355 32-32 32zm38.156-192H171.28l-36-192h406.876l-40 192zm-106.641-75.515l-51.029 51.029c-4.686 4.686-12.284 4.686-16.971 0l-51.029-51.029c-7.56-7.56-2.206-20.485 8.485-20.485H320v-52c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v52h35.029c10.691 0 16.045 12.926 8.486 20.485z"] };
var faCartPlus = { prefix: 'fal', iconName: 'cart-plus', icon: [576, 512, [], "f217", "M551.991 64H129.28l-8.329-44.423C118.822 8.226 108.911 0 97.362 0H12C5.373 0 0 5.373 0 12v8c0 6.627 5.373 12 12 12h78.72l69.927 372.946C150.305 416.314 144 431.42 144 448c0 35.346 28.654 64 64 64s64-28.654 64-64a63.681 63.681 0 0 0-8.583-32h145.167a63.681 63.681 0 0 0-8.583 32c0 35.346 28.654 64 64 64 35.346 0 64-28.654 64-64 0-17.993-7.435-34.24-19.388-45.868C506.022 391.891 496.76 384 485.328 384H189.28l-12-64h331.381c11.368 0 21.177-7.976 23.496-19.105l43.331-208C578.592 77.991 567.215 64 551.991 64zM464 416c17.645 0 32 14.355 32 32s-14.355 32-32 32-32-14.355-32-32 14.355-32 32-32zm-256 0c17.645 0 32 14.355 32 32s-14.355 32-32 32-32-14.355-32-32 14.355-32 32-32zm294.156-128H171.28l-36-192h406.876l-40 192zM272 196v-8c0-6.627 5.373-12 12-12h36v-36c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v36h36c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12h-36v36c0 6.627-5.373 12-12 12h-8c-6.627 0-12-5.373-12-12v-36h-36c-6.627 0-12-5.373-12-12z"] };
var faCertificate = { prefix: 'fal', iconName: 'certificate', icon: [512, 512, [], "f0a3", "M495.768 272.292l-16.72-16.363 16.719-16.362c30.04-28.786 16.251-79.537-23.83-89.365l-22.768-5.811 6.464-22.698c11.232-39.997-26.115-76.468-65.449-65.451l-22.672 6.461-5.809-22.778C351.926.052 300.89-13.786 272.299 16.142L256 32.934l-16.301-16.791c-28.323-29.647-79.535-16.514-89.405 23.793l-5.807 22.768-22.672-6.461c-39.14-10.992-76.677 25.224-65.449 65.45l6.464 22.698-22.767 5.811c-40.081 9.827-53.87 60.579-23.831 89.365l16.72 16.363-16.719 16.362c-30.04 28.786-16.251 79.537 23.83 89.365l22.768 5.811-6.464 22.698c-11.221 40.203 26.255 76.429 65.449 65.45l22.672-6.461 5.807 22.767c9.93 40.578 60.865 53.609 89.366 23.836L256 479.05l16.254 16.62c28.257 29.9 79.554 16.68 89.452-23.746l5.807-22.767 22.672 6.461c39.472 11.086 76.598-25.509 65.449-65.45l-6.464-22.698 22.767-5.811c40.082-9.829 53.87-60.581 23.831-89.367zm-31.567 58.313l-54.819 13.991 15.453 54.263c4.366 15.605-10.346 30.332-25.953 25.962l-54.245-15.458L330.65 464.2c-3.796 15.884-24.347 21.136-35.285 9.334L256 433.284l-39.366 40.251c-11.051 11.681-31.4 6.919-35.285-9.334l-13.986-54.837-54.245 15.458c-15.603 4.368-30.32-10.354-25.953-25.962l15.453-54.263-54.819-13.991c-15.733-3.762-21.326-23.942-9.331-35.297l40.237-39.379-40.237-39.379c-11.989-11.35-6.407-31.532 9.331-35.296l54.819-13.991L87.165 113c-4.366-15.605 10.346-30.332 25.953-25.962l54.245 15.458 13.986-54.837c3.743-15.664 24.233-21.016 35.285-9.334L256 78.873l39.366-40.548c11.179-11.816 31.583-6.152 35.285 9.334l13.986 54.837 54.245-15.458c15.603-4.368 30.32 10.354 25.953 25.962l-15.453 54.263 54.819 13.991c15.733 3.762 21.326 23.942 9.331 35.296l-40.237 39.379 40.237 39.379c11.989 11.351 6.407 31.533-9.331 35.297z"] };
var faChartArea = { prefix: 'fal', iconName: 'chart-area', icon: [512, 512, [], "f1fe", "M500 416c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H12c-6.6 0-12-5.4-12-12V76c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v340h468zM372 162l-84 54-86.5-84.5c-5.1-5.1-13.4-4.6-17.9 1L64 288v96h416l-90.3-216.7c-3-6.9-11.5-9.4-17.7-5.3zM96 299.2l98.7-131.3 89.3 89.3 85.8-57.2 61.7 152H96v-52.8z"] };
var faChartBar = { prefix: 'fal', iconName: 'chart-bar', icon: [512, 512, [], "f080", "M500 416c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H12c-6.6 0-12-5.4-12-12V76c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v340h468zm-340-70v-84c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6v84c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6zm288 0V102c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6v244c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6zm-96 0V198c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6v148c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6zm-96 0V134c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6v212c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6z"] };
var faChartLine = { prefix: 'fal', iconName: 'chart-line', icon: [512, 512, [], "f201", "M500 416c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H12c-6.6 0-12-5.4-12-12V76c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v340h468zm-20-295v94c0 29.3-35.6 44-56.3 23.3L388 202.6l-95.8 95.8c-2.3 2.3-6.1 2.3-8.5 0L224.3 239 111.8 358.6c-2.3 2.4-6.1 2.5-8.5.3l-14.6-13.7c-2.4-2.3-2.5-6.1-.3-8.5l131-139.1c2.3-2.5 6.2-2.5 8.6-.1l60 60 77.4-77.4-35.7-35.7c-20.8-20.8-6-56.3 23.3-56.3h94c18.2-.1 33 14.7 33 32.9zm-28.8 0c0-2.3-1.8-4.1-4.1-4.1h-94c-3.7 0-5.5 4.5-2.9 7l94 94c2.6 2.6 7 .8 7-2.9v-94z"] };
var faChartPie = { prefix: 'fal', iconName: 'chart-pie', icon: [512, 512, [], "f200", "M256 12.3V224h212c6.9 0 12.4-5.8 12-12.7C473.6 97.9 382.3 6.7 268.7.3c-6.9-.4-12.7 5.1-12.7 12zm32 22c80.3 13.4 144.3 77.3 157.7 157.7H288V34.3zM280 256l150 150.2c4.9 4.9 12.9 4.6 17.5-.5 34.9-39 53.8-88 56.5-137 .4-6.9-5.1-12.7-12-12.7H280zm156.9 111.8l-79.6-79.9h112.4c-4.8 28.6-16 56.3-32.8 79.9zM224 256V44.2c0-6.9-5.8-12.4-12.8-12C93.6 38.9.2 136.5 0 255.6c-.3 193.1 229.6 296 373.1 168 5.2-4.6 5.4-12.6.5-17.5L224 256zm-192 0c0-96.6 70.8-174.6 160-189.5V256c0 16.3-2.4 10.8 9.4 22.6L335.3 413C209.3 502.9 32 412 32 256z"] };
var faCheck = { prefix: 'fal', iconName: 'check', icon: [448, 512, [], "f00c", "M413.505 91.951L133.49 371.966l-98.995-98.995c-4.686-4.686-12.284-4.686-16.971 0L6.211 284.284c-4.686 4.686-4.686 12.284 0 16.971l118.794 118.794c4.686 4.686 12.284 4.686 16.971 0l299.813-299.813c4.686-4.686 4.686-12.284 0-16.971l-11.314-11.314c-4.686-4.686-12.284-4.686-16.97 0z"] };
var faCheckCircle = { prefix: 'fal', iconName: 'check-circle', icon: [512, 512, [], "f058", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 464c-118.664 0-216-96.055-216-216 0-118.663 96.055-216 216-216 118.664 0 216 96.055 216 216 0 118.663-96.055 216-216 216zm141.63-274.961L217.15 376.071c-4.705 4.667-12.303 4.637-16.97-.068l-85.878-86.572c-4.667-4.705-4.637-12.303.068-16.97l8.52-8.451c4.705-4.667 12.303-4.637 16.97.068l68.976 69.533 163.441-162.13c4.705-4.667 12.303-4.637 16.97.068l8.451 8.52c4.668 4.705 4.637 12.303-.068 16.97z"] };
var faCheckSquare = { prefix: 'fal', iconName: 'check-square', icon: [448, 512, [], "f14a", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm0 32c8.823 0 16 7.178 16 16v352c0 8.822-7.177 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352m-34.301 98.293l-8.451-8.52c-4.667-4.705-12.265-4.736-16.97-.068l-163.441 162.13-68.976-69.533c-4.667-4.705-12.265-4.736-16.97-.068l-8.52 8.451c-4.705 4.667-4.736 12.265-.068 16.97l85.878 86.572c4.667 4.705 12.265 4.736 16.97.068l180.48-179.032c4.704-4.667 4.735-12.265.068-16.97z"] };
var faChess = { prefix: 'fal', iconName: 'chess', icon: [512, 512, [], "f439", "M507.097 436.404L488 422.398V396c0-6.627-5.373-12-12-12h-3.765c-9.459-40.997-10.598-79.938-10.698-99.584l30.03-24.399a12 12 0 0 0 4.433-9.313V184c0-13.255-10.745-24-24-24H296c-13.255 0-24 10.745-24 24v66.703c0 3.614 1.628 7.035 4.433 9.313l30.031 24.4c-.098 19.622-1.234 58.518-10.702 99.583H292c-6.627 0-12 5.373-12 12v26.398l-19.097 14.006A11.997 11.997 0 0 0 256 446.08v-.117a12 12 0 0 0-4.942-9.705L232 422.398V396c0-6.627-5.373-12-12-12h-15.893c-16.967-48.115-14.182-103.907-14.182-127.813V256H216c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-21.942l31.537-96.548C230.663 111.938 219.102 96 202.782 96h-48.983V68.766h19.792a5.98 5.98 0 0 0 5.979-5.98V40.363a5.98 5.98 0 0 0-5.979-5.98h-28.388V5.98A5.98 5.98 0 0 0 139.224 0H116.8a5.979 5.979 0 0 0-5.979 5.98v28.403H82.4a5.98 5.98 0 0 0-5.979 5.98v22.424a5.98 5.98 0 0 0 5.979 5.98h19.824V96H53.211c-16.321 0-27.882 15.939-22.813 31.453L61.941 224H40c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h26.074v.187c0 22.898 2.903 79.292-14.177 127.813H36c-6.627 0-12 5.373-12 12v26.398l-19.058 13.86A12.002 12.002 0 0 0 0 445.963V500c0 6.627 5.373 12 12 12h231.999c6.627 0 12-5.373 12-12H256c0 6.627 5.373 12 12 12h232c6.627 0 12-5.373 12-12v-53.919c0-3.823-1.821-7.416-4.903-9.677zM64.241 128h127.511l-31.357 96h-64.79l-31.364-96zm33.833 128.187V256h59.852v.187c0 26.289-2.342 78.07 12.525 127.813H85.544c15.021-50.385 12.53-102.299 12.53-127.813zM223.999 480H32v-23.853l24-17.454V416h144v22.693l24 17.454-.001 23.853zM304 241.185V192h24v32h32v-32h48v32h32v-32h24v49.185l-34.436 27.979-.026 7.582c-.053 15.602-.201 59.202 9.925 107.255h-110.93c10.14-48.128 9.984-91.677 9.929-107.258l-.027-7.58L304 241.185zM479.999 480H288v-23.853l24-17.454V416h144v22.693l24 17.454-.001 23.853zm-77.538-125.538h-36.922v-38.77c0-9.176 7.439-16.615 16.615-16.615h3.692c9.176 0 16.615 7.439 16.615 16.615v38.77z"] };
var faChessBishop = { prefix: 'fal', iconName: 'chess-bishop', icon: [320, 512, [], "f43a", "M9.739 304c0 53.781 22.893 75.784 58.435 86.03V448h183.652v-57.967c35.548-10.245 58.446-32.247 58.446-86.033 0-71.874-49.427-170.647-100.326-215.757 13.149-8.562 21.85-23.382 21.85-40.243 0-26.51-21.49-48-48-48H136c-26.51 0-48 21.49-48 48 0 16.919 8.761 31.782 21.986 40.33C59.126 133.479 9.739 232.172 9.739 304zm232.224-120.59l-97.034 97.034a6 6 0 0 0 0 8.485l14.142 14.142a6 6 0 0 0 8.485 0l89.106-89.106c5.455 12.866 21.61 52.824 21.61 90.035 0 50.257-20.602 51.047-58.446 61.953V416H100.174v-50.047c-37.805-10.9-58.435-11.61-58.435-61.953 0-85.783 81.566-208 118.266-208 12.854 0 48.279 25.038 81.958 87.41zM136 64c-8.822 0-16-7.178-16-16s7.178-16 16-16h47.795c8.822 0 16 7.178 16 16s-7.178 16-16 16H136zm172 448H12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h296c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12z"] };
var faChessBishopAlt = { prefix: 'fal', iconName: 'chess-bishop-alt', icon: [256, 512, [], "f43b", "M232 422.398V396c0-6.627-5.373-12-12-12h-15.661c-13.989-40.654-14.691-70.157-14.521-96.151H212c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-22.074v-19.365c35.913-18.606 33.767-61.034 33.767-61.979 0-48.037-37.011-114.353-71.39-135.018 8.902-2.024 15.553-9.972 15.553-19.487 0-11.046-8.954-20-20-20H108C96.954 0 88 8.954 88 20c0 9.549 6.697 17.521 15.646 19.511C69.104 60.309 32.29 126.773 32.29 174.505c0 .766-2.204 43.335 33.784 61.978v19.366H44c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h22.218c.225 24.802-.446 55.083-14.552 96.151H36c-6.627 0-12 5.373-12 12v26.398l-19.058 13.86A12.002 12.002 0 0 0 0 445.963V500c0 6.627 5.373 12 12 12h231.999c6.627 0 12-5.372 12-12l.001-54.037a12 12 0 0 0-4.942-9.705L232 422.398zM64.29 174.505C64.29 130.355 108.043 64 127.991 64c6.56 0 21.748 10.729 37.611 35.771l-44.673 44.673a6 6 0 0 0 0 8.485l14.142 14.142a6 6 0 0 0 8.485 0l37.477-37.477c6.73 16.331 10.659 32.391 10.659 44.911 0 33.2-21.208 35.517-33.767 39.052v42.292H98.074v-42.291c-12.402-3.493-33.784-5.761-33.784-39.053zM98.221 288h59.596c-.159 25.312.507 55.779 12.865 96H85.314c12.467-40.683 13.116-71.832 12.907-96zm125.778 192H32v-23.853l24-17.454V416h144v22.693l24 17.454-.001 23.853z"] };
var faChessBoard = { prefix: 'fal', iconName: 'chess-board', icon: [512, 512, [], "f43c", "M0 0v512h512V0H0zm480 480H32V32h448v448zm-352-32H64v-64h64v64zm64-64h64v64h-64v-64zm128 0h64v64h-64v-64zm-128 0h-64v-64h64v64zm128-64v64h-64v-64h64zm64 64v-64h64v64h-64zM128 256v64H64v-64h64zm128 64h-64v-64h64v64zm64-64h64v64h-64v-64zm-128 0h-64v-64h64v64zm64 0v-64h64v64h-64zm128 0v-64h64v64h-64zM128 128v64H64v-64h64zm64 64v-64h64v64h-64zm128 0v-64h64v64h-64zm-128-64h-64V64h64v64zm128 0h-64V64h64v64zm128 0h-64V64h64v64z"] };
var faChessClock = { prefix: 'fal', iconName: 'chess-clock', icon: [640, 512, [], "f43d", "M600 128H500c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-72c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12H192V96h20c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-72c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h20v32H40c-22.091 0-40 17.908-40 40v240c0 22.092 17.909 40 40 40h560c22.091 0 40-17.908 40-40V168c0-22.092-17.909-40-40-40zm8 280c0 4.411-3.589 8-8 8H40c-4.411 0-8-3.589-8-8V168c0-4.411 3.589-8 8-8h560c4.411 0 8 3.589 8 8v240zM464 168c-66.274 0-120 53.726-120 120s53.726 120 120 120 120-53.726 120-120-53.726-120-120-120zm0 208c-48.523 0-88-39.477-88-88s39.477-88 88-88 88 39.477 88 88-39.477 88-88 88zM176 168c-66.274 0-120 53.726-120 120s53.726 120 120 120 120-53.726 120-120-53.726-120-120-120zm0 208c-48.523 0-88-39.477-88-88s39.477-88 88-88 88 39.477 88 88-39.477 88-88 88zm16-140v56c0 6.627-5.373 12-12 12h-8c-6.627 0-12-5.373-12-12v-56c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12zm320.083 9.573c4.687 4.686 4.687 12.284 0 16.971l-39.598 39.598c-4.687 4.686-12.284 4.686-16.971 0l-5.656-5.656c-4.687-4.686-4.687-12.284 0-16.971l39.598-39.598c4.687-4.686 12.284-4.686 16.971 0l5.656 5.656z"] };
var faChessClockAlt = { prefix: 'fal', iconName: 'chess-clock-alt', icon: [640, 512, [], "f43e", "M600 128H480V96h20c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-72c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h20v32H212c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-72c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12H40c-22.091 0-40 17.908-40 40v240c0 22.092 17.909 40 40 40h560c22.091 0 40-17.908 40-40V168c0-22.092-17.909-40-40-40zm8 280c0 4.411-3.589 8-8 8H40c-4.411 0-8-3.589-8-8V168c0-4.411 3.589-8 8-8h560c4.411 0 8 3.589 8 8v240zM176 168c-66.274 0-120 53.726-120 120s53.726 120 120 120 120-53.726 120-120-53.726-120-120-120zm0 208c-48.523 0-88-39.477-88-88s39.477-88 88-88 88 39.477 88 88-39.477 88-88 88zm48.083-130.427c4.687 4.686 4.687 12.284 0 16.971l-39.598 39.598c-4.687 4.686-12.284 4.686-16.971 0l-5.656-5.656c-4.687-4.686-4.687-12.284 0-16.971l39.598-39.598c4.687-4.686 12.284-4.686 16.971 0l5.656 5.656zM464 168c-66.274 0-120 53.726-120 120s53.726 120 120 120 120-53.726 120-120-53.726-120-120-120zm0 208c-48.523 0-88-39.477-88-88s39.477-88 88-88 88 39.477 88 88-39.477 88-88 88zm16-140v56c0 6.627-5.373 12-12 12h-8c-6.627 0-12-5.373-12-12v-56c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12z"] };
var faChessKing = { prefix: 'fal', iconName: 'chess-king', icon: [448, 512, [], "f43f", "M416 492v8c0 6.627-5.373 12-12 12H44c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h360c6.627 0 12 5.373 12 12zm29.705-286.741L360.418 448H87.582L2.295 205.259C-6.846 179.244 12.459 152 40.033 152H208V96h-58a6 6 0 0 1-6-6V70a6 6 0 0 1 6-6h58V6a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v58h58a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6h-58v56h167.967c27.574 0 46.879 27.244 37.738 53.259zM407.967 184H40.033c-5.544 0-9.386 5.421-7.548 10.652L110.256 416h227.487l77.771-221.348c1.838-5.231-2.002-10.652-7.547-10.652z"] };
var faChessKingAlt = { prefix: 'fal', iconName: 'chess-king-alt', icon: [256, 512, [], "f440", "M232 422.398V396c0-6.627-5.373-12-12-12h-15.892c-16.967-48.115-14.182-103.907-14.182-127.813V256H216c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-21.942l31.537-96.548C230.663 111.938 219.102 96 202.782 96h-48.983V68.766h19.792a5.98 5.98 0 0 0 5.98-5.98V40.363a5.98 5.98 0 0 0-5.98-5.98h-28.387V5.98a5.98 5.98 0 0 0-5.98-5.98H116.8a5.98 5.98 0 0 0-5.98 5.98v28.403H82.401a5.98 5.98 0 0 0-5.98 5.98v22.424a5.98 5.98 0 0 0 5.98 5.98h19.824V96H53.212c-16.321 0-27.882 15.939-22.813 31.453L61.941 224H40c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h26.074v.187c0 22.898 2.903 79.292-14.177 127.813H36c-6.627 0-12 5.373-12 12v26.398l-19.058 13.86A12.002 12.002 0 0 0 0 445.963V500c0 6.627 5.373 12 12 12h231.999c6.627 0 12-5.372 12-12l.001-54.037a12 12 0 0 0-4.942-9.705L232 422.398zM191.752 128l-31.357 96h-64.79l-31.363-96h127.51zM98.074 256.187V256h59.852v.187c0 26.289-2.342 78.07 12.525 127.813H85.544c15.022-50.385 12.53-102.298 12.53-127.813zM223.999 480H32v-23.853l24-17.454V416h144v22.693l24 17.454-.001 23.853z"] };
var faChessKnight = { prefix: 'fal', iconName: 'chess-knight', icon: [384, 512, [], "f441", "M26.13 302.227l39.537 17.572A79.895 79.895 0 0 0 32 385.021V448h320V224c0-105.987-85.895-192-192-192H44.129c-11.211 0-21.75 4.366-29.677 12.293a41.913 41.913 0 0 0-7.86 48.444l2.952 5.904C3.337 107.813 0 118.621 0 129.941V262.02c0 17.37 10.257 33.153 26.13 40.207zM32 129.941c0-6.365 2.529-12.47 7.03-16.971L48 104 35.213 78.426C32.145 72.291 36.228 64 44.129 64H160c88.365 0 160 71.634 160 160v192H64v-30.979a48 48 0 0 1 25.227-42.254l61.546-33.171A47.998 47.998 0 0 0 176 267.343V200l-32.533 15.991a23.999 23.999 0 0 0-12.855 16.393l-9.414 42.888a12 12 0 0 1-6.143 8.052L96.052 293.3a12.001 12.001 0 0 1-10.452.341l-46.475-20.655A12.003 12.003 0 0 1 32 262.02V129.941zM56 148c0-11.046 8.954-20 20-20s20 8.954 20 20-8.954 20-20 20-20-8.954-20-20zm328 344v8c0 6.627-5.373 12-12 12H12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h360c6.627 0 12 5.373 12 12z"] };
var faChessKnightAlt = { prefix: 'fal', iconName: 'chess-knight-alt', icon: [320, 512, [], "f442", "M84 164.727c0 8.837-7.163 16-16 16s-16-7.163-16-16 7.163-16 16-16 16 7.164 16 16zm230.4 270.721a10.745 10.745 0 0 1 5.6 9.433l-.001 56.374c0 5.934-4.811 10.745-10.745 10.745H10.745C4.811 512 0 507.189 0 501.255v-56.374c0-3.932 2.148-7.55 5.6-9.433l26.4-14.4v-26.303C32 388.811 36.811 384 42.745 384L32 373.255v-14.917c0-18.83 7.433-36.708 20.173-49.957l-27.34-12.151C9.748 289.524 0 274.524 0 258.016V149.952c0-9.257 2.42-18.143 6.959-25.934C-8.808 92.492 14.539 64 41.924 64h83.167C215.131 64 288 136.992 288 226.909v146.346L277.255 384c5.934 0 10.745 4.811 10.745 10.745v26.303l26.4 14.4zM88 384h144l24-24V226.909C256 154.61 197.39 96 125.091 96H41.924a8.156 8.156 0 0 0-7.295 11.803l10.462 20.924-7.339 7.339A19.638 19.638 0 0 0 32 149.952v108.064a9.818 9.818 0 0 0 5.831 8.972l38.025 16.9a9.82 9.82 0 0 0 8.551-.279l15.547-8.162a9.82 9.82 0 0 0 5.026-6.588l7.703-35.09a19.633 19.633 0 0 1 10.518-13.412l26.618-13.083v55.414a40.001 40.001 0 0 1-20.048 34.669L84.049 323.67A39.996 39.996 0 0 0 64 358.338V360l24 24zm200 73.498l-32-17.454V416H64v24.044l-32 17.454V480h255.999l.001-22.502z"] };
var faChessPawn = { prefix: 'fal', iconName: 'chess-pawn', icon: [320, 512, [], "f443", "M280 448s-49.816-62.676-61.541-176H244c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-27.722c-.024-.728-.054-1.45-.076-2.182C240.308 220.378 256 192.027 256 160c0-53.019-42.981-96-96-96s-96 42.981-96 96c0 32.027 15.692 60.378 39.797 77.818-.021.732-.051 1.454-.076 2.182H76c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h25.541C89.816 385.324 40 448 40 448h240zM96 160c0-35.29 28.71-64 64-64s64 28.71 64 64-28.71 64-64 64-64-28.71-64-64zm38.992 96h50.017c4.442 69.962 22.801 123.985 39.608 160H95.384c16.807-36.015 35.165-90.038 39.608-160zM320 492v8c0 6.627-5.373 12-12 12H12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h296c6.627 0 12 5.373 12 12z"] };
var faChessPawnAlt = { prefix: 'fal', iconName: 'chess-pawn-alt', icon: [320, 512, [], "f444", "M288 421.048V396c0-6.627-5.373-12-12-12h-25.135c-10.427-27.343-20.958-64.825-22.691-120H252c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-18.751C249.838 214.143 260 190.238 260 164c0-55.141-44.859-100-100-100S60 108.859 60 164c0 26.238 10.162 50.143 26.751 68H68c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h23.824c-.943 31.67-5.367 73.804-22.726 120H44c-6.627 0-12 5.373-12 12v25.048L6.254 435.091A12 12 0 0 0 0 445.626V500c0 6.627 5.373 12 12 12h295.999c6.627 0 12-5.372 12-12l.001-54.374c0-4.391-2.399-8.432-6.254-10.535L288 421.048zM160 96c37.495 0 68 30.505 68 68s-30.505 68-68 68-68-30.505-68-68 30.505-68 68-68zm-36.157 168h72.284c.879 31.739 4.977 73.552 20.78 120H103.091c15.783-46.415 19.876-88.242 20.752-120zm164.156 216H32v-22.502l32-17.454V416h192v24.044l32 17.454-.001 22.502z"] };
var faChessQueen = { prefix: 'fal', iconName: 'chess-queen', icon: [512, 512, [], "f445", "M436 512H76c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h360c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12zM255.579 32c-13.234 0-24 10.766-24 24s10.766 24 24 24 24-10.766 24-24-10.766-24-24-24m0-32c30.928 0 56 25.072 56 56s-25.072 56-56 56-56-25.072-56-56 25.072-56 56-56zm81.579 160h-8.319c-4.533 9.593-24.68 49.231-72.839 49.231-48.147 0-68.317-39.664-72.839-49.231h-8.315c-1.485 21.883-7.446 69.206-62.846 69.206-26.644 0-46.348-15.694-61.685-37.576l-6.854 3.617L133.507 416h244.986l90.046-220.753-6.777-3.577c-9.187 13.212-29.262 37.536-61.762 37.536-55.422 0-61.374-47.614-62.842-69.206m19.161-32c6.494 0 11.812 5.172 11.995 11.664 1.062 37.738 2.973 57.542 31.686 57.542 21.318 0 35.449-22.285 44.065-37.802 3.161-5.693 10.305-7.82 16.082-4.77l39.357 20.773a12 12 0 0 1 5.51 15.145L400 448H112L6.986 190.552a12 12 0 0 1 5.51-15.145l39.179-20.679c6.482-3.421 13.147-.165 15.899 4.453 10.608 17.8 23.735 38.025 44.425 38.025 28.753 0 30.635-19.898 31.688-57.539.181-6.493 5.5-11.667 11.995-11.667h41.005c5.175 0 9.754 3.328 11.388 8.238 8.89 26.709 26.073 40.992 47.925 40.992s39.034-14.283 47.925-40.992c1.634-4.911 6.213-8.238 11.388-8.238h41.006z"] };
var faChessQueenAlt = { prefix: 'fal', iconName: 'chess-queen-alt', icon: [256, 512, [], "f446", "M232 422.398V396c0-6.627-5.373-12-12-12h-15.546c-16.434-50.736-14.528-105.417-14.528-144h27.111c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-20.024l49.895-122.696a6 6 0 0 0-2.743-7.559l-18.366-9.756c-2.895-1.538-6.48-.464-8.07 2.403-4.129 7.449-10.844 17.936-20.921 17.936-13.663 0-14.625-9.444-15.134-27.444a6.003 6.003 0 0 0-5.998-5.837H156.54c-2.588 0-4.871 1.669-5.693 4.124-4.263 12.74-12.448 19.551-22.845 19.551-10.397 0-18.582-6.811-22.845-19.551-.821-2.455-3.104-4.124-5.693-4.124H80.328a6.004 6.004 0 0 0-5.998 5.838c-.504 17.955-1.453 27.443-15.135 27.443-9.803 0-16.052-9.563-21.099-18.07a5.992 5.992 0 0 0-7.968-2.229L11.84 77.745a6 6 0 0 0-2.743 7.559L58.988 208H38.963c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h27.111c0 26.959 3.004 89.802-14.522 144H36c-6.627 0-12 5.373-12 12v26.398l-19.058 13.86A12.002 12.002 0 0 0 0 445.963V500c0 6.627 5.373 12 12 12h231.999c6.627 0 12-5.372 12-12l.001-54.037a12 12 0 0 0-4.942-9.705L232 422.398zM97.304 101.007c23.766 16.783 49.247 8.581 61.396 0 9.407 14.23 24.609 19.718 39.427 19.302L162.468 208H93.532l-35.657-87.691c12.016.34 28.837-3.283 39.429-19.302zM98.074 240h59.852c0 30.38-2.476 88.689 13.093 144h-86.04c15.791-56.236 13.095-115.178 13.095-144zm125.925 240H32v-23.853l24-17.454V416h144v22.693l24 17.454-.001 23.853zM155.821 28c0 15.464-12.536 28-28 28s-28-12.536-28-28 12.536-28 28-28 28 12.536 28 28z"] };
var faChessRook = { prefix: 'fal', iconName: 'chess-rook', icon: [384, 512, [], "f447", "M80 224c.186 36.96-.459 112.765-33.553 224h291.088C304.471 337.179 303.82 261.193 304 224l40.971-40.971A23.999 23.999 0 0 0 352 166.058V56c0-13.255-10.745-24-24-24H56c-13.255 0-24 10.745-24 24v110.059c0 6.365 2.529 12.47 7.029 16.971L80 224zM64 64h48v48h32V64h96v48h32V64h48v98.745l-47.936 47.936c-.198 40.901-1.155 106.337 23.531 205.319H88.364c24.711-99.192 23.775-164.448 23.569-205.321L64 162.745V64zm156 224h-56v-56c0-15.464 12.536-28 28-28s28 12.536 28 28v56zm164 204v8c0 6.627-5.373 12-12 12H12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h360c6.627 0 12 5.373 12 12z"] };
var faChessRookAlt = { prefix: 'fal', iconName: 'chess-rook-alt', icon: [320, 512, [], "f448", "M183.999 312h-47.998v-48.421c0-13.022 10.557-23.579 23.58-23.579h.839c13.023 0 23.58 10.557 23.58 23.579V312zm129.747 123.091A12.001 12.001 0 0 1 320 445.626L319.999 500c0 6.627-5.373 12-12 12H12c-6.627 0-12-5.373-12-12v-54.374c0-4.391 2.399-8.432 6.254-10.535L32 421.048V396c0-6.627 5.373-12 12-12h4.825c14.174-64.512 15.176-126.011 15.188-153.36L31.03 197.657A24.002 24.002 0 0 1 24 180.686V88c0-13.255 10.745-24 24-24h224c13.255 0 24 10.745 24 24v92.686a23.998 23.998 0 0 1-7.029 16.97l-32.982 32.983c.014 27.379 1.02 88.951 15.183 153.36H276c6.627 0 12 5.373 12 12v25.048l25.746 14.044zM81.549 384h156.898c-15.344-74.108-14.504-141.729-14.427-166.648l39.98-39.98V96h-40v48h-32V96h-64v48H96V96H56v81.372l39.979 39.979c.081 25.14.888 92.621-14.43 166.649zM288 457.498l-32-17.454V416H64v24.044l-32 17.454V480h255.999l.001-22.502z"] };
var faChevronCircleDown = { prefix: 'fal', iconName: 'chevron-circle-down', icon: [512, 512, [], "f13a", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm216 248c0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216zm-207.5 86.6l115-115.1c4.7-4.7 4.7-12.3 0-17l-7.1-7.1c-4.7-4.7-12.3-4.7-17 0L256 303l-99.5-99.5c-4.7-4.7-12.3-4.7-17 0l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17l115 115.1c4.8 4.6 12.4 4.6 17.1-.1z"] };
var faChevronCircleLeft = { prefix: 'fal', iconName: 'chevron-circle-left', icon: [512, 512, [], "f137", "M504 256C504 119 393 8 256 8S8 119 8 256s111 248 248 248 248-111 248-248zM256 472c-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216zm-86.6-224.5l115.1-115c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L209 256l99.5 99.5c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0l-115.1-115c-4.6-4.8-4.6-12.4.1-17.1z"] };
var faChevronCircleRight = { prefix: 'fal', iconName: 'chevron-circle-right', icon: [512, 512, [], "f138", "M8 256c0 137 111 248 248 248s248-111 248-248S393 8 256 8 8 119 8 256zM256 40c118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216zm86.6 224.5l-115.1 115c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17L303 256l-99.5-99.5c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0l115.1 115c4.6 4.8 4.6 12.4-.1 17.1z"] };
var faChevronCircleUp = { prefix: 'fal', iconName: 'chevron-circle-up', icon: [512, 512, [], "f139", "M256 504c137 0 248-111 248-248S393 8 256 8 8 119 8 256s111 248 248 248zM40 256c0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216zm224.5-86.6l115 115.1c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0L256 209l-99.5 99.5c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17l115-115.1c4.8-4.6 12.4-4.6 17.1.1z"] };
var faChevronDoubleDown = { prefix: 'fal', iconName: 'chevron-double-down', icon: [448, 512, [], "f322", "M443.5 98.5l-211 211.1c-4.7 4.7-12.3 4.7-17 0L4.5 98.5c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0L224 269.9 419.5 74.5c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.6 4.6 4.6 12.2-.1 16.9zm0 111l-7.1-7.1c-4.7-4.7-12.3-4.7-17 0L224 397.9 28.5 202.5c-4.7-4.7-12.3-4.7-17 0l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17l211 211.1c4.7 4.7 12.3 4.7 17 0l211-211.1c4.8-4.8 4.8-12.4.1-17.1z"] };
var faChevronDoubleLeft = { prefix: 'fal', iconName: 'chevron-double-left', icon: [384, 512, [], "f323", "M349.5 475.5l-211.1-211c-4.7-4.7-4.7-12.3 0-17l211.1-211c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L178.1 256l195.5 195.5c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.6-12.3 4.6-17-.1zm-111 0l7.1-7.1c4.7-4.7 4.7-12.3 0-17L50.1 256 245.5 60.5c4.7-4.7 4.7-12.3 0-17l-7.1-7.1c-4.7-4.7-12.3-4.7-17 0l-211.1 211c-4.7 4.7-4.7 12.3 0 17l211.1 211c4.8 4.8 12.4 4.8 17.1.1z"] };
var faChevronDoubleRight = { prefix: 'fal', iconName: 'chevron-double-right', icon: [384, 512, [], "f324", "M34.5 36.5l211.1 211c4.7 4.7 4.7 12.3 0 17l-211.1 211c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17L205.9 256 10.5 60.5c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.6-4.6 12.2-4.6 16.9.1zm111 0l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17L333.9 256 138.5 451.5c-4.7 4.7-4.7 12.3 0 17l7.1 7.1c4.7 4.7 12.3 4.7 17 0l211.1-211c4.7-4.7 4.7-12.3 0-17l-211.1-211c-4.8-4.8-12.4-4.8-17.1-.1z"] };
var faChevronDoubleUp = { prefix: 'fal', iconName: 'chevron-double-up', icon: [448, 512, [], "f325", "M4.5 413.5l211-211.1c4.7-4.7 12.3-4.7 17 0l211 211.1c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0L224 242.1 28.5 437.5c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.6-4.6-4.6-12.2.1-16.9zm0-111l7.1 7.1c4.7 4.7 12.3 4.7 17 0L224 114.1l195.5 195.5c4.7 4.7 12.3 4.7 17 0l7.1-7.1c4.7-4.7 4.7-12.3 0-17l-211-211.1c-4.7-4.7-12.3-4.7-17 0L4.5 285.5c-4.7 4.7-4.7 12.3 0 17z"] };
var faChevronDown = { prefix: 'fal', iconName: 'chevron-down', icon: [448, 512, [], "f078", "M443.5 162.6l-7.1-7.1c-4.7-4.7-12.3-4.7-17 0L224 351 28.5 155.5c-4.7-4.7-12.3-4.7-17 0l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17l211 211.1c4.7 4.7 12.3 4.7 17 0l211-211.1c4.8-4.7 4.8-12.3.1-17z"] };
var faChevronLeft = { prefix: 'fal', iconName: 'chevron-left', icon: [256, 512, [], "f053", "M238.475 475.535l7.071-7.07c4.686-4.686 4.686-12.284 0-16.971L50.053 256 245.546 60.506c4.686-4.686 4.686-12.284 0-16.971l-7.071-7.07c-4.686-4.686-12.284-4.686-16.97 0L10.454 247.515c-4.686 4.686-4.686 12.284 0 16.971l211.051 211.05c4.686 4.686 12.284 4.686 16.97-.001z"] };
var faChevronRight = { prefix: 'fal', iconName: 'chevron-right', icon: [256, 512, [], "f054", "M17.525 36.465l-7.071 7.07c-4.686 4.686-4.686 12.284 0 16.971L205.947 256 10.454 451.494c-4.686 4.686-4.686 12.284 0 16.971l7.071 7.07c4.686 4.686 12.284 4.686 16.97 0l211.051-211.05c4.686-4.686 4.686-12.284 0-16.971L34.495 36.465c-4.686-4.687-12.284-4.687-16.97 0z"] };
var faChevronSquareDown = { prefix: 'fal', iconName: 'chevron-square-down', icon: [448, 512, [], "f329", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352zm-200.5-96.4l-115-115.1c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0L224 296l99.5-99.5c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17l-115 115.1c-4.8 4.5-12.4 4.5-17.1-.1z"] };
var faChevronSquareLeft = { prefix: 'fal', iconName: 'chevron-square-left', icon: [448, 512, [], "f32a", "M448 432V80c0-26.5-21.5-48-48-48H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48zM48 448c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48zm96.4-200.5l115.1-115c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L184 256l99.5 99.5c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0l-115.1-115c-4.5-4.8-4.5-12.4.1-17.1z"] };
var faChevronSquareRight = { prefix: 'fal', iconName: 'chevron-square-right', icon: [448, 512, [], "f32b", "M0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48H48C21.5 32 0 53.5 0 80zm400-16c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352zm-96.4 200.5l-115.1 115c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17L264 256l-99.5-99.5c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0l115.1 115c4.5 4.8 4.5 12.4-.1 17.1z"] };
var faChevronSquareUp = { prefix: 'fal', iconName: 'chevron-square-up', icon: [448, 512, [], "f32c", "M48 480h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48zM32 80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80zm200.5 96.4l115 115.1c4.7 4.7 4.7 12.3 0 17l-7.1 7.1c-4.7 4.7-12.3 4.7-17 0L224 216l-99.5 99.5c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17l115-115.1c4.8-4.5 12.4-4.5 17.1.1z"] };
var faChevronUp = { prefix: 'fal', iconName: 'chevron-up', icon: [448, 512, [], "f077", "M4.465 366.475l7.07 7.071c4.686 4.686 12.284 4.686 16.971 0L224 178.053l195.494 195.493c4.686 4.686 12.284 4.686 16.971 0l7.07-7.071c4.686-4.686 4.686-12.284 0-16.97l-211.05-211.051c-4.686-4.686-12.284-4.686-16.971 0L4.465 349.505c-4.687 4.686-4.687 12.284 0 16.97z"] };
var faChild = { prefix: 'fal', iconName: 'child', icon: [448, 512, [], "f1ae", "M413.287 90.746c-23.71-23.707-63.332-27.212-93.318 2.776C318.651 41.725 276.107 0 224 0c-52.104 0-94.647 41.729-95.969 93.521-30.087-30.087-69.711-26.379-93.316-2.778-24.954 24.956-24.954 65.558-.002 90.511L112 258.511V456c0 30.879 25.122 56 56 56h16c15.654 0 29.828-6.456 40-16.846C234.172 505.544 248.346 512 264 512h16c30.878 0 56-25.121 56-56V258.511l77.286-77.256c24.952-24.954 24.952-65.556.001-90.509zM224 32c35.346 0 64 28.654 64 64s-28.654 64-64 64-64-28.654-64-64 28.654-64 64-64zm166.628 126.628L304 245.256V456c0 13.255-10.745 24-24 24h-16c-13.255 0-24-10.745-24-24V344h-32v112c0 13.255-10.745 24-24 24h-16c-13.255 0-24-10.745-24-24V245.256l-86.628-86.628c-12.496-12.497-12.496-32.759 0-45.256 12.498-12.496 32.757-12.497 45.256 0L181.256 192h85.488l78.628-78.628c12.498-12.496 32.757-12.497 45.256 0 12.496 12.497 12.496 32.759 0 45.256z"] };
var faCircle = { prefix: 'fal', iconName: 'circle', icon: [512, 512, [], "f111", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm216 248c0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216z"] };
var faCircleNotch = { prefix: 'fal', iconName: 'circle-notch', icon: [512, 512, [], "f1ce", "M288 24.103v8.169a11.995 11.995 0 0 0 9.698 11.768C396.638 63.425 472 150.461 472 256c0 118.663-96.055 216-216 216-118.663 0-216-96.055-216-216 0-104.534 74.546-192.509 174.297-211.978A11.993 11.993 0 0 0 224 32.253v-8.147c0-7.523-6.845-13.193-14.237-11.798C94.472 34.048 7.364 135.575 8.004 257.332c.72 137.052 111.477 246.956 248.531 246.667C393.255 503.711 504 392.789 504 256c0-121.187-86.924-222.067-201.824-243.704C294.807 10.908 288 16.604 288 24.103z"] };
var faClipboard = { prefix: 'fal', iconName: 'clipboard', icon: [384, 512, [], "f328", "M336 64h-88.581c.375-2.614.581-5.283.581-8 0-30.879-25.122-56-56-56s-56 25.121-56 56c0 2.717.205 5.386.581 8H48C21.49 64 0 85.49 0 112v352c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V112c0-8.822 7.178-16 16-16h48v20c0 6.627 5.373 12 12 12h168c6.627 0 12-5.373 12-12V96h48c8.822 0 16 7.178 16 16v352zM192 32c13.255 0 24 10.745 24 24s-10.745 24-24 24-24-10.745-24-24 10.745-24 24-24"] };
var faClock = { prefix: 'fal', iconName: 'clock', icon: [512, 512, [], "f017", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm216 248c0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216zm-148.9 88.3l-81.2-59c-3.1-2.3-4.9-5.9-4.9-9.7V116c0-6.6 5.4-12 12-12h14c6.6 0 12 5.4 12 12v146.3l70.5 51.3c5.4 3.9 6.5 11.4 2.6 16.8l-8.2 11.3c-3.9 5.3-11.4 6.5-16.8 2.6z"] };
var faClone = { prefix: 'fal', iconName: 'clone', icon: [512, 512, [], "f24d", "M464 0H144c-26.51 0-48 21.49-48 48v48H48c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h320c26.51 0 48-21.49 48-48v-48h48c26.51 0 48-21.49 48-48V48c0-26.51-21.49-48-48-48zm-80 464c0 8.82-7.18 16-16 16H48c-8.82 0-16-7.18-16-16V144c0-8.82 7.18-16 16-16h48v240c0 26.51 21.49 48 48 48h240v48zm96-96c0 8.82-7.18 16-16 16H144c-8.82 0-16-7.18-16-16V48c0-8.82 7.18-16 16-16h320c8.82 0 16 7.18 16 16v320z"] };
var faClosedCaptioning = { prefix: 'fal', iconName: 'closed-captioning', icon: [512, 512, [], "f20a", "M246.2 188.5l-9.8 15.2c-2 3-5.7 3.7-8.6 1.5-40.7-31.2-113-14.3-113 48.5 0 64.8 70.1 85.3 111.6 47.6 2.7-2.4 6.8-1.9 9 1l10.7 14.6c1.8 2.4 1.5 5.8-.6 7.9-49.2 50-165.5 29.4-165.5-70.6 0-96.3 118.3-117.1 165.2-73.5 2.2 2.1 2.6 5.4 1 7.8zM464 64H48C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zm16 336c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16h416c8.8 0 16 7.2 16 16v288zm-49-211.5l-9.8 15.2c-2 3-5.7 3.7-8.6 1.5-40.7-31.2-113-14.3-113 48.5 0 64.8 70.1 85.3 111.6 47.6 2.7-2.4 6.8-1.9 9 1l10.7 14.6c1.8 2.4 1.5 5.8-.6 7.9-49.1 50.1-165.4 29.5-165.4-70.5 0-96.3 118.3-117.1 165.2-73.5 2.1 2 2.5 5.3.9 7.7z"] };
var faCloud = { prefix: 'fal', iconName: 'cloud', icon: [640, 512, [], "f0c2", "M272 64c60.28 0 111.899 37.044 133.36 89.604C419.97 137.862 440.829 128 464 128c44.183 0 80 35.817 80 80 0 18.55-6.331 35.612-16.927 49.181C572.931 264.413 608 304.109 608 352c0 53.019-42.981 96-96 96H144c-61.856 0-112-50.144-112-112 0-56.77 42.24-103.669 97.004-110.998A145.47 145.47 0 0 1 128 208c0-79.529 64.471-144 144-144m0-32c-94.444 0-171.749 74.49-175.83 168.157C39.171 220.236 0 274.272 0 336c0 79.583 64.404 144 144 144h368c70.74 0 128-57.249 128-128 0-46.976-25.815-90.781-68.262-113.208C574.558 228.898 576 218.571 576 208c0-61.898-50.092-112-112-112-16.734 0-32.898 3.631-47.981 10.785C384.386 61.786 331.688 32 272 32z"] };
var faCloudDownload = { prefix: 'fal', iconName: 'cloud-download', icon: [640, 512, [], "f0ed", "M272 64c60.28 0 111.899 37.044 133.36 89.604C419.97 137.862 440.829 128 464 128c44.183 0 80 35.817 80 80 0 18.55-6.331 35.612-16.927 49.181C572.931 264.413 608 304.109 608 352c0 53.019-42.981 96-96 96H144c-61.856 0-112-50.144-112-112 0-56.77 42.24-103.669 97.004-110.998A145.47 145.47 0 0 1 128 208c0-79.529 64.471-144 144-144m0-32c-94.444 0-171.749 74.49-175.83 168.157C39.171 220.236 0 274.272 0 336c0 79.583 64.404 144 144 144h368c70.74 0 128-57.249 128-128 0-46.976-25.815-90.781-68.262-113.208C574.558 228.898 576 218.571 576 208c0-61.898-50.092-112-112-112-16.734 0-32.898 3.631-47.981 10.785C384.386 61.786 331.688 32 272 32zm16 140v150.745l-68.201-68.2c-4.686-4.686-12.284-4.686-16.97 0l-5.657 5.657c-4.687 4.686-4.687 12.284 0 16.971l98.343 98.343c4.686 4.686 12.284 4.686 16.971 0l98.343-98.343c4.686-4.686 4.686-12.285 0-16.971l-5.657-5.657c-4.686-4.686-12.284-4.686-16.97 0L320 322.745V172c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12z"] };
var faCloudDownloadAlt = { prefix: 'fal', iconName: 'cloud-download-alt', icon: [640, 512, [], "f381", "M272 64c60.28 0 111.899 37.044 133.36 89.604C419.97 137.862 440.829 128 464 128c44.183 0 80 35.817 80 80 0 18.55-6.331 35.612-16.927 49.181C572.931 264.413 608 304.109 608 352c0 53.019-42.981 96-96 96H144c-61.856 0-112-50.144-112-112 0-56.77 42.24-103.669 97.004-110.998A145.47 145.47 0 0 1 128 208c0-79.529 64.471-144 144-144m0-32c-94.444 0-171.749 74.49-175.83 168.157C39.171 220.236 0 274.272 0 336c0 79.583 64.404 144 144 144h368c70.74 0 128-57.249 128-128 0-46.976-25.815-90.781-68.262-113.208C574.558 228.898 576 218.571 576 208c0-61.898-50.092-112-112-112-16.734 0-32.898 3.631-47.981 10.785C384.386 61.786 331.688 32 272 32zm16 132v84h-63.968c-29.239 0-43.177 36.192-21.407 55.785l79.968 72c12.169 10.952 30.644 10.953 42.814 0l79.974-72c21.733-19.56 7.882-55.785-21.407-55.785H320v-84c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12zm96 116l-80 72-80-72h160z"] };
var faCloudUpload = { prefix: 'fal', iconName: 'cloud-upload', icon: [640, 512, [], "f0ee", "M272 64c60.28 0 111.899 37.044 133.36 89.604C419.97 137.862 440.829 128 464 128c44.183 0 80 35.817 80 80 0 18.55-6.331 35.612-16.927 49.181C572.931 264.413 608 304.109 608 352c0 53.019-42.981 96-96 96H144c-61.856 0-112-50.144-112-112 0-56.77 42.24-103.669 97.004-110.998A145.47 145.47 0 0 1 128 208c0-79.529 64.471-144 144-144m0-32c-94.444 0-171.749 74.49-175.83 168.157C39.171 220.236 0 274.272 0 336c0 79.583 64.404 144 144 144h368c70.74 0 128-57.249 128-128 0-46.976-25.815-90.781-68.262-113.208C574.558 228.898 576 218.571 576 208c0-61.898-50.092-112-112-112-16.734 0-32.898 3.631-47.981 10.785C384.386 61.786 331.688 32 272 32zm48 340V221.255l68.201 68.2c4.686 4.686 12.284 4.686 16.97 0l5.657-5.657c4.687-4.686 4.687-12.284 0-16.971l-98.343-98.343c-4.686-4.686-12.284-4.686-16.971 0l-98.343 98.343c-4.686 4.686-4.686 12.285 0 16.971l5.657 5.657c4.686 4.686 12.284 4.686 16.97 0l68.201-68.2V372c0 6.627 5.373 12 12 12h8c6.628 0 12.001-5.373 12.001-12z"] };
var faCloudUploadAlt = { prefix: 'fal', iconName: 'cloud-upload-alt', icon: [640, 512, [], "f382", "M272 64c60.28 0 111.899 37.044 133.36 89.604C419.97 137.862 440.829 128 464 128c44.183 0 80 35.817 80 80 0 18.55-6.331 35.612-16.927 49.181C572.931 264.413 608 304.109 608 352c0 53.019-42.981 96-96 96H144c-61.856 0-112-50.144-112-112 0-56.77 42.24-103.669 97.004-110.998A145.47 145.47 0 0 1 128 208c0-79.529 64.471-144 144-144m0-32c-94.444 0-171.749 74.49-175.83 168.157C39.171 220.236 0 274.272 0 336c0 79.583 64.404 144 144 144h368c70.74 0 128-57.249 128-128 0-46.976-25.815-90.781-68.262-113.208C574.558 228.898 576 218.571 576 208c0-61.898-50.092-112-112-112-16.734 0-32.898 3.631-47.981 10.785C384.386 61.786 331.688 32 272 32zm48 340v-84h63.968c29.239 0 43.177-36.192 21.407-55.785l-79.968-72c-12.169-10.952-30.644-10.953-42.814 0l-79.974 72C180.886 251.774 194.738 288 224.026 288H288v84c0 6.627 5.373 12 12 12h8c6.627 0 12-5.373 12-12zm-96-116l80-72 80 72H224z"] };
var faClub = { prefix: 'fal', iconName: 'club', icon: [512, 512, [], "f327", "M256 32c64.9 0 109.1 65.6 85.7 125.4l-16 41c-1.7 4.3 1.9 8.7 6.4 8.1l43.7-5.8c55.4-7.3 103.8 35.7 104.2 90.5.4 51.7-42.8 93.2-94.5 92.7-41-.4-54.6-11.3-87.2-45.2-3.7-3.9-10.3-1.2-10.3 4.2v25c0 40.6 0 52.6 29.1 89.3 7.3 9.2.7 22.7-11 22.7H205.8c-11.7 0-18.3-13.5-11-22.7C224 420.6 224 408.6 224 368v-25c0-5.4-6.6-8.1-10.3-4.2-32.3 33.7-45.9 44.7-87.1 45.2-51.8.5-95-41.1-94.5-92.8.5-54.8 49-97.7 104.2-90.3l43.7 5.8c4.5.6 8-3.9 6.4-8.1l-16-41C146.8 97.5 191.2 32 256 32m0-32c-87.4 0-147.1 88.2-115.5 169.1C65.6 159.2 0 217.6 0 292c0 68.4 55.6 124 124 124 35.5 0 52-8 76-32 0 24-9.7 27.6-30.2 53.4-23.9 30.1-2.4 74.6 36 74.6h100.3c38.5 0 60-44.5 36-74.6-19-24.1-30.1-29.4-30.1-53.4 24 24 48.9 32 76 32 68.4 0 124-55.6 124-124 0-74.5-65.8-132.8-140.5-122.9C403.1 88.4 343.5 0 256 0z"] };
var faCode = { prefix: 'fal', iconName: 'code', icon: [576, 512, [], "f121", "M228.5 511.8l-25-7.1c-3.2-.9-5-4.2-4.1-7.4L340.1 4.4c.9-3.2 4.2-5 7.4-4.1l25 7.1c3.2.9 5 4.2 4.1 7.4L235.9 507.6c-.9 3.2-4.3 5.1-7.4 4.2zm-75.6-125.3l18.5-20.9c1.9-2.1 1.6-5.3-.5-7.1L49.9 256l121-102.5c2.1-1.8 2.4-5 .5-7.1l-18.5-20.9c-1.8-2.1-5-2.3-7.1-.4L1.7 252.3c-2.3 2-2.3 5.5 0 7.5L145.8 387c2.1 1.8 5.3 1.6 7.1-.5zm277.3.4l144.1-127.2c2.3-2 2.3-5.5 0-7.5L430.2 125.1c-2.1-1.8-5.2-1.6-7.1.4l-18.5 20.9c-1.9 2.1-1.6 5.3.5 7.1l121 102.5-121 102.5c-2.1 1.8-2.4 5-.5 7.1l18.5 20.9c1.8 2.1 5 2.3 7.1.4z"] };
var faCodeBranch = { prefix: 'fal', iconName: 'code-branch', icon: [384, 512, [], "f126", "M384 144c0-44.2-35.8-80-80-80s-80 35.8-80 80c0 39.2 28.2 71.8 65.5 78.7-.8 17.2-5 30.4-12.7 40-17.5 21.8-53.1 25.2-90.7 28.7-28.2 2.6-57.4 5.4-80.4 16.9-3.4 1.7-6.7 3.6-9.7 5.7V158.4c36.5-7.4 64-39.7 64-78.4 0-44.2-35.8-80-80-80S0 35.8 0 80c0 38.7 27.5 71 64 78.4v195.2C27.5 361 0 393.3 0 432c0 44.2 35.8 80 80 80s80-35.8 80-80c0-36.9-24.9-67.9-58.9-77.2 5-9.6 12.3-14.6 19-18 17.5-8.8 42.5-11.2 68.9-13.7 42.6-4 86.7-8.1 112.7-40.5 12.4-15.5 19-35.5 19.8-60.7C357.3 214 384 182.1 384 144zM32 80c0-26.5 21.5-48 48-48s48 21.5 48 48-21.5 48-48 48-48-21.5-48-48zm96 352c0 26.5-21.5 48-48 48s-48-21.5-48-48c0-26.4 21.4-47.9 47.8-48h.6c26.3.2 47.6 21.7 47.6 48zm187.8-241.5L304 192c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48c0 22.4-15.4 41.2-36.2 46.5z"] };
var faCodeCommit = { prefix: 'fal', iconName: 'code-commit', icon: [640, 512, [], "f386", "M128 256c0 10.8.9 21.5 2.6 32H12c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h118.6c-1.7 10.5-2.6 21.2-2.6 32zm500-32H509.4c1.8 10.5 2.6 21.2 2.6 32s-.9 21.5-2.6 32H628c6.6 0 12-5.4 12-12v-40c0-6.6-5.4-12-12-12zm-308-80c-29.9 0-58 11.7-79.2 32.8C219.6 198 208 226.1 208 256s11.6 58 32.8 79.2C262 356.3 290.1 368 320 368s58-11.7 79.2-32.8C420.4 314 432 285.9 432 256s-11.6-58-32.8-79.2C378 155.7 349.9 144 320 144m0-48c88.4 0 160 71.6 160 160s-71.6 160-160 160-160-71.6-160-160S231.6 96 320 96z"] };
var faCodeMerge = { prefix: 'fal', iconName: 'code-merge', icon: [384, 512, [], "f387", "M304 192c-41.7 0-76 32-79.7 72.8-25.2-1.3-61.6-7.9-88.8-31.7-20.3-17.8-32.8-43-37.5-75.1 35.5-8.2 62-40 62-77.9 0-44.2-35.8-80-80-80S0 35.8 0 80c0 38.7 27.5 71 64 78.4v195.2C27.5 361 0 393.3 0 432c0 44.2 35.8 80 80 80s80-35.8 80-80c0-38.7-27.5-71-64-78.4V237.4c5.5 7.2 11.7 13.9 18.6 19.9C151 289 197.9 296.1 228 297c10.5 31.9 40.5 55 76 55 44.2 0 80-35.8 80-80s-35.8-80-80-80zM32 80c0-26.5 21.5-48 48-48s48 21.5 48 48-21.5 48-48 48-48-21.5-48-48zm96 352c0 26.5-21.5 48-48 48s-48-21.5-48-48 21.5-48 48-48 48 21.5 48 48zm176-112c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z"] };
var faCoffee = { prefix: 'fal', iconName: 'coffee', icon: [576, 512, [], "f0f4", "M517.9 448H26.1c-24.5 0-33.1-32-20-32h531.8c13.1 0 4.5 32-20 32zM576 159.1c.5 53.4-42.7 96.9-96 96.9h-32v32c0 53-43 96-96 96H160c-53 0-96-43-96-96V76c0-6.6 5.4-12 12-12h402.8c52.8 0 96.7 42.2 97.2 95.1zM416 96H96v192c0 35.3 28.7 64 64 64h192c35.3 0 64-28.7 64-64V96zm128 64c0-35.3-28.7-64-64-64h-32v128h32c35.3 0 64-28.7 64-64z"] };
var faCog = { prefix: 'fal', iconName: 'cog', icon: [512, 512, [], "f013", "M482.696 299.276l-32.61-18.827a195.168 195.168 0 0 0 0-48.899l32.61-18.827c9.576-5.528 14.195-16.902 11.046-27.501-11.214-37.749-31.175-71.728-57.535-99.595-7.634-8.07-19.817-9.836-29.437-4.282l-32.562 18.798a194.125 194.125 0 0 0-42.339-24.48V38.049c0-11.13-7.652-20.804-18.484-23.367-37.644-8.909-77.118-8.91-114.77 0-10.831 2.563-18.484 12.236-18.484 23.367v37.614a194.101 194.101 0 0 0-42.339 24.48L105.23 81.345c-9.621-5.554-21.804-3.788-29.437 4.282-26.36 27.867-46.321 61.847-57.535 99.595-3.149 10.599 1.47 21.972 11.046 27.501l32.61 18.827a195.168 195.168 0 0 0 0 48.899l-32.61 18.827c-9.576 5.528-14.195 16.902-11.046 27.501 11.214 37.748 31.175 71.728 57.535 99.595 7.634 8.07 19.817 9.836 29.437 4.283l32.562-18.798a194.08 194.08 0 0 0 42.339 24.479v37.614c0 11.13 7.652 20.804 18.484 23.367 37.645 8.909 77.118 8.91 114.77 0 10.831-2.563 18.484-12.236 18.484-23.367v-37.614a194.138 194.138 0 0 0 42.339-24.479l32.562 18.798c9.62 5.554 21.803 3.788 29.437-4.283 26.36-27.867 46.321-61.847 57.535-99.595 3.149-10.599-1.47-21.972-11.046-27.501zm-65.479 100.461l-46.309-26.74c-26.988 23.071-36.559 28.876-71.039 41.059v53.479a217.145 217.145 0 0 1-87.738 0v-53.479c-33.621-11.879-43.355-17.395-71.039-41.059l-46.309 26.74c-19.71-22.09-34.689-47.989-43.929-75.958l46.329-26.74c-6.535-35.417-6.538-46.644 0-82.079l-46.329-26.74c9.24-27.969 24.22-53.869 43.929-75.969l46.309 26.76c27.377-23.434 37.063-29.065 71.039-41.069V44.464a216.79 216.79 0 0 1 87.738 0v53.479c33.978 12.005 43.665 17.637 71.039 41.069l46.309-26.76c19.709 22.099 34.689 47.999 43.929 75.969l-46.329 26.74c6.536 35.426 6.538 46.644 0 82.079l46.329 26.74c-9.24 27.968-24.219 53.868-43.929 75.957zM256 160c-52.935 0-96 43.065-96 96s43.065 96 96 96 96-43.065 96-96-43.065-96-96-96zm0 160c-35.29 0-64-28.71-64-64s28.71-64 64-64 64 28.71 64 64-28.71 64-64 64z"] };
var faCogs = { prefix: 'fal', iconName: 'cogs', icon: [640, 512, [], "f085", "M538.6 196.4l-2.5-3.9c-4.1.3-8.1.3-12.2 0l-2.5 4c-5.8 9.2-17.1 13.4-27.5 10.1-13.8-4.3-23-8.8-34.3-18.1-9-7.4-11.2-20.3-5.4-30.4l2.5-4.3c-2.3-3.4-4.3-6.9-6.1-10.6h-9.1c-11.6 0-21.4-8.2-23.6-19.6-2.6-13.7-2.7-24.2.1-38.5 2.1-11.3 12.1-19.5 23.6-19.5h9c1.8-3.7 3.8-7.2 6.1-10.6l-2.6-4.5c-5.8-10-3.6-22.7 5.2-30.3 10.6-9.1 19.7-14.3 33.5-19 10.8-3.7 22.7.7 28.5 10.6l2.6 4.4c4.1-.3 8.1-.3 12.2 0l2.6-4.4c5.8-9.9 17.7-14.3 28.6-10.5 13.3 4.5 22.3 9.6 33.5 19.1 8.8 7.5 10.9 20.2 5.1 30.2l-2.6 4.4c2.3 3.4 4.3 6.9 6.1 10.6h5.1c11.6 0 21.4 8.2 23.6 19.6 2.6 13.7 2.7 24.2-.1 38.5-2.1 11.3-12.1 19.5-23.6 19.5h-5c-1.8 3.7-3.8 7.2-6.1 10.6l2.5 4.3c5.9 10.2 3.5 23.1-5.5 30.5-10.7 8.8-19.9 13.4-34 17.9-10.5 3.3-21.9-.8-27.7-10.1zm12.2-34.5l10.6 18.3c6.7-2.8 12.9-6.4 18.7-10.8l-10.6-18.3 6.4-7.5c4.8-5.7 8.6-12.1 11-19.1l3.3-9.3h21.1c.9-7.1.9-14.4 0-21.5h-21.1l-3.3-9.3c-2.5-7-6.2-13.4-11-19.1l-6.4-7.5L580 39.4c-5.7-4.4-12-8-18.7-10.8l-10.6 18.3-9.7-1.8c-7.3-1.4-14.8-1.4-22.1 0l-9.7 1.8-10.6-18.3C492 31.3 485.7 35 480 39.4l10.6 18.3-6.4 7.5c-4.8 5.7-8.6 12.1-11 19.1l-3.3 9.3h-21.1c-.9 7.1-.9 14.4 0 21.5h21.1l3.3 9.3c2.5 7 6.2 13.4 11 19.1l6.4 7.5-10.6 18.4c5.7 4.4 12 8 18.7 10.8l10.6-18.3 9.7 1.8c7.3 1.4 14.8 1.4 22.1 0l9.7-1.8zM145.3 454.4v-31.6c-12.9-5.5-25.1-12.6-36.4-21.1l-27.5 15.9c-9.8 5.6-22.1 3.7-29.7-4.6-24.2-26.3-38.5-49.5-50.6-88.1-3.4-10.7 1.1-22.3 10.8-28L39.2 281c-1.7-14-1.7-28.1 0-42.1l-27.3-15.8c-9.7-5.6-14.2-17.3-10.8-28 12.1-38.4 26.2-61.6 50.6-88.1 7.6-8.3 20-10.2 29.7-4.6l27.4 15.9c11.3-8.5 23.5-15.5 36.4-21.1V65.6c0-11.3 7.8-21 18.8-23.4 34.7-7.8 62-8.7 101.7 0 11 2.4 18.9 12.2 18.9 23.4v31.6c12.9 5.5 25.1 12.6 36.4 21l27.4-15.8c9.8-5.6 22.2-3.7 29.8 4.6 26.9 29.6 41.5 55.9 52.1 88.5 3.4 10.5-.8 21.9-10.2 27.7l-25 15.8c1.7 14 1.7 28.1 0 42.1l28.1 17.5c8.6 5.4 13 15.6 10.8 25.5-6.9 31.3-33 64.6-55.9 89.2-7.6 8.2-19.9 10-29.6 4.4L321 401.8c-11.3 8.5-23.5 15.5-36.4 21.1v31.6c0 11.2-7.8 21-18.8 23.4-37.5 8.3-64.9 8.2-101.9 0-10.8-2.5-18.6-12.3-18.6-23.5zm32-6.2c24.8 5 50.5 5 75.3 0v-47.7l10.7-3.8c16.8-5.9 32.3-14.9 45.9-26.5l8.6-7.4 41.4 23.9c16.8-19.1 34-41.3 42.1-65.2l-41.4-23.9 2.1-11.1c3.2-17.6 3.2-35.5 0-53.1l-2.1-11.1 41.4-23.9c-8.1-23.9-25.3-46.2-42.1-65.2l-41.4 23.9-8.6-7.4c-13.6-11.7-29-20.6-45.9-26.5l-10.7-3.8V71.8c-24.8-5-50.5-5-75.3 0v47.7l-10.7 3.8c-16.8 5.9-32.3 14.9-45.9 26.5l-8.6 7.4-41.4-23.9A192.19 192.19 0 0 0 33 198.5l41.4 23.9-2.1 11.1c-3.2 17.6-3.2 35.5 0 53.1l2.1 11.1L33 321.6c8.1 23.9 20.9 46.2 37.7 65.2l41.4-23.9 8.6 7.4c13.6 11.7 29 20.6 45.9 26.5l10.7 3.8v47.6zm38.4-105.3c-45.7 0-82.9-37.2-82.9-82.9s37.2-82.9 82.9-82.9 82.9 37.2 82.9 82.9-37.2 82.9-82.9 82.9zm0-133.8c-28 0-50.9 22.8-50.9 50.9s22.8 50.9 50.9 50.9c28 0 50.9-22.8 50.9-50.9s-22.8-50.9-50.9-50.9zm322.9 291.7l-2.5-3.9c-4.1.3-8.1.3-12.2 0l-2.5 4c-5.8 9.2-17.1 13.4-27.5 10.1-13.8-4.3-23-8.8-34.3-18.1-9-7.4-11.2-20.3-5.4-30.4l2.5-4.3c-2.3-3.4-4.3-6.9-6.1-10.6h-9.1c-11.6 0-21.4-8.2-23.6-19.6-2.6-13.7-2.7-24.2.1-38.5 2.1-11.3 12.1-19.5 23.6-19.5h9c1.8-3.7 3.8-7.2 6.1-10.6l-2.6-4.5c-5.8-10-3.6-22.7 5.2-30.3 10.6-9.1 19.7-14.3 33.5-19 10.8-3.7 22.7.7 28.5 10.6l2.6 4.4c4.1-.3 8.1-.3 12.2 0l2.6-4.4c5.8-9.9 17.7-14.3 28.6-10.5 13.3 4.5 22.3 9.6 33.5 19.1 8.8 7.5 10.9 20.2 5.1 30.2l-2.6 4.4c2.3 3.4 4.3 6.9 6.1 10.6h5.1c11.6 0 21.4 8.2 23.6 19.6 2.6 13.7 2.7 24.2-.1 38.5-2.1 11.3-12.1 19.5-23.6 19.5h-5c-1.8 3.7-3.8 7.2-6.1 10.6l2.5 4.3c5.9 10.2 3.5 23.1-5.5 30.5-10.7 8.8-19.9 13.4-34 17.9-10.5 3.2-21.9-.9-27.7-10.1zm12.2-34.6l10.6 18.3c6.7-2.8 12.9-6.4 18.7-10.8l-10.6-18.3 6.4-7.5c4.8-5.7 8.6-12.1 11-19.1l3.3-9.3h21.1c.9-7.1.9-14.4 0-21.5h-21.1l-3.3-9.3c-2.5-7-6.2-13.4-11-19.1l-6.4-7.5 10.6-18.3c-5.7-4.4-12-8-18.7-10.8l-10.6 18.3-9.7-1.8c-7.3-1.4-14.8-1.4-22.1 0l-9.7 1.8-10.6-18.3c-6.7 2.8-12.9 6.4-18.7 10.8l10.6 18.3-6.4 7.5c-4.8 5.7-8.6 12.1-11 19.1l-3.3 9.3h-21.1c-.9 7.1-.9 14.4 0 21.5h21.1l3.3 9.3c2.5 7 6.2 13.4 11 19.1l6.4 7.5-10.6 18.3c5.7 4.4 12 8 18.7 10.8l10.6-18.3 9.7 1.8c7.3 1.4 14.8 1.4 22.1 0l9.7-1.8zM560 408c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.3 32-32zm0-304.3c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.4 32-32z"] };
var faColumns = { prefix: 'fal', iconName: 'columns', icon: [512, 512, [], "f0db", "M464 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zM240 448H48c-8.837 0-16-7.163-16-16V96h208v352zm240-16c0 8.837-7.163 16-16 16H272V96h208v336z"] };
var faComment = { prefix: 'fal', iconName: 'comment', icon: [576, 512, [], "f075", "M288 32C129 32 0 125.1 0 240c0 50.2 24.6 96.3 65.6 132.2-10.4 36.3-29.7 45.9-52.3 62.1-27.6 19.7-7.9 47.6 17.4 45.6 58.7-4.7 113.3-19.9 159.2-44.2 30.6 8 63.6 12.3 98 12.3 159.1 0 288-93 288-208C576 125.1 447.1 32 288 32zm0 384c-35.4 0-69.7-4.9-102-14.7-40.9 24-90 46.7-154 54.7 48-32 62.5-56.9 69.1-96.3C61.6 330.6 32 289.2 32 240c0-96.5 115.7-176 256-176 141.5 0 256 80.2 256 176 0 96.5-115.6 176-256 176z"] };
var faCommentAlt = { prefix: 'fal', iconName: 'comment-alt', icon: [576, 512, [], "f27a", "M288 32C129 32 0 125.1 0 240c0 50.2 24.6 96.3 65.6 132.2-10.4 36.3-29.7 45.9-52.3 62.1-27.6 19.7-7.9 47.6 17.4 45.6 58.7-4.7 113.3-19.9 159.2-44.2 30.6 8 63.6 12.3 98 12.3 159.1 0 288-93 288-208C576 125.1 447.1 32 288 32zm0 384c-35.4 0-69.7-4.9-102-14.7-40.9 24-90 46.7-154 54.7 48-32 62.5-56.9 69.1-96.3C61.6 330.6 32 289.2 32 240c0-96.5 115.7-176 256-176 141.5 0 256 80.2 256 176 0 96.5-115.6 176-256 176zm32-176c0 17.7-14.3 32-32 32s-32-14.3-32-32 14.3-32 32-32 32 14.3 32 32zm96 0c0 17.7-14.3 32-32 32s-32-14.3-32-32 14.3-32 32-32 32 14.3 32 32zm-192 0c0 17.7-14.3 32-32 32s-32-14.3-32-32 14.3-32 32-32 32 14.3 32 32z"] };
var faComments = { prefix: 'fal', iconName: 'comments', icon: [576, 512, [], "f086", "M574.974 456.027C571.316 470.142 558.579 480 543.997 480c-50.403 0-89.979-17.891-120.173-36.08-52.13 14.137-111.916 12.816-165.659-7.041 30.755-1.501 60.734-6.803 88.917-15.594 27.598.54 55.154-3.378 81.424-12.21C459.19 429.076 495.998 448 543.997 448c-36-20-46.846-40.709-51.84-73.558C521.775 350.182 544 315.677 544 274.667c0-20.701-5.766-40.458-16.102-58.393.63-20.166-2.137-40.218-8.195-59.885C553.772 187.01 576 228.3 576 274.667c0 40.744-17.163 79.583-48.727 111.119 4.471 14.284 12.703 23.374 32.264 34.241 12.747 7.081 19.095 21.884 15.437 36zM240.002 64C126.033 64 32.003 130.245 32.003 210.667c0 41.011 24.074 75.515 56.16 99.775C82.753 343.291 71.003 364 32.003 384c52 0 91.875-18.924 125.116-38.925 26.268 8.152 54.145 12.258 82.883 12.258 114.09 0 207.998-66.251 207.998-146.666C448 130.849 354.931 64 240.002 64m0-32C371.039 32 480 110.723 480 210.667c0 100.271-109.385 178.667-239.998 178.667-27.008 0-53.354-3.281-78.521-9.767C129.047 397.794 86.365 416 32.003 416c-14.78 0-27.637-10.122-31.106-24.489-3.469-14.367 3.352-29.241 16.504-35.985 24.597-12.614 31.223-22.729 35.047-33.299C18.473 290.687.004 251.705.004 210.667.003 110.39 109.504 32 240.002 32z"] };
var faCompass = { prefix: 'fal', iconName: 'compass', icon: [512, 512, [], "f14e", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm216 248c0 118.663-96.055 216-216 216-118.663 0-216-96.055-216-216 0-118.663 96.055-216 216-216 118.663 0 216 96.055 216 216zM324 138.221L290.641 276 188 373.779 221.359 236 324 138.221m-22.072-23.17L199.287 212.83a31.997 31.997 0 0 0-9.029 15.639l-33.359 137.78c-7.573 31.278 30.369 52.424 53.173 30.7l102.641-97.779a31.997 31.997 0 0 0 9.029-15.639l33.359-137.78c4.907-20.264-10.567-39.531-31.092-39.531 1 0-11.736-1.024-22.081 8.831zM280 256c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24z"] };
var faCompress = { prefix: 'fal', iconName: 'compress', icon: [448, 512, [], "f066", "M436 192H312c-13.3 0-24-10.7-24-24V44c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v116h116c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12zm-276-24V44c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v116H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24zm0 300V344c0-13.3-10.7-24-24-24H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h116v116c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12zm160 0V352h116c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12H312c-13.3 0-24 10.7-24 24v124c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12z"] };
var faCompressAlt = { prefix: 'fal', iconName: 'compress-alt', icon: [448, 512, [], "f422", "M9.171 476.485l-5.656-5.656c-4.686-4.686-4.686-12.284 0-16.971L169.373 288H108c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h100c8.837 0 16 7.163 16 16v100c0 6.627-5.373 12-12 12h-8c-6.627 0-12-5.373-12-12v-61.373L26.142 476.485c-4.687 4.687-12.285 4.687-16.971 0zM240 256h100c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-61.373L444.485 58.142c4.686-4.686 4.686-12.284 0-16.971l-5.656-5.656c-4.686-4.686-12.284-4.686-16.971 0L256 201.373V140c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12v100c0 8.837 7.163 16 16 16z"] };
var faCompressWide = { prefix: 'fal', iconName: 'compress-wide', icon: [512, 512, [], "f326", "M500 224H376c-13.3 0-24-10.7-24-24V76c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v116h116c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12zm-340-24V76c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v116H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24zm0 236V312c0-13.3-10.7-24-24-24H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h116v116c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12zm224 0V320h116c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12H376c-13.3 0-24 10.7-24 24v124c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12z"] };
var faCopy = { prefix: 'fal', iconName: 'copy', icon: [448, 512, [], "f0c5", "M433.941 65.941l-51.882-51.882A48 48 0 0 0 348.118 0H176c-26.51 0-48 21.49-48 48v48H48c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48v-48h80c26.51 0 48-21.49 48-48V99.882a48 48 0 0 0-14.059-33.941zM352 32.491a15.88 15.88 0 0 1 7.431 4.195l51.882 51.883A15.885 15.885 0 0 1 415.508 96H352V32.491zM288 464c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V144c0-8.822 7.178-16 16-16h80v240c0 26.51 21.49 48 48 48h112v48zm128-96c0 8.822-7.178 16-16 16H176c-8.822 0-16-7.178-16-16V48c0-8.822 7.178-16 16-16h144v72c0 13.2 10.8 24 24 24h72v240z"] };
var faCopyright = { prefix: 'fal', iconName: 'copyright', icon: [512, 512, [], "f1f9", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm216 248c0 118.663-96.055 216-216 216-118.663 0-216-96.055-216-216 0-118.663 96.055-216 216-216 118.663 0 216 96.055 216 216zM360.474 357.366c-9.414 9.142-44.455 38.966-100.106 38.966-77.825 0-136.513-60.551-136.513-140.846 0-77.951 58.345-137.596 135.431-137.596 53.547 0 85.508 24.785 94.028 32.381a11.96 11.96 0 0 1 1.721 16.001l-8.763 12.08c-4.034 5.561-11.877 6.579-17.203 2.329-8.921-7.122-33.509-23.688-69.062-23.688-54.32 0-94.161 41.791-94.161 98.131 0 58.209 40.791 102.104 94.882 102.104 39.538 0 66.522-22.074 73.851-28.84 5.068-4.681 13.054-4.108 17.423 1.239l9.414 11.534c3.969 4.861 3.564 11.828-.942 16.205z"] };
var faCreditCard = { prefix: 'fal', iconName: 'credit-card', icon: [576, 512, [], "f09d", "M528 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h480c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zM48 64h480c8.8 0 16 7.2 16 16v48H32V80c0-8.8 7.2-16 16-16zm480 384H48c-8.8 0-16-7.2-16-16V224h512v208c0 8.8-7.2 16-16 16zm-336-84v8c0 6.6-5.4 12-12 12h-72c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h72c6.6 0 12 5.4 12 12zm192 0v8c0 6.6-5.4 12-12 12H236c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h136c6.6 0 12 5.4 12 12z"] };
var faCreditCardBlank = { prefix: 'fal', iconName: 'credit-card-blank', icon: [576, 512, [], "f389", "M528 31H48C21.5 31 0 52.5 0 79v352c0 26.5 21.5 48 48 48h480c26.5 0 48-21.5 48-48V79c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V79c0-8.8 7.2-16 16-16h480c8.8 0 16 7.2 16 16v352zm-352-68v8c0 6.6-5.4 12-12 12h-72c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h72c6.6 0 12 5.4 12 12zm192 0v8c0 6.6-5.4 12-12 12H236c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h136c6.6 0 12 5.4 12 12z"] };
var faCreditCardFront = { prefix: 'fal', iconName: 'credit-card-front', icon: [576, 512, [], "f38a", "M528 31H48C21.5 31 0 52.5 0 79v352c0 26.5 21.5 48 48 48h480c26.5 0 48-21.5 48-48V79c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V79c0-8.8 7.2-16 16-16h480c8.8 0 16 7.2 16 16v352zm-352-68v8c0 6.6-5.4 12-12 12h-72c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h72c6.6 0 12 5.4 12 12zm192 0v8c0 6.6-5.4 12-12 12H236c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h136c6.6 0 12 5.4 12 12zM488 95h-80c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h80c13.3 0 24-10.7 24-24v-48c0-13.3-10.7-24-24-24zm-8 64h-64v-32h64v32zM260 319h-56c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h56c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm28-12v-40c0-6.6 5.4-12 12-12h56c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-56c-6.6 0-12-5.4-12-12zm-192 0v-40c0-6.6 5.4-12 12-12h56c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-56c-6.6 0-12-5.4-12-12zm384-40v40c0 6.6-5.4 12-12 12h-72c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h72c6.6 0 12 5.4 12 12z"] };
var faCricket = { prefix: 'fal', iconName: 'cricket', icon: [640, 512, [], "f449", "M632.8 30.2l-9.2-13.1C617.5 8.3 608.3 2.5 597.8.6c-10.5-2-21.1.5-29.9 6.6L419.1 112c-14.5 10.1-34.4 6.6-44.6-7.9L365.3 91c-10.1-14.5-30-18-44.5-7.9L20.6 293.4c-14 9.8-21.8 25.9-20.5 42C6.2 410.4 52.5 476.6 121 508c20.8 9.5 39.4.1 46.5-4.9l300.1-210.2c14.4-10.1 18.2-29.9 7.9-44.6l-9.2-13.1c-10.1-14.5-6.6-34.4 7.9-44.6L622.9 85.9c18.1-12.7 22.5-37.6 9.9-55.7zM149.1 476.9c-4.6 3.3-10.4 4-14.8 2C53.2 441.6 32.9 362.4 32 332.7c-.4-4.8 2.3-9.9 6.9-13.2l225.3-157.7-23.6 133.7 133.7 23.6-225.2 157.8zm293.6-205.6l-31.3 21.9-133.7-23.6 23.6-133.7 31.3-21.9c3.6-2.5 8.6-1.7 11.1 2l100.9 144.2c2.6 3.6 1.7 8.5-1.9 11.1zM604.6 59.7l-175 123.1-18.4-26.2 175-123.1c3.3-2.3 8.4-2 11.1 2l9.2 13.1c2.6 3.6 1.7 8.6-1.9 11.1zM496 352c-44.1 0-80 35.9-80 80s35.9 80 80 80 80-35.9 80-80-35.9-80-80-80zm0 128c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z"] };
var faCrop = { prefix: 'fal', iconName: 'crop', icon: [512, 512, [], "f125", "M488 352h-40V86.7l55.6-55.6c4.7-4.7 4.7-12.3 0-17l-5.7-5.7c-4.7-4.7-12.3-4.7-17 0L425.3 64H160V24c0-13.2-10.8-24-24-24H88C74.8 0 64 10.8 64 24v40H24C10.8 64 0 74.8 0 88v48c0 13.2 10.8 24 24 24h40v264c0 13.2 10.8 24 24 24h264v40c0 13.2 10.8 24 24 24h48c13.2 0 24-10.8 24-24v-40h40c13.2 0 24-10.8 24-24v-48c0-13.2-10.8-24-24-24zM96 32h32v32H96V32zm-64 96V96h361.4l-32 32H32zm128 201.4V160h169.4L160 329.4zm192-146.8V352H182.6L352 182.6zM128 160v201.4l-32 32V160h32zm-9.4 256l32-32H352v32H118.6zM416 480h-32V150.6l32-32V480zm64-64h-32v-32h32v32z"] };
var faCrosshairs = { prefix: 'fal', iconName: 'crosshairs', icon: [512, 512, [], "f05b", "M506 240h-34.591C463.608 133.462 378.538 48.392 272 40.591V6a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v34.591C133.462 48.392 48.392 133.462 40.591 240H6a6 6 0 0 0-6 6v20a6 6 0 0 0 6 6h34.591C48.392 378.538 133.462 463.608 240 471.409V506a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6v-34.591C378.538 463.608 463.608 378.538 471.409 272H506a6 6 0 0 0 6-6v-20a6 6 0 0 0-6-6zM272 439.305V374a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v65.305C151.282 431.711 80.315 361.031 72.695 272H138a6 6 0 0 0 6-6v-20a6 6 0 0 0-6-6H72.695C80.289 151.282 150.969 80.316 240 72.695V138a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V72.695C360.718 80.289 431.685 150.969 439.305 240H374a6 6 0 0 0-6 6v20a6 6 0 0 0 6 6h65.305C431.711 360.718 361.031 431.684 272 439.305zM280 256c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24z"] };
var faCube = { prefix: 'fal', iconName: 'cube', icon: [512, 512, [], "f1b2", "M239.1 6.3l-208 78c-18.7 7-31.1 25-31.1 45v225.1c0 18.2 10.3 34.8 26.5 42.9l208 104c13.5 6.8 29.4 6.8 42.9 0l208-104c16.3-8.1 26.5-24.8 26.5-42.9V129.3c0-20-12.4-37.9-31.1-44.9l-208-78C262 2.2 250 2.2 239.1 6.3zM256 34.2l224 84v.3l-224 97.1-224-97.1v-.3l224-84zM32 153.4l208 90.1v224.7l-208-104V153.4zm240 314.8V243.5l208-90.1v210.9L272 468.2z"] };
var faCubes = { prefix: 'fal', iconName: 'cubes', icon: [512, 512, [], "f1b3", "M388 219V107.9c0-15-9.3-28.4-23.4-33.7l-96-36c-8.1-3.1-17.1-3.1-25.3 0l-96 36c-14.1 5.3-23.4 18.7-23.4 33.7V219L23.4 256.7C9.3 262 0 275.4 0 290.4v101.3c0 13.6 7.7 26.1 19.9 32.2l96 48c10.1 5.1 22.1 5.1 32.2 0L256 418l107.9 54c10.1 5.1 22.1 5.1 32.2 0l96-48c12.2-6.1 19.9-18.6 19.9-32.2V290.4c0-15-9.3-28.4-23.4-33.7L388 219zm-123.8 38.4V159l107.2-46.5v106.7L317 239.6l-52.8 17.8zm-123.7-163L256 51l115.5 43.3v.2l-115.5 50-115.5-50v-.1zM247.8 159v98.4L195 239.6l-54.5-20.4V112.5L247.8 159zm-124 298.4L16.5 403.8V295.1l107.2 46.5v115.8zm123.7-53.6l-107.2 53.6V341.6l107.2-46.5v108.7zm0-126.7l-115.5 50-115.5-50v-.2L131 234l107.6 39.6 8.9 3.3v.2zm124.3 180.3l-107.2-53.6V295.1l107.2 46.5v115.8zm123.7-53.6l-107.2 53.6V341.6l107.2-46.5v108.7zm0-126.7l-115.5 50L264.5 277v-.2l8.9-3.3L381 234l114.5 42.9v.2z"] };
var faCurling = { prefix: 'fal', iconName: 'curling', icon: [640, 512, [], "f44a", "M517.9 194.2c-18-39.9-57.6-66.2-101.9-66.2H304c0-17.7 14.3-32 32-32h128c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H336c-70.6 0-128 57.4-128 128v1.2c-37.7 5.4-70.2 30.1-86 65.1C53 204.9 0 264 0 336v32c0 79.5 64.5 144 144 144h352c79.5 0 144-64.5 144-144v-32c0-72-53.1-131.2-122.1-141.8zM240 160v-32c0-52.9 43.1-96 96-96h128v32H336c-35.3 0-64 28.7-64 64v32h144c25.6 0 49.1 12.3 64 32H160c26.8-35.6 64.3-32 80-32zm256 320H144c-61.8 0-112-50.2-112-112h576c0 61.8-50.2 112-112 112zM32 336c0-61.8 50.2-112 112-112h352c61.8 0 112 50.2 112 112H32z"] };
var faCut = { prefix: 'fal', iconName: 'cut', icon: [448, 512, [], "f0c4", "M249.518 256L446.829 58.828a3.998 3.998 0 0 0 0-5.655c-12.497-12.497-32.758-12.497-45.255 0L224.056 230.556l-48.642-48.607C185.88 166.573 192 148.002 192 128c0-53.019-42.981-96-96-96S0 74.981 0 128s42.981 96 96 96c20.008 0 38.584-6.124 53.962-16.595L198.593 256l-48.631 48.595C134.584 294.124 116.008 288 96 288c-53.019 0-96 42.981-96 96s42.981 96 96 96 96-42.981 96-96c0-20.002-6.12-38.573-16.585-53.949l48.642-48.607 177.518 177.384c12.497 12.497 32.758 12.497 45.255 0a3.998 3.998 0 0 0 0-5.655L249.518 256zM96 192c-35.29 0-64-28.71-64-64s28.71-64 64-64 64 28.71 64 64-28.71 64-64 64zm0 256c-35.29 0-64-28.71-64-64s28.71-64 64-64 64 28.71 64 64-28.71 64-64 64zm136-192a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"] };
var faDatabase = { prefix: 'fal', iconName: 'database', icon: [448, 512, [], "f1c0", "M224 32c106 0 192 28.75 192 64v32c0 35.25-86 64-192 64S32 163.25 32 128V96c0-35.25 86-64 192-64m192 149.5V224c0 35.25-86 64-192 64S32 259.25 32 224v-42.5c41.25 29 116.75 42.5 192 42.5s150.749-13.5 192-42.5m0 96V320c0 35.25-86 64-192 64S32 355.25 32 320v-42.5c41.25 29 116.75 42.5 192 42.5s150.749-13.5 192-42.5m0 96V416c0 35.25-86 64-192 64S32 451.25 32 416v-42.5c41.25 29 116.75 42.5 192 42.5s150.749-13.5 192-42.5M224 0C145.858 0 0 18.801 0 96v320c0 77.338 146.096 96 224 96 78.142 0 224-18.801 224-96V96c0-77.338-146.096-96-224-96z"] };
var faDeaf = { prefix: 'fal', iconName: 'deaf', icon: [512, 512, [], "f2a4", "M409.171 108.485l-5.656-5.656c-4.686-4.686-4.686-12.284 0-16.971l82.344-82.344c4.686-4.686 12.284-4.686 16.971 0l5.656 5.656c4.686 4.686 4.686 12.284 0 16.971l-82.344 82.344c-4.687 4.687-12.285 4.687-16.971 0zm-383.029 400l186.344-186.344c4.686-4.686 4.686-12.284 0-16.971l-5.656-5.656c-4.686-4.686-12.284-4.686-16.971 0L3.515 485.858c-4.686 4.686-4.686 12.284 0 16.971l5.656 5.656c4.686 4.687 12.284 4.687 16.971 0zm317.534-103.151c0-69.293 73.391-78.477 73.391-165.334 0-88.812-72.255-161.066-161.067-161.066S94.933 151.188 94.933 240c0 8.837 7.163 16 16 16s16-7.163 16-16c0-71.167 57.899-129.066 129.066-129.066 71.168 0 129.067 57.899 129.067 129.066 0 71.434-73.391 80.16-73.391 165.334 0 41.171-33.495 74.666-74.667 74.666-8.837 0-16 7.163-16 16s7.163 16 16 16c58.818 0 106.668-47.851 106.668-106.666zM336.743 256c-8.837 0-16-7.163-16-16 0-36.172-29.428-65.6-65.6-65.6s-65.6 29.428-65.6 65.6c0 8.837-7.163 16-16 16s-16-7.163-16-16c0-53.816 43.783-97.6 97.6-97.6s97.6 43.783 97.6 97.6c0 8.837-7.163 16-16 16z"] };
var faDesktop = { prefix: 'fal', iconName: 'desktop', icon: [576, 512, [], "f108", "M528 0H48C21.5 0 0 21.5 0 48v288c0 26.5 21.5 48 48 48h192l-24 96h-72c-8.8 0-16 7.2-16 16s7.2 16 16 16h288c8.8 0 16-7.2 16-16s-7.2-16-16-16h-72l-24-96h192c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM249 480l16-64h46l16 64h-78zm295-144c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h480c8.8 0 16 7.2 16 16v288z"] };
var faDesktopAlt = { prefix: 'fal', iconName: 'desktop-alt', icon: [576, 512, [], "f390", "M528 0H48C21.5 0 0 21.5 0 48v288c0 26.5 21.5 48 48 48h192l-24 96h-72c-8.8 0-16 7.2-16 16s7.2 16 16 16h288c8.8 0 16-7.2 16-16s-7.2-16-16-16h-72l-24-96h192c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM249 480l16-64h46l16 64h-78zm295-144c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16v-48h512v48zm0-80H32V48c0-8.8 7.2-16 16-16h480c8.8 0 16 7.2 16 16v208z"] };
var faDiamond = { prefix: 'fal', iconName: 'diamond', icon: [448, 512, [], "f219", "M253 13.4c-15.3-17.9-42.8-17.9-58.1 0L9.3 230.9c-12.4 14.5-12.4 35.6 0 50.2L195 498.6c15.3 17.9 42.8 17.9 58.1 0l185.6-217.5c12.4-14.5 12.4-35.6 0-50.2L253 13.4zm161.4 246.9L228.7 477.8c-2.5 2.9-6.9 2.9-9.4 0L33.6 260.3c-2.1-2.5-2.1-6.2 0-8.6L219.3 34.2c2.5-2.9 6.9-2.9 9.4 0l185.7 217.5c2.1 2.5 2.1 6.1 0 8.6z"] };
var faDollarSign = { prefix: 'fal', iconName: 'dollar-sign', icon: [256, 512, [], "f155", "M215.016 270.738c-20.645-16.106-47.199-26.623-72.879-36.793-52.27-20.701-84.007-35.924-84.007-72.7 0-14.775 6.838-28.551 19.256-38.79 14.224-11.729 34.232-17.928 57.862-17.928 44.17 0 74.063 28.044 74.332 28.3a12 12 0 0 0 18.455-2.164l12.348-19.327a12.002 12.002 0 0 0-1.484-14.801c-1.316-1.362-30.896-31.36-84.135-37.163V12c0-6.628-5.373-12-12-12H119.68c-6.627 0-12 5.372-12 12v48.628c-26.917 4.68-50.079 15.699-67.459 32.187-19.506 18.503-30.249 42.997-30.249 68.968 0 31.566 12.416 56.747 37.956 76.979 21.247 16.832 48.384 27.789 74.628 38.386 50.536 20.404 81.22 35.216 81.22 68.775 0 36.556-29.504 62.086-71.749 62.086-55.769 0-91.023-37.421-91.539-37.976-2.298-2.511-5.551-3.945-8.958-3.899a12.003 12.003 0 0 0-8.909 4.078L7.052 387.928a12.001 12.001 0 0 0-.031 15.808c1.538 1.764 36.52 41.1 100.659 49.193V500c0 6.628 5.373 12 12 12h23.084c6.627 0 12-5.372 12-12v-47.312c27.167-4.216 50.427-15.711 67.75-33.589 18.972-19.579 29.42-45.947 29.42-74.249 0-30.488-12.076-54.73-36.918-74.112z"] };
var faDotCircle = { prefix: 'fal', iconName: 'dot-circle', icon: [512, 512, [], "f192", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 464c-118.663 0-216-96.055-216-216 0-118.663 96.055-216 216-216 118.663 0 216 96.055 216 216 0 118.663-96.055 216-216 216zm0-296c-44.183 0-80 35.817-80 80s35.817 80 80 80 80-35.817 80-80-35.817-80-80-80zm0 128c-26.467 0-48-21.533-48-48s21.533-48 48-48 48 21.533 48 48-21.533 48-48 48z"] };
var faDownload = { prefix: 'fal', iconName: 'download', icon: [512, 512, [], "f019", "M452 432c0 11-9 20-20 20s-20-9-20-20 9-20 20-20 20 9 20 20zm-84-20c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm144-48v104c0 24.3-19.7 44-44 44H44c-24.3 0-44-19.7-44-44V364c0-24.3 19.7-44 44-44h99.4L87 263.6c-25.2-25.2-7.3-68.3 28.3-68.3H168V40c0-22.1 17.9-40 40-40h96c22.1 0 40 17.9 40 40v155.3h52.7c35.6 0 53.4 43.1 28.3 68.3L368.6 320H468c24.3 0 44 19.7 44 44zm-261.7 17.7c3.1 3.1 8.2 3.1 11.3 0L402.3 241c5-5 1.5-13.7-5.7-13.7H312V40c0-4.4-3.6-8-8-8h-96c-4.4 0-8 3.6-8 8v187.3h-84.7c-7.1 0-10.7 8.6-5.7 13.7l140.7 140.7zM480 364c0-6.6-5.4-12-12-12H336.6l-52.3 52.3c-15.6 15.6-41 15.6-56.6 0L175.4 352H44c-6.6 0-12 5.4-12 12v104c0 6.6 5.4 12 12 12h424c6.6 0 12-5.4 12-12V364z"] };
var faDumbbell = { prefix: 'fal', iconName: 'dumbbell', icon: [640, 512, [], "f44b", "M632 240h-24v-96c0-26.5-21.5-48-48-48h-32c-5.6 0-11 1.2-16 2.9V80c0-26.5-21.5-48-48-48h-32c-26.5 0-48 21.5-48 48v160H256V80c0-26.5-21.5-48-48-48h-32c-26.5 0-48 21.5-48 48v18.9c-5-1.8-10.4-2.9-16-2.9H80c-26.5 0-48 21.5-48 48v96H8c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h24v96c0 26.5 21.5 48 48 48h32c5.6 0 11-1.2 16-2.9V432c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V272h128v160c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48v-18.9c5 1.8 10.4 2.9 16 2.9h32c26.5 0 48-21.5 48-48v-96h24c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8zM112 384H80c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v224c0 8.8-7.2 16-16 16zm112 48c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v352zm256 0c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v352zm96-64c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v224z"] };
var faEdit = { prefix: 'fal', iconName: 'edit', icon: [576, 512, [], "f044", "M417.8 315.5l20-20c3.8-3.8 10.2-1.1 10.2 4.2V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V112c0-26.5 21.5-48 48-48h292.3c5.3 0 8 6.5 4.2 10.2l-20 20c-1.1 1.1-2.7 1.8-4.2 1.8H48c-8.8 0-16 7.2-16 16v352c0 8.8 7.2 16 16 16h352c8.8 0 16-7.2 16-16V319.7c0-1.6.6-3.1 1.8-4.2zm145.9-191.2L251.2 436.8l-99.9 11.1c-13.4 1.5-24.7-9.8-23.2-23.2l11.1-99.9L451.7 12.3c16.4-16.4 43-16.4 59.4 0l52.6 52.6c16.4 16.4 16.4 43 0 59.4zm-93.6 48.4L403.4 106 169.8 339.5l-8.3 75.1 75.1-8.3 233.5-233.6zm71-85.2l-52.6-52.6c-3.8-3.8-10.2-4-14.1 0L426 83.3l66.7 66.7 48.4-48.4c3.9-3.8 3.9-10.2 0-14.1z"] };
var faEject = { prefix: 'fal', iconName: 'eject', icon: [448, 512, [], "f052", "M435.322 239.565L259.383 47.558c-19.014-20.743-51.751-20.745-70.767 0L12.67 239.565C-15.475 270.268 6.324 320 48.053 320h351.886c41.651 0 63.581-49.674 35.383-80.435zM399.939 288H48.053c-13.866 0-21.169-16.585-11.791-26.816L212.205 69.181c6.323-6.897 17.248-6.918 23.585-.005l175.943 192.012c9.371 10.223 2.076 26.812-11.794 26.812zM448 400v32c0 26.51-21.49 48-48 48H48c-26.51 0-48-21.49-48-48v-32c0-26.51 21.49-48 48-48h352c26.51 0 48 21.49 48 48zm-48-16H48c-8.822 0-16 7.178-16 16v32c0 8.823 7.178 16 16 16h352c8.822 0 16-7.177 16-16v-32c0-8.822-7.178-16-16-16z"] };
var faEllipsisH = { prefix: 'fal', iconName: 'ellipsis-h', icon: [320, 512, [], "f141", "M192 256c0 17.7-14.3 32-32 32s-32-14.3-32-32 14.3-32 32-32 32 14.3 32 32zm88-32c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm-240 0c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z"] };
var faEllipsisHAlt = { prefix: 'fal', iconName: 'ellipsis-h-alt', icon: [512, 512, [], "f39b", "M256 184c-39.8 0-72 32.2-72 72s32.2 72 72 72 72-32.2 72-72-32.2-72-72-72zm0 112c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40zm176-112c-39.8 0-72 32.2-72 72s32.2 72 72 72 72-32.2 72-72-32.2-72-72-72zm0 112c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40zM80 184c-39.8 0-72 32.2-72 72s32.2 72 72 72 72-32.2 72-72-32.2-72-72-72zm0 112c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z"] };
var faEllipsisV = { prefix: 'fal', iconName: 'ellipsis-v', icon: [64, 512, [], "f142", "M32 224c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zM0 136c0 17.7 14.3 32 32 32s32-14.3 32-32-14.3-32-32-32-32 14.3-32 32zm0 240c0 17.7 14.3 32 32 32s32-14.3 32-32-14.3-32-32-32-32 14.3-32 32z"] };
var faEllipsisVAlt = { prefix: 'fal', iconName: 'ellipsis-v-alt', icon: [192, 512, [], "f39c", "M96 152c39.8 0 72-32.2 72-72S135.8 8 96 8 24 40.2 24 80s32.2 72 72 72zm0-112c22.1 0 40 17.9 40 40s-17.9 40-40 40-40-17.9-40-40 17.9-40 40-40zm0 144c-39.8 0-72 32.2-72 72s32.2 72 72 72 72-32.2 72-72-32.2-72-72-72zm0 112c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40zm0 64c-39.8 0-72 32.2-72 72s32.2 72 72 72 72-32.2 72-72-32.2-72-72-72zm0 112c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z"] };
var faEnvelope = { prefix: 'fal', iconName: 'envelope', icon: [512, 512, [], "f0e0", "M464 64H48C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM48 96h416c8.8 0 16 7.2 16 16v41.4c-21.9 18.5-53.2 44-150.6 121.3-16.9 13.4-50.2 45.7-73.4 45.3-23.2.4-56.6-31.9-73.4-45.3C85.2 197.4 53.9 171.9 32 153.4V112c0-8.8 7.2-16 16-16zm416 320H48c-8.8 0-16-7.2-16-16V195c22.8 18.7 58.8 47.6 130.7 104.7 20.5 16.4 56.7 52.5 93.3 52.3 36.4.3 72.3-35.5 93.3-52.3 71.9-57.1 107.9-86 130.7-104.7v205c0 8.8-7.2 16-16 16z"] };
var faEnvelopeOpen = { prefix: 'fal', iconName: 'envelope-open', icon: [512, 512, [], "f2b6", "M349.32 52.26C328.278 35.495 292.938 0 256 0c-36.665 0-71.446 34.769-93.31 52.26-34.586 27.455-109.525 87.898-145.097 117.015A47.99 47.99 0 0 0 0 206.416V464c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V206.413a47.989 47.989 0 0 0-17.597-37.144C458.832 140.157 383.906 79.715 349.32 52.26zM464 480H48c-8.837 0-16-7.163-16-16V206.161c0-4.806 2.155-9.353 5.878-12.392C64.16 172.315 159.658 95.526 182.59 77.32 200.211 63.27 232.317 32 256 32c23.686 0 55.789 31.27 73.41 45.32 22.932 18.207 118.436 95.008 144.714 116.468a15.99 15.99 0 0 1 5.876 12.39V464c0 8.837-7.163 16-16 16zm-8.753-216.312c4.189 5.156 3.393 12.732-1.776 16.905-22.827 18.426-55.135 44.236-104.156 83.148-21.045 16.8-56.871 52.518-93.318 52.258-36.58.264-72.826-35.908-93.318-52.263-49.015-38.908-81.321-64.716-104.149-83.143-5.169-4.173-5.966-11.749-1.776-16.905l5.047-6.212c4.169-5.131 11.704-5.925 16.848-1.772 22.763 18.376 55.014 44.143 103.938 82.978 16.85 13.437 50.201 45.69 73.413 45.315 23.219.371 56.562-31.877 73.413-45.315 48.929-38.839 81.178-64.605 103.938-82.978 5.145-4.153 12.679-3.359 16.848 1.772l5.048 6.212z"] };
var faEnvelopeSquare = { prefix: 'fal', iconName: 'envelope-square', icon: [448, 512, [], "f199", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zm-64-304H96c-17.673 0-32 14.327-32 32v192c0 17.673 14.327 32 32 32h256c17.673 0 32-14.327 32-32V160c0-17.673-14.327-32-32-32zm0 32v33.855c-14.136 11.628-36.566 29.664-82.117 65.821C259.426 268.015 238.748 288 224.256 288l-.256-.002-.256.002c-14.492 0-35.17-19.984-45.628-28.324-45.544-36.152-67.978-54.192-82.117-65.822V160H352zM96 352V235.092c14.109 11.367 33.624 26.948 62.221 49.648 13.777 11.01 37.902 35.26 65.523 35.26l.253-.001.258.001c27.529 0 51.392-23.975 65.541-35.274 28.583-22.689 48.099-38.27 62.203-49.634V352H96z"] };
var faEraser = { prefix: 'fal', iconName: 'eraser', icon: [512, 512, [], "f12d", "M497.942 273.941c18.745-18.745 18.745-49.137 0-67.882l-160-160c-18.744-18.744-49.136-18.746-67.883 0l-256 256c-18.745 18.745-18.745 49.137 0 67.882l96 96A48 48 0 0 0 144 480h356c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H323.883l174.059-174.059zM292.686 68.687c6.243-6.243 16.374-6.254 22.628-.001l160 160c6.243 6.243 6.253 16.374 0 22.627L358.627 368.001 176 185.373 292.686 68.687zM144 448a15.895 15.895 0 0 1-11.314-4.686l-96-96c-6.243-6.243-6.253-16.374 0-22.627L153.373 208 336 390.628l-52.686 52.686A15.895 15.895 0 0 1 272 448H144z"] };
var faEuroSign = { prefix: 'fal', iconName: 'euro-sign', icon: [320, 512, [], "f153", "M303.625 444.131c-1.543-6.481-8.063-10.445-14.538-8.874-10.014 2.43-25.689 5.304-43.827 5.304-80.726 0-141.733-46.614-160.837-120.561h155.241a12 12 0 0 0 11.784-9.731l1.541-8c1.425-7.402-4.246-14.269-11.784-14.269H77.646c-1.849-20.951-1.849-43.664.616-64h178.657a12 12 0 0 0 11.784-9.731l1.541-8c1.425-7.402-4.246-14.269-11.784-14.269H85.04c20.951-70.25 80.111-120.561 159.604-120.561 14.725 0 28.452 2.194 37.551 4.086 6.282 1.306 12.47-2.581 14.05-8.799l3.93-15.475c1.689-6.652-2.529-13.383-9.262-14.718C280.423 34.452 264.068 32 245.26 32 143.582 32 63.472 100.181 39.439 192H12c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h21.893c-2.466 17.87-1.849 49.827-.617 64H12c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h26.207c21.568 96.749 101.678 160 207.053 160 22.511 0 41.595-3.426 53.081-6.106 6.47-1.51 10.465-7.999 8.926-14.462l-3.642-15.301z"] };
var faExchange = { prefix: 'fal', iconName: 'exchange', icon: [512, 512, [], "f0ec", "M508.485 184.485l-92.485 92c-4.687 4.686-12.284 4.686-16.97 0l-7.071-7.07c-4.687-4.686-4.687-12.284 0-16.971L452.893 192H12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h440.905l-60.946-60.444c-4.687-4.686-4.687-12.284 0-16.971l7.07-7.07c4.687-4.686 12.284-4.686 16.971 0l92.485 92c4.687 4.686 4.686 12.284 0 16.97zm-504.97 160l92.485 92c4.687 4.686 12.284 4.686 16.971 0l7.07-7.07c4.687-4.686 4.687-12.284 0-16.971L59.095 352H500c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H59.107l60.934-60.444c4.687-4.686 4.687-12.284 0-16.971l-7.071-7.07c-4.686-4.686-12.284-4.687-16.97 0l-92.485 92c-4.686 4.686-4.687 12.284 0 16.97z"] };
var faExchangeAlt = { prefix: 'fal', iconName: 'exchange-alt', icon: [512, 512, [], "f362", "M12 192h372v56c0 29.552 36.528 43.072 55.917 21.26l64-72c10.777-12.124 10.777-30.395 0-42.519l-64-72C420.535 60.936 384 74.436 384 104v56H12c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12zm404-88l64 72-64 72V104zm84 216H128v-56c0-29.552-36.528-43.072-55.917-21.26l-64 72c-10.777 12.124-10.777 30.395 0 42.519l64 72C91.465 451.064 128 437.564 128 408v-56h372c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12zM96 408l-64-72 64-72v144z"] };
var faExclamation = { prefix: 'fal', iconName: 'exclamation', icon: [192, 512, [], "f12a", "M139.315 32c6.889 0 12.364 5.787 11.982 12.666l-14.667 264c-.353 6.359-5.613 11.334-11.982 11.334H67.352c-6.369 0-11.628-4.975-11.982-11.334l-14.667-264C40.321 37.787 45.796 32 52.685 32h86.63M96 352c35.29 0 64 28.71 64 64s-28.71 64-64 64-64-28.71-64-64 28.71-64 64-64M139.315 0h-86.63C27.457 0 7.353 21.246 8.753 46.441l14.667 264c.652 11.728 5.864 22.178 13.854 29.665C14.613 357.682 0 385.168 0 416c0 52.935 43.065 96 96 96s96-43.065 96-96c0-30.832-14.613-58.318-37.274-75.894 7.991-7.487 13.203-17.937 13.854-29.665l14.667-264C184.647 21.251 164.548 0 139.315 0z"] };
var faExclamationCircle = { prefix: 'fal', iconName: 'exclamation-circle', icon: [512, 512, [], "f06a", "M256 40c118.621 0 216 96.075 216 216 0 119.291-96.61 216-216 216-119.244 0-216-96.562-216-216 0-119.203 96.602-216 216-216m0-32C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm-11.49 120h22.979c6.823 0 12.274 5.682 11.99 12.5l-7 168c-.268 6.428-5.556 11.5-11.99 11.5h-8.979c-6.433 0-11.722-5.073-11.99-11.5l-7-168c-.283-6.818 5.167-12.5 11.99-12.5zM256 340c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28z"] };
var faExclamationSquare = { prefix: 'fal', iconName: 'exclamation-square', icon: [448, 512, [], "f321", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zm-192-92c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28zm-11.49-212h22.979c6.823 0 12.274 5.682 11.99 12.5l-7 168c-.268 6.428-5.557 11.5-11.99 11.5h-8.979c-6.433 0-11.722-5.073-11.99-11.5l-7-168c-.283-6.818 5.167-12.5 11.99-12.5zM224 340c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28z"] };
var faExclamationTriangle = { prefix: 'fal', iconName: 'exclamation-triangle', icon: [576, 512, [], "f071", "M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.054-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.952 83.154 0l239.94 416.028zm-27.658 15.991l-240-416c-6.16-10.678-21.583-10.634-27.718 0l-240 416C27.983 466.678 35.731 480 48 480h480c12.323 0 19.99-13.369 13.859-23.996zM288 372c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28zm-11.49-212h22.979c6.823 0 12.274 5.682 11.99 12.5l-7 168c-.268 6.428-5.556 11.5-11.99 11.5h-8.979c-6.433 0-11.722-5.073-11.99-11.5l-7-168c-.283-6.818 5.167-12.5 11.99-12.5zM288 372c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28z"] };
var faExpand = { prefix: 'fal', iconName: 'expand', icon: [448, 512, [], "f065", "M0 180V56c0-13.3 10.7-24 24-24h124c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H32v116c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12zM300 32h124c13.3 0 24 10.7 24 24v124c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12V64H300c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12zm148 300v124c0 13.3-10.7 24-24 24H300c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h116V332c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12zM148 480H24c-13.3 0-24-10.7-24-24V332c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v116h116c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12z"] };
var faExpandAlt = { prefix: 'fal', iconName: 'expand-alt', icon: [448, 512, [], "f424", "M198.829 275.515l5.656 5.656c4.686 4.686 4.686 12.284 0 16.971L54.627 448H116c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H12c-6.627 0-12-5.373-12-12V364c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v61.373l149.858-149.858c4.687-4.687 12.285-4.687 16.971 0zM436 32H332c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h61.373L243.515 213.858c-4.686 4.686-4.686 12.284 0 16.971l5.656 5.656c4.686 4.686 12.284 4.686 16.971 0L416 86.627V148c0 6.627 5.373 12 12 12h8c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12z"] };
var faExpandArrows = { prefix: 'fal', iconName: 'expand-arrows', icon: [448, 512, [], "f31d", "M447.7 364l.3 104c0 6.6-5.4 12-12 12l-104-.3c-6.6 0-12-5.4-12-12v-10c0-6.6 5.4-12 12-12l58 .3.7-.7L224 278.6 57.3 445.3l.7.7 58-.3c6.6 0 12 5.4 12 12v10c0 6.6-5.4 12-12 12L12 480c-6.6 0-12-5.4-12-12l.3-104c0-6.6 5.4-12 12-12h10c6.6 0 12 5.4 12 12l-.3 58 .7.7L201.4 256 34.7 89.3l-.7.7.3 58c0 6.6-5.4 12-12 12h-10c-6.6 0-12-5.4-12-12L0 44c0-6.6 5.4-12 12-12l104 .3c6.6 0 12 5.4 12 12v10c0 6.6-5.4 12-12 12L58 66l-.7.7L224 233.4 390.7 66.7l-.7-.7-58 .3c-6.6 0-12-5.4-12-12v-10c0-6.6 5.4-12 12-12l104-.3c6.6 0 12 5.4 12 12l-.3 104c0 6.6-5.4 12-12 12h-10c-6.6 0-12-5.4-12-12l.3-58-.7-.7L246.6 256l166.7 166.7.7-.7-.3-58c0-6.6 5.4-12 12-12h10c6.6 0 12 5.4 12 12z"] };
var faExpandArrowsAlt = { prefix: 'fal', iconName: 'expand-arrows-alt', icon: [448, 512, [], "f31e", "M391.7 329.7L356 365.4 246.6 256 356 146.6l35.7 35.7c20.7 20.7 56.3 6 56.3-23.3V65c0-18.2-14.8-33-33-33h-94c-29.3 0-44.1 35.5-23.3 56.3l35.7 35.7L224 233.4 114.6 124l35.7-35.7C171 67.6 156.3 32 127 32H33C14.8 32 0 46.8 0 65v94c0 29.3 35.5 44.1 56.3 23.3L92 146.6 201.4 256 92 365.4l-35.7-35.7C35.6 309 0 323.7 0 353v94c0 18.2 14.8 33 33 33h94c29.3 0 44.1-35.5 23.3-56.3L114.6 388 224 278.6 333.4 388l-35.7 35.7c-20.7 20.7-6 56.3 23.3 56.3h94c18.2 0 33-14.8 33-33v-94c0-29.3-35.6-44.1-56.3-23.3zM321 60.9h94c2.3 0 4.1 1.9 4.1 4.1v94c0 3.7-4.4 5.5-7 2.9l-94-94c-2.6-2.6-.8-7 2.9-7zm-285.1 101c-2.6 2.6-7 .8-7-2.9V65c0-2.3 1.9-4.1 4.1-4.1h94c3.7 0 5.5 4.4 2.9 7l-94 94zM127 451.1H33c-2.3 0-4.1-1.9-4.1-4.1v-94c0-3.7 4.4-5.5 7-2.9l94 94c2.6 2.6.8 7-2.9 7zm288 0h-94c-3.7 0-5.5-4.4-2.9-7l94-94c2.6-2.6 7-.8 7 2.9v94c.1 2.3-1.8 4.1-4.1 4.1z"] };
var faExpandWide = { prefix: 'fal', iconName: 'expand-wide', icon: [512, 512, [], "f320", "M0 212V88c0-13.3 10.7-24 24-24h124c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H32v116c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12zM364 64h124c13.3 0 24 10.7 24 24v124c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12V96H364c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12zm148 236v124c0 13.3-10.7 24-24 24H364c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h116V300c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12zM148 448H24c-13.3 0-24-10.7-24-24V300c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v116h116c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12z"] };
var faExternalLink = { prefix: 'fal', iconName: 'external-link', icon: [576, 512, [], "f08e", "M195.515 374.828c-4.686-4.686-4.686-12.284 0-16.971l323.15-323.15-.707-.707-89.958.342c-6.627 0-12-5.373-12-12v-9.999c0-6.628 5.372-12 12-12L564 0c6.627 0 12 5.372 12 12l-.343 136c0 6.627-5.373 12-12 12h-9.999c-6.627 0-12-5.373-12-12L542 58.042l-.707-.707-323.15 323.15c-4.686 4.686-12.284 4.686-16.971 0l-5.657-5.657zm232-155.633l-8 8A12 12 0 0 0 416 235.68V464c0 8.837-7.164 16-16 16H48c-8.836 0-16-7.163-16-16V112c0-8.837 7.164-16 16-16h339.976c3.183 0 6.235-1.264 8.485-3.515l8-8c7.56-7.56 2.206-20.485-8.485-20.485H48C21.49 64 0 85.49 0 112v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V227.681c0-10.691-12.926-16.045-20.485-8.486z"] };
var faExternalLinkAlt = { prefix: 'fal', iconName: 'external-link-alt', icon: [576, 512, [], "f35d", "M544 0h-.056l-96.167.167c-28.442.049-42.66 34.539-22.572 54.627l35.272 35.272L163.515 387.03c-4.686 4.686-4.686 12.284 0 16.97l8.484 8.485c4.687 4.686 12.285 4.686 16.971 0l296.964-296.964 35.272 35.272c20.023 20.023 54.578 5.98 54.627-22.572L576 32.055C576.03 14.353 561.675 0 544 0zm-.167 128.167l-96-96L544 32l-.167 96.167zM448 227.681V464c0 26.51-21.49 48-48 48H48c-26.51 0-48-21.49-48-48V112c0-26.51 21.49-48 48-48h323.976c3.183 0 6.235 1.264 8.485 3.515l8 8c7.56 7.56 2.206 20.485-8.485 20.485H48c-8.837 0-16 7.163-16 16v352c0 8.837 7.163 16 16 16h352c8.837 0 16-7.163 16-16V235.68c0-3.183 1.264-6.235 3.515-8.485l8-8c7.559-7.559 20.485-2.205 20.485 8.486z"] };
var faExternalLinkSquare = { prefix: 'fal', iconName: 'external-link-square', icon: [448, 512, [], "f14c", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zM99.515 374.828c-4.686-4.686-4.686-12.284 0-16.971l195.15-195.15-.707-.707-89.958.342c-6.627 0-12-5.373-12-12v-9.999c0-6.628 5.372-12 12-12L340 128c6.627 0 12 5.372 12 12l-.343 136c0 6.627-5.373 12-12 12h-9.999c-6.627 0-12-5.373-12-12l.342-89.958-.707-.707-195.15 195.15c-4.686 4.686-12.284 4.686-16.971 0l-5.657-5.657z"] };
var faExternalLinkSquareAlt = { prefix: 'fal', iconName: 'external-link-square-alt', icon: [448, 512, [], "f360", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zm-96-304h-.056l-96.167.167c-28.442.049-42.66 34.539-22.572 54.627l35.272 35.272L98.545 356c-4.686 4.686-4.686 12.284 0 16.97l8.484 8.485c4.687 4.686 12.285 4.686 16.971 0l137.934-137.934 35.272 35.272c20.023 20.023 54.578 5.98 54.627-22.572l.167-96.166c.03-17.702-14.325-32.055-32-32.055zm-.167 128.167l-96-96L320 160l-.167 96.167z"] };
var faEye = { prefix: 'fal', iconName: 'eye', icon: [576, 512, [], "f06e", "M569.354 231.631C512.969 135.948 407.808 72 288 72 168.14 72 63.004 135.994 6.646 231.63a47.999 47.999 0 0 0 0 48.739C63.032 376.053 168.192 440 288 440c119.86 0 224.996-63.994 281.354-159.631a48.002 48.002 0 0 0 0-48.738zM416 228c0 68.483-57.308 124-128 124s-128-55.517-128-124 57.308-124 128-124 128 55.517 128 124zm125.784 36.123C489.837 352.277 393.865 408 288 408c-106.291 0-202.061-56.105-253.784-143.876a16.006 16.006 0 0 1 0-16.247c29.072-49.333 73.341-90.435 127.66-115.887C140.845 158.191 128 191.568 128 228c0 85.818 71.221 156 160 156 88.77 0 160-70.178 160-156 0-36.411-12.833-69.794-33.875-96.01 53.76 25.189 98.274 66.021 127.66 115.887a16.006 16.006 0 0 1-.001 16.246zM224 224c0-10.897 2.727-21.156 7.53-30.137v.02c0 14.554 11.799 26.353 26.353 26.353 14.554 0 26.353-11.799 26.353-26.353s-11.799-26.353-26.353-26.353h-.02c8.981-4.803 19.24-7.53 30.137-7.53 35.346 0 64 28.654 64 64s-28.654 64-64 64-64-28.654-64-64z"] };
var faEyeDropper = { prefix: 'fal', iconName: 'eye-dropper', icon: [512, 512, [], "f1fb", "M485.487 26.509c-35.349-35.349-92.658-35.342-128 0l-66.175 66.178-24-24c-6.24-6.25-16.38-6.25-22.62 0L180.69 132.69c-6.25 6.24-6.25 16.38 0 22.62l24 24L39.03 344.97A24.01 24.01 0 0 0 32 361.94V440L0 496l16 16 56-32h78.06c6.36 0 12.47-2.53 16.97-7.03l165.66-165.66 24 24c6.218 6.237 16.37 6.269 22.62 0l64.002-64.002c6.25-6.24 6.25-16.38 0-22.62l-24-24 66.175-66.178c35.351-35.351 35.351-92.651 0-128.001zM146.75 448H64v-82.75l163.32-163.31 82.74 82.74L146.75 448zm316.107-316.121l-88.795 88.808 35.31 35.31L368 297.37 214.63 144l41.372-41.372 35.31 35.31 88.805-88.798c22.874-22.875 59.874-22.867 82.74 0 22.875 22.874 22.867 59.873 0 82.739z"] };
var faEyeSlash = { prefix: 'fal', iconName: 'eye-slash', icon: [576, 512, [], "f070", "M321.496 406.121l21.718 29.272A331.764 331.764 0 0 1 288 440C168.14 440 63.003 376.006 6.646 280.369a47.999 47.999 0 0 1 0-48.739c25.834-43.84 61.913-81.01 104.943-108.427l19.125 25.777c-39.83 24.942-73.004 59.027-96.499 98.896a16.008 16.008 0 0 0 0 16.246C86.163 352.277 182.135 408 288 408c11.298 0 22.476-.64 33.496-1.879zM141.972 164.155C133.037 183.57 128 205.19 128 228c0 85.822 71.23 156 160 156 5.566 0 11.063-.277 16.479-.815l-23.266-31.359C213.676 348.408 160 294.277 160 228a120.48 120.48 0 0 1 4.664-33.26l-22.692-30.585zM569.354 280.37c-33.709 57.202-84.861 103.039-146.143 130.673l56.931 76.732c4 5.391 2.872 13.004-2.519 17.004l-6.507 4.828c-5.391 4-13.004 2.872-17.003-2.519L95.859 24.225c-4-5.391-2.872-13.004 2.519-17.004l6.507-4.828c5.391-4 13.004-2.872 17.003 2.519l62.189 83.82C216.741 77.883 251.696 72 288 72c119.86 0 224.996 63.994 281.354 159.63a48.005 48.005 0 0 1 0 48.74zM416 228c0-68.483-57.308-124-128-124-28.059 0-54.002 8.754-75.095 23.588l34.709 46.782c20.339-16.584 48.244-18.755 70.523-6.84h-.02c-14.554 0-26.353 11.799-26.353 26.353s11.799 26.353 26.353 26.353c14.554 0 26.353-11.799 26.353-26.353v-.02c15.223 28.465 6.889 64.554-20.679 83.18l38.514 51.911C394.803 306.465 416 269.638 416 228zm125.785 19.877c-29.072-49.333-73.341-90.435-127.66-115.887 55.405 69.029 41.701 170.413-32.734 222.688l22.238 29.973c57.564-24.305 106.246-66.38 138.155-120.527a16.008 16.008 0 0 0 .001-16.247z"] };
var faFastBackward = { prefix: 'fal', iconName: 'fast-backward', icon: [512, 512, [], "f049", "M12 447h8c6.6 0 12-5.4 12-12V277.3c.9 1 1.9 2 3 2.9l200.5 159.4c20.6 17.2 52.5 2.8 52.5-24.6V297.2l171.5 142.4c20.6 17.2 52.5 2.8 52.5-24.6V95c0-27.4-31.9-41.8-52.5-24.6L288 213.9V95.1c0-27.4-31.9-41.8-52.5-24.6L35 231c-1.1.9-2.1 1.9-3 2.9V75c0-6.6-5.4-12-12-12h-8C5.4 63 0 68.4 0 75v360c0 6.6 5.4 12 12 12zm280.5-191.4l.2-.1.2-.1L480 95v320L292.7 255.8l-.1-.1-.1-.1zM61 255.2l194.8-160 .1-.1.1-.1v320l-.1-.1-.1-.1L61 256v-.8z"] };
var faFastForward = { prefix: 'fal', iconName: 'fast-forward', icon: [512, 512, [], "f050", "M500 63h-8c-6.6 0-12 5.4-12 12v157.7c-.9-1-1.9-2-3-2.9L276.5 70.4C255.9 53.3 224 67.6 224 95v117.8L52.5 70.4C31.9 53.3 0 67.6 0 95v320c0 27.4 31.9 41.8 52.5 24.6L224 296.2V415c0 27.4 31.9 41.8 52.5 24.6L477 279c1.1-.9 2.1-1.9 3-2.9V435c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V75c0-6.6-5.4-12-12-12zM219.5 254.4l-.2.1-.2.1L32 415V95l187.3 159.2.1.1.1.1zm231.5.5l-194.8 160-.1.1h-.1V95l.1.1.1.1L451 254v.9z"] };
var faFax = { prefix: 'fal', iconName: 'fax', icon: [512, 512, [], "f1ac", "M96 96H48c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h48c26.51 0 48-21.49 48-48V144c0-26.51-21.49-48-48-48zm16 368c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V144c0-8.822 7.178-16 16-16h48c8.822 0 16 7.178 16 16v320zm208-180v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm0 96v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm96-96v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm0 96v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12zm64-217.258V88.569a39.996 39.996 0 0 0-11.716-28.284l-48.569-48.569A39.996 39.996 0 0 0 391.431 0H200c-22.091 0-40 17.909-40 40v424c0 26.51 21.49 48 48 48h256c26.51 0 48-21.49 48-48V208c0-20.898-13.359-38.667-32-45.258zM192 40c0-4.411 3.589-8 8-8h184v40c0 13.203 10.797 24 24 24h40v96H192V40zm288 424c0 8.822-7.178 16-16 16H208c-8.822 0-16-7.178-16-16V224h288v240z"] };
var faFemale = { prefix: 'fal', iconName: 'female', icon: [256, 512, [], "f182", "M254.648 340.891l-39.909-164.276a48.18 48.18 0 0 0-16.794-26.583 47.458 47.458 0 0 0-4.554-3.208C207.438 131.225 216 110.594 216 88c0-48.523-39.477-88-88-88S40 39.477 40 88c0 22.594 8.562 43.225 22.609 58.824a47.405 47.405 0 0 0-4.554 3.208 48.184 48.184 0 0 0-16.794 26.583L1.352 340.891C-5.868 370.559 16.716 400 48.047 400H61v59c0 29.224 23.776 53 53 53h28c29.224 0 53-23.776 53-53v-59h12.952c31.329 0 53.917-29.436 46.696-59.109zM128 32c30.928 0 56 25.072 56 56s-25.072 56-56 56-56-25.072-56-56 25.072-56 56-56zm80 336h-45v91c0 11.598-9.402 21-21 21h-28c-11.598 0-21-9.402-21-21v-91H48c-10.259 0-17.877-9.539-15.602-19.546l40-164.454A16 16 0 0 1 88 171.546h12.351a88.015 88.015 0 0 0 55.299 0H168A16 16 0 0 1 183.602 184l40 164.454C225.876 358.458 218.262 368 208 368z"] };
var faFieldHockey = { prefix: 'fal', iconName: 'field-hockey', icon: [640, 512, [], "f44c", "M619.5 117.2L563.8 173 496 105.2l84.6-84.7c7.6-7.6 2.2-20.5-8.5-20.5h-11.3c-3.2 0-6.2 1.3-8.5 3.5L214.4 341.8c-29.4 29.5-75.5-14.8-45.2-45.2 31.2-31.2 31.2-81.9 0-113.1-31.2-31.2-81.7-31.3-113 0C19.9 219.7 0 267.9 0 319.2c0 106.5 86.1 191.9 191.8 191.9 89.4 0 134-54.5 164.1-84.7 12.3 50.4 58.4 87.7 113 85.5 57.9-2.3 104.8-49.3 107.2-107.3 2.2-54.6-35-100.8-85.4-113.1l145.9-146c2.2-2.3 3.5-5.3 3.5-8.5v-11.3c-.1-10.7-13-16.1-20.6-8.5zM191.8 479.1C103 479.1 32 407.3 32 319.2c0-42.8 16.6-82.9 46.8-113.2 18.7-18.8 49-18.8 67.8 0 18.7 18.7 18.7 49.2 0 67.9-24.9 24.9-24.9 65.5.1 90.6 25 24.9 65.5 24.9 90.3-.1l236.4-236.7 67.8 67.9-93.9 94.1c-48 7.4-85.7 45.2-93.1 93.2-50.1 50.2-84.5 96.2-162.4 96.2zM544.1 400c0 44.1-35.8 80-79.9 80s-79.9-35.9-79.9-80 35.8-80 79.9-80 79.9 35.9 79.9 80z"] };
var faFighterJet = { prefix: 'fal', iconName: 'fighter-jet', icon: [640, 512, [], "f0fb", "M526.785 195.932l-102.96-11.267L382.163 168H367.31L283.183 63.609C304.102 62.027 320 55.759 320 48c0-9-21.383-16-47.189-16H144v32h16v120h-1.63l-64-72H36.462L8 140.11v67.647l-8 .988v94.511l8 .988v67.647L36.462 400H94.37l64-72H160v120h-16v32h128.811c25.806 0 47.189-7 47.189-16 0-7.759-15.898-14.027-36.817-15.609L367.31 344h14.853l41.663-16.665 102.96-11.267C598.984 300.222 640 293.159 640 256c0-37.458-41.863-44.407-113.215-60.068zm-5.185 88.512L416 296l-40 16h-24L242.4 448H192V296h-48l-64 72H49.6l-9.6-9.481V304h8v-16h41.6v-5.926L32 274.963v-37.926l57.6-7.111V224H48v-16h-8v-54.519L49.6 144H80l64 72h48V64h50.4L352 200h24l40 16 105.6 11.556C608 246.519 608 251.185 608 256s0 9.481-86.4 28.444z"] };
var faFile = { prefix: 'fal', iconName: 'file', icon: [384, 512, [], "f15b", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16z"] };
var faFileAlt = { prefix: 'fal', iconName: 'file-alt', icon: [384, 512, [], "f15c", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zm-48-244v8c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12zm0 64v8c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12zm0 64v8c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12z"] };
var faFileArchive = { prefix: 'fal', iconName: 'file-archive', icon: [384, 512, [], "f1c6", "M369.941 97.941l-83.882-83.882A48 48 0 0 0 252.118 0H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48V131.882a48 48 0 0 0-14.059-33.941zM256 32.491a15.88 15.88 0 0 1 7.431 4.195l83.882 83.882a15.89 15.89 0 0 1 4.195 7.431H256V32.491zM352 464c0 8.837-7.164 16-16 16H48c-8.836 0-16-7.163-16-16V48c0-8.837 7.164-16 16-16h79.714v32h32V32H224v104c0 13.255 10.745 24 24 24h104v304zM192 96h-32V64h32v32zm-32 0v32h-32V96h32zm0 64v32h-32v-32h32zm32 0h-32v-32h32v32zm-9.838 96H160v-32h-32v32l-19.449 97.243C102.058 385.708 126.889 416 160 416c33.109 0 57.942-30.291 51.449-62.757l-17.519-87.596A12.001 12.001 0 0 0 182.162 256zM160.27 390.073c-17.918 0-32.444-12.105-32.444-27.036 0-14.932 14.525-27.036 32.444-27.036s32.444 12.104 32.444 27.036c0 14.931-14.526 27.036-32.444 27.036zM192 224h-32v-32h32v32z"] };
var faFileAudio = { prefix: 'fal', iconName: 'file-audio', icon: [384, 512, [], "f1c7", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zm-77.6-66.6c38.5-26 61.6-69.3 61.6-115.7 0-24.7-6.5-48.9-18.9-70.1-12-20.6-29.1-37.8-49.6-50-7.1-4.2-16.3-1.9-20.6 5.2-4.2 7.1-1.9 16.3 5.2 20.6 33.1 19.7 53.7 55.8 53.7 94.3 0 36.5-18.1 70.4-48.3 90.9-6.9 4.6-8.7 14-4 20.8 2.9 4.3 7.6 6.6 12.4 6.6 3.1 0 6-.8 8.5-2.6zm-26.6-38.3c26-17.3 41.5-46.2 41.5-77.4 0-32.9-17.7-63.7-46.2-80.3-7.2-4.2-16.3-1.7-20.5 5.4-4.2 7.2-1.7 16.3 5.4 20.5 19.3 11.2 31.3 32 31.3 54.3 0 21.1-10.5 40.7-28.1 52.4-6.9 4.6-8.8 13.9-4.2 20.8 2.9 4.4 7.7 6.7 12.5 6.7 2.8.1 5.7-.7 8.3-2.4zm-27-38.2c13.7-8.5 21.8-23.1 21.8-39.2 0-17-9.3-32.5-24.2-40.6-7.3-3.9-16.4-1.2-20.3 6.1-3.9 7.3-1.2 16.4 6.1 20.3 5.2 2.8 8.5 8.3 8.5 14.2 0 5.6-2.9 10.8-7.6 13.7-7 4.4-9.2 13.6-4.8 20.7 2.8 4.6 7.7 7.1 12.8 7.1 2.5 0 5.2-.7 7.7-2.3zM138 266.7v74.7L112 322H94v-36h18l26-19.3m17.9-50.7c-2.9 0-6 1.1-8.4 3.5L104 256H76c-6.6 0-12 5.4-12 12v72c0 6.6 5.4 12 12 12h28l43.5 36.5c2.4 2.4 5.4 3.5 8.4 3.5 6.2 0 12.1-4.8 12.1-12V228c0-7.2-5.9-12-12.1-12z"] };
var faFileCheck = { prefix: 'fal', iconName: 'file-check', icon: [384, 512, [], "f316", "M369.941 97.941l-83.882-83.882A48 48 0 0 0 252.118 0H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48V131.882a48 48 0 0 0-14.059-33.941zm-22.627 22.628a15.89 15.89 0 0 1 4.195 7.431H256V32.491a15.88 15.88 0 0 1 7.431 4.195l83.883 83.883zM336 480H48c-8.837 0-16-7.163-16-16V48c0-8.837 7.163-16 16-16h176v104c0 13.255 10.745 24 24 24h104v304c0 8.837-7.163 16-16 16zm-34.467-210.949l-134.791 133.71c-4.7 4.663-12.288 4.642-16.963-.046l-67.358-67.552c-4.683-4.697-4.672-12.301.024-16.985l8.505-8.48c4.697-4.683 12.301-4.672 16.984.024l50.442 50.587 117.782-116.837c4.709-4.671 12.313-4.641 16.985.068l8.458 8.527c4.672 4.709 4.641 12.313-.068 16.984z"] };
var faFileCode = { prefix: 'fal', iconName: 'file-code', icon: [384, 512, [], "f1c9", "M369.941 97.941l-83.882-83.882A48 48 0 0 0 252.118 0H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48V131.882a48 48 0 0 0-14.059-33.941zm-22.627 22.628a15.89 15.89 0 0 1 4.195 7.431H256V32.491a15.88 15.88 0 0 1 7.431 4.195l83.883 83.883zM336 480H48c-8.837 0-16-7.163-16-16V48c0-8.837 7.163-16 16-16h176v104c0 13.255 10.745 24 24 24h104v304c0 8.837-7.163 16-16 16zm-161.471-67.404l-25.928-7.527a5.1 5.1 0 0 1-3.476-6.32l58.027-199.869a5.1 5.1 0 0 1 6.32-3.476l25.927 7.527a5.1 5.1 0 0 1 3.476 6.32L180.849 409.12a5.1 5.1 0 0 1-6.32 3.476zm-48.446-47.674l18.492-19.724a5.101 5.101 0 0 0-.351-7.317L105.725 304l38.498-33.881a5.1 5.1 0 0 0 .351-7.317l-18.492-19.724a5.1 5.1 0 0 0-7.209-.233L57.61 300.279a5.1 5.1 0 0 0 0 7.441l61.263 57.434a5.1 5.1 0 0 0 7.21-.232zm139.043.232l61.262-57.434a5.1 5.1 0 0 0 0-7.441l-61.262-57.434a5.1 5.1 0 0 0-7.209.233l-18.492 19.724a5.101 5.101 0 0 0 .351 7.317L278.275 304l-38.499 33.881a5.1 5.1 0 0 0-.351 7.317l18.492 19.724a5.1 5.1 0 0 0 7.209.232z"] };
var faFileEdit = { prefix: 'fal', iconName: 'file-edit', icon: [384, 512, [], "f31c", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zM219.2 247.2l29.6 29.6c1.8 1.8 1.8 4.6 0 6.4L136.4 395.6l-30.1 4.3c-5.9.8-11-4.2-10.2-10.2l4.3-30.1 112.4-112.4c1.8-1.8 4.6-1.8 6.4 0zm64.4 1.2l-16.4 16.4c-1.8 1.8-4.6 1.8-6.4 0l-29.6-29.6c-1.8-1.8-1.8-4.6 0-6.4l16.4-16.4c5.9-5.9 15.4-5.9 21.2 0l14.8 14.8c5.9 5.8 5.9 15.3 0 21.2z"] };
var faFileExcel = { prefix: 'fal', iconName: 'file-excel', icon: [384, 512, [], "f1c3", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zM211.7 308l50.5-81.8c4.8-8-.9-18.2-10.3-18.2h-4.1c-4.1 0-7.9 2.1-10.1 5.5-31 48.5-36.4 53.5-45.7 74.5-17.2-32.2-8.4-16-45.8-74.5-2.2-3.4-6-5.5-10.1-5.5H132c-9.4 0-15.1 10.3-10.2 18.2L173 308l-59.1 89.5c-5.1 8 .6 18.5 10.1 18.5h3.5c4.1 0 7.9-2.1 10.1-5.5 37.2-58 45.3-62.5 54.4-82.5 31.5 56.7 44.3 67.2 54.4 82.6 2.2 3.4 6 5.4 10 5.4h3.6c9.5 0 15.2-10.4 10.1-18.4L211.7 308z"] };
var faFileExclamation = { prefix: 'fal', iconName: 'file-exclamation', icon: [384, 512, [], "f31a", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zM180.7 192h22.6c6.9 0 12.4 5.8 12 12.7l-6.7 120c-.4 6.4-5.6 11.3-12 11.3h-9.3c-6.4 0-11.6-5-12-11.3l-6.7-120c-.3-6.9 5.2-12.7 12.1-12.7zM220 384c0 15.5-12.5 28-28 28s-28-12.5-28-28 12.5-28 28-28 28 12.5 28 28z"] };
var faFileImage = { prefix: 'fal', iconName: 'file-image', icon: [384, 512, [], "f1c5", "M159 336l-39.5-39.5c-4.7-4.7-12.3-4.7-17 0l-39 39L63 448h256V304l-55.5-55.5c-4.7-4.7-12.3-4.7-17 0L159 336zm96-50.7l32 32V416H95.1l.3-67.2 15.6-15.6 48 48c20.3-20.3 77.7-77.6 96-95.9zM127 256c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm0-96c17.6 0 32 14.4 32 32s-14.4 32-32 32-32-14.4-32-32 14.4-32 32-32zm242.9-62.1L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zM256 32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5zM352 464c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304z"] };
var faFileMinus = { prefix: 'fal', iconName: 'file-minus', icon: [384, 512, [], "f318", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zm-60-160H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12z"] };
var faFilePdf = { prefix: 'fal', iconName: 'file-pdf', icon: [384, 512, [], "f1c1", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zm-22-171.2c-13.5-13.3-55-9.2-73.7-6.7-21.2-12.8-35.2-30.4-45.1-56.6 4.3-18 12-47.2 6.4-64.9-4.4-28.1-39.7-24.7-44.6-6.8-5 18.3-.3 44.4 8.4 77.8-11.9 28.4-29.7 66.9-42.1 88.6-20.8 10.7-54.1 29.3-58.8 52.4-3.5 16.8 22.9 39.4 53.1 6.4 9.1-9.9 19.3-24.8 31.3-45.5 26.7-8.8 56.1-19.8 82-24 21.9 12 47.6 19.9 64.6 19.9 27.7.1 28.9-30.2 18.5-40.6zm-229.2 89c5.9-15.9 28.6-34.4 35.5-40.8-22.1 35.3-35.5 41.5-35.5 40.8zM180 175.5c8.7 0 7.8 37.5 2.1 47.6-5.2-16.3-5-47.6-2.1-47.6zm-28.4 159.3c11.3-19.8 21-43.2 28.8-63.7 9.7 17.7 22.1 31.7 35.1 41.5-24.3 4.7-45.4 15.1-63.9 22.2zm153.4-5.9s-5.8 7-43.5-9.1c41-3 47.7 6.4 43.5 9.1z"] };
var faFilePlus = { prefix: 'fal', iconName: 'file-plus', icon: [384, 512, [], "f319", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zm-48-180v8c0 6.6-5.4 12-12 12h-68v68c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12v-68h-68c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h68v-68c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v68h68c6.6 0 12 5.4 12 12z"] };
var faFilePowerpoint = { prefix: 'fal', iconName: 'file-powerpoint', icon: [384, 512, [], "f1c4", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zM204.3 208H140c-6.6 0-12 5.4-12 12v184c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-60.4h44.3c38.7 0 67.7-27.3 67.7-69 0-38.6-23.8-66.6-67.7-66.6zm26 97.7c-7.5 7.6-17.8 11.4-31 11.4H160V233h39.7c12.9 0 23.1 3.7 30.6 11.1 15.3 15.1 15 46.5 0 61.6z"] };
var faFileTimes = { prefix: 'fal', iconName: 'file-times', icon: [384, 512, [], "f317", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zm-73.3-127.9c4.7 4.7 4.7 12.3 0 17l-5.7 5.7c-4.7 4.7-12.3 4.7-17 0l-48-48.2-48.1 48.1c-4.7 4.7-12.3 4.7-17 0l-5.7-5.7c-4.7-4.7-4.7-12.3 0-17l48.1-48.1-48.1-48.1c-4.7-4.7-4.7-12.3 0-17l5.7-5.7c4.7-4.7 12.3-4.7 17 0l48.1 48.1 48.1-48.1c4.7-4.7 12.3-4.7 17 0l5.7 5.7c4.7 4.7 4.7 12.3 0 17L214.6 304l48.1 48.1z"] };
var faFileVideo = { prefix: 'fal', iconName: 'file-video', icon: [384, 512, [], "f1c8", "M224 280.593C224 267.01 212.989 256 199.407 256H88.593C75.011 256 64 267.01 64 280.593v110.815C64 404.99 75.011 416 88.593 416h110.814C212.989 416 224 404.99 224 391.407V381l27.971 27.971a23.998 23.998 0 0 0 16.97 7.029H296c13.255 0 24-10.745 24-24V280c0-13.255-10.745-24-24-24h-27.059a24.003 24.003 0 0 0-16.97 7.029L224 291v-10.407zM192 384H96v-96h96v96zm80.255-96H288v96h-15.745L224 342.826v-13.652L272.255 288zm97.686-190.059l-83.883-83.882A47.996 47.996 0 0 0 252.118 0H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48V131.882a48 48 0 0 0-14.059-33.941zM256 32.491a15.888 15.888 0 0 1 7.432 4.195l83.882 83.882a15.882 15.882 0 0 1 4.195 7.431H256V32.491zM352 464c0 8.837-7.164 16-16 16H48c-8.836 0-16-7.163-16-16V48c0-8.837 7.164-16 16-16h176v104c0 13.255 10.745 24 24 24h104v304z"] };
var faFileWord = { prefix: 'fal', iconName: 'file-word', icon: [384, 512, [], "f1c2", "M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H256V32.5c2.8.7 5.3 2.1 7.4 4.2l83.9 83.9zM336 480H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zm-53.6-246.5c-6.8 32.8-32.5 139.7-33.4 150.3-5.8-29.1-.7 1.6-41.8-150.9-1.4-5.2-6.2-8.9-11.6-8.9h-6.4c-5.4 0-10.2 3.6-11.6 8.9-38.3 142.3-37.4 140.6-39.4 154.7-4.1-23.9 2.1-2.9-34.4-154.4-1.3-5.4-6.1-9.2-11.7-9.2h-7.2c-7.8 0-13.5 7.3-11.6 14.9 9.5 38 34.5 137.4 42.2 168 1.3 5.3 6.1 9.1 11.6 9.1h17c5.4 0 10.2-3.7 11.6-8.9 34.2-127.7 33.5-123.4 36.7-142.9 6.5 31.1.2 7 36.7 142.9 1.4 5.2 6.2 8.9 11.6 8.9h14c5.5 0 13.7-3.7 15.1-9l42.8-168c1.9-7.6-3.8-15-11.6-15h-6.8c-5.7 0-10.6 4-11.8 9.5z"] };
var faFilm = { prefix: 'fal', iconName: 'film', icon: [512, 512, [], "f008", "M488 64h-8v20c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12V64H96v20c0 6.6-5.4 12-12 12H44c-6.6 0-12-5.4-12-12V64h-8C10.7 64 0 74.7 0 88v336c0 13.3 10.7 24 24 24h8v-20c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v20h320v-20c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v20h8c13.3 0 24-10.7 24-24V88c0-13.3-10.7-24-24-24zM96 372c0 6.6-5.4 12-12 12H44c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm0-96c0 6.6-5.4 12-12 12H44c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm0-96c0 6.6-5.4 12-12 12H44c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm288 224c0 6.6-5.4 12-12 12H140c-6.6 0-12-5.4-12-12V284c0-6.6 5.4-12 12-12h232c6.6 0 12 5.4 12 12v120zm0-176c0 6.6-5.4 12-12 12H140c-6.6 0-12-5.4-12-12V108c0-6.6 5.4-12 12-12h232c6.6 0 12 5.4 12 12v120zm96 144c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm0-96c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm0-96c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40z"] };
var faFilmAlt = { prefix: 'fal', iconName: 'film-alt', icon: [512, 512, [], "f3a0", "M488 64h-8v20c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12V64H96v20c0 6.6-5.4 12-12 12H44c-6.6 0-12-5.4-12-12V64h-8C10.7 64 0 74.7 0 88v336c0 13.3 10.7 24 24 24h8v-20c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v20h320v-20c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v20h8c13.3 0 24-10.7 24-24V88c0-13.3-10.7-24-24-24zM96 372c0 6.6-5.4 12-12 12H44c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm0-96c0 6.6-5.4 12-12 12H44c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm0-96c0 6.6-5.4 12-12 12H44c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm288 224c0 6.6-5.4 12-12 12H140c-6.6 0-12-5.4-12-12V108c0-6.6 5.4-12 12-12h232c6.6 0 12 5.4 12 12v296zm96-32c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm0-96c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40zm0-96c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40z"] };
var faFilter = { prefix: 'fal', iconName: 'filter', icon: [512, 512, [], "f0b0", "M479.968 0H32.038C3.613 0-10.729 34.487 9.41 54.627L192 237.255V424a31.996 31.996 0 0 0 10.928 24.082l64 55.983c20.438 17.883 53.072 3.68 53.072-24.082V237.255L502.595 54.627C522.695 34.528 508.45 0 479.968 0zM288 224v256l-64-56V224L32 32h448L288 224z"] };
var faFire = { prefix: 'fal', iconName: 'fire', icon: [384, 512, [], "f06d", "M216 24.008c0-23.796-31.162-33.11-44.149-13.038C76.548 158.255 200 238.729 200 288c0 22.056-17.944 40-40 40s-40-17.944-40-40V182.126c0-19.388-21.854-30.757-37.731-19.684C30.754 198.379 0 257.279 0 320c0 105.869 86.131 192 192 192s192-86.131 192-192c0-170.29-168-192.853-168-295.992zM192 480c-88.224 0-160-71.776-160-160 0-46.944 20.68-97.745 56-128v96c0 39.701 32.299 72 72 72s72-32.299 72-72c0-65.106-112-128-45.411-248C208 160 352 175.3 352 320c0 88.224-71.776 160-160 160z"] };
var faFireExtinguisher = { prefix: 'fal', iconName: 'fire-extinguisher', icon: [448, 512, [], "f134", "M429.627 32.177l-160 24C254.178 58.494 256 74.414 256 80h-61.396C212.106 43.162 185.315 0 144 0c-43.131 0-69.629 46.603-48.775 83.504-42.891 9.634-75.08 39.064-94.077 86.554-3.282 8.205.708 17.517 8.913 20.798 8.21 3.282 17.518-.713 20.798-8.913C62.582 102.637 120.434 112 176 112v33.353c-45.574 7.763-80 48.123-80 95.853V488c0 13.255 10.745 24 24 24h144c13.255 0 24-10.745 24-24V240c0-47.566-34.599-87.046-80-94.665V112h48c0 4.893-2.181 21.452 13.627 23.823l160 24C439.275 161.264 448 153.803 448 144V48c0-9.775-8.695-17.269-18.373-15.823zM256 240v240H128V241.205c0-35.694 28.49-64.944 63.501-65.203L192 176c35.29 0 64 28.71 64 64zM144 32c13.234 0 24 10.766 24 24s-10.766 24-24 24-24-10.766-24-24 10.766-24 24-24zm272 93.421l-128-19.2V85.779l128-19.2v58.842z"] };
var faFlag = { prefix: 'fal', iconName: 'flag', icon: [512, 512, [], "f024", "M344.348 74.667C287.742 74.667 242.446 40 172.522 40c-28.487 0-53.675 5.322-76.965 14.449C99.553 24.713 75.808-1.127 46.071.038 21.532.999 1.433 20.75.076 45.271-1.146 67.34 12.553 86.382 32 93.258V500c0 6.627 5.373 12 12 12h8c6.627 0 12-5.373 12-12V378.398c31.423-14.539 72.066-29.064 135.652-29.064 56.606 0 101.902 34.667 171.826 34.667 51.31 0 91.933-17.238 130.008-42.953 6.589-4.45 10.514-11.909 10.514-19.86V59.521c0-17.549-18.206-29.152-34.122-21.76-36.78 17.084-86.263 36.906-133.53 36.906zM48 28c11.028 0 20 8.972 20 20s-8.972 20-20 20-20-8.972-20-20 8.972-20 20-20zm432 289.333C456.883 334.03 415.452 352 371.478 352c-63.615 0-108.247-34.667-171.826-34.667-46.016 0-102.279 10.186-135.652 26V106.667C87.117 89.971 128.548 72 172.522 72c63.615 0 108.247 34.667 171.826 34.667 45.92 0 102.217-18.813 135.652-34.667v245.333z"] };
var faFlagCheckered = { prefix: 'fal', iconName: 'flag-checkered', icon: [512, 512, [], "f11e", "M156.8 88.82v72.42c-29.93 4.38-60.57 14.83-76.8 25.05v-71.12c18.2-11.46 46.11-23.21 76.8-26.35zm153.6 30.91c-27.734-4.686-52.298-14.151-76.8-21.39v67.88c25.344 6.659 49.648 16.44 76.8 22.39v-68.88zm-153.6 41.51v70.86c34.246-3.608 56.161-1.708 76.8 2.48v-68.36c-29.688-7.81-51.305-8.712-76.8-4.98zm76.8 143.03c27.652 4.677 51.957 14.03 76.8 21.39v-68.91c-25.056-6.914-49.602-16.632-76.8-22.17v69.69zM80 319.85c23.07-7.66 50.33-13.11 76.8-16.03V232.1c-26.02 2.73-52.02 8.41-76.8 16.64v71.11zM464 96.32c-22.55 8.89-49.72 17.36-76.8 22.2v72.62c26.78-4.4 51.66-13.8 76.8-23.71V96.32zm0 212.51v-71.12c-16.85 10.61-46.81 21.47-76.8 25.52v71.95c30.69-3.14 58.6-14.89 76.8-26.35zM310.4 188.61v68.14c27.533 7.597 49.745 10.124 76.8 6.48v-72.09c-24.374 4.038-48.648 3.636-76.8-2.53zM477.878 37.762C493.794 30.369 512 41.972 512 59.521v261.666c0 7.951-3.925 15.41-10.514 19.86C463.411 366.762 422.789 384 371.478 384c-69.924 0-115.22-34.667-171.826-34.667-63.586 0-104.229 14.525-135.652 29.064V500c0 6.627-5.373 12-12 12h-8c-6.627 0-12-5.373-12-12V93.258C12.553 86.382-1.146 67.34.076 45.271 1.433 20.75 21.532.999 46.071.038c29.737-1.165 53.482 24.675 49.485 54.411C118.847 45.322 144.035 40 172.522 40c69.924 0 115.22 34.667 171.826 34.667 47.267 0 96.75-19.822 133.53-36.905zM28 48c0 11.028 8.972 20 20 20s20-8.972 20-20-8.972-20-20-20-20 8.972-20 20zm452 24c-33.436 15.854-89.732 34.667-135.652 34.667C280.769 106.667 236.137 72 172.522 72 128.548 72 87.117 89.971 64 106.667v236.667c33.373-15.814 89.636-26 135.652-26 63.579 0 108.211 34.667 171.826 34.667 43.973 0 85.405-17.97 108.522-34.667V72z"] };
var faFlask = { prefix: 'fal', iconName: 'flask', icon: [448, 512, [], "f0c3", "M434.9 410.7L288 218.6V32h26c3.3 0 6-2.7 6-6V6c0-3.3-2.7-6-6-6H134c-3.3 0-6 2.7-6 6v20c0 3.3 2.7 6 6 6h26v186.6L13.1 410.7C-18.6 452.2 11 512 63.1 512h321.8c52.2 0 81.7-59.8 50-101.3zm-50 69.3H63.1c-25.7 0-40.3-29.4-24.6-49.8l150.2-196.5c2.1-2.8 3.3-6.2 3.3-9.7V32h64v192c0 3.5 1.2 6.9 3.3 9.7l150.2 196.5c15.6 20.4 1.2 49.8-24.6 49.8z"] };
var faFolder = { prefix: 'fal', iconName: 'folder', icon: [512, 512, [], "f07b", "M464 128H272l-64-64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V176c0-26.51-21.49-48-48-48zm16 272c0 8.837-7.163 16-16 16H48c-8.837 0-16-7.163-16-16V112c0-8.837 7.163-16 16-16h146.745l64 64H464c8.837 0 16 7.163 16 16v224z"] };
var faFolderOpen = { prefix: 'fal', iconName: 'folder-open', icon: [576, 512, [], "f07c", "M527.95 224H480v-48c0-26.51-21.49-48-48-48H272l-64-64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h385.057c28.068 0 54.135-14.733 68.599-38.84l67.453-112.464C588.24 264.812 565.285 224 527.95 224zM48 96h146.745l64 64H432c8.837 0 16 7.163 16 16v48H171.177c-28.068 0-54.135 14.733-68.599 38.84L32 380.47V112c0-8.837 7.163-16 16-16zm493.695 184.232l-67.479 112.464A47.997 47.997 0 0 1 433.057 416H44.823l82.017-136.696A48 48 0 0 1 168 256h359.975c12.437 0 20.119 13.568 13.72 24.232z"] };
var faFont = { prefix: 'fal', iconName: 'font', icon: [448, 512, [], "f031", "M232.594 32h-17.187a11.998 11.998 0 0 0-11.239 7.796L51.473 448H28c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h88c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H87.913l44.651-120.46h182.253L360.063 448H332c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h88c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-23.473L243.833 39.796A12 12 0 0 0 232.594 32zm-87.958 263.34l75.696-201.241c1.5-3.857 2.714-7.827 3.668-11.427.95 3.589 2.159 7.544 3.651 11.382l75.098 201.286H144.636z"] };
var faFootballBall = { prefix: 'fal', iconName: 'football-ball', icon: [496, 512, [], "f44e", "M344.2 182.5l-28.3 28.3 28.3 28.3c3.1 3.1 3.1 8.2 0 11.3l-11.3 11.3c-3.1 3.1-8.2 3.1-11.3 0l-28.3-28.3-22.7 22.6 28.3 28.3c3.1 3.1 3.1 8.2 0 11.3l-11.3 11.3c-3.1 3.1-8.2 3.1-11.3 0L248 278.6l-22.6 22.6 28.3 28.3c3.1 3.1 3.1 8.2 0 11.3l-11.3 11.3c-3.1 3.1-8.2 3.1-11.3 0l-28.3-28.3-28.3 28.3c-3.1 3.1-8.2 3.1-11.3 0l-11.3-11.3c-3.1-3.1-3.1-8.2 0-11.3l28.3-28.3-28.4-28.2c-3.1-3.1-3.1-8.2 0-11.3l11.3-11.3c3.1-3.1 8.2-3.1 11.3 0l28.3 28.3 22.6-22.6-28.3-28.3c-3.1-3.1-3.1-8.2 0-11.3l11.3-11.3c3.1-3.1 8.2-3.1 11.3 0l28.3 28.3 22.6-22.6-28.3-28.3c-3.1-3.1-3.1-8.2 0-11.3l11.3-11.3c3.1-3.1 8.2-3.1 11.3 0l28.3 28.3 28.3-28.3c3.1-3.1 8.2-3.1 11.3 0l11.3 11.3c3.3 3 3.3 8 .2 11.2zm57.3 227.2C263.6 547.9 75.7 495.3 51.9 488.9c-18.2-4.9-32.4-19.1-37.2-37.3-17.1-64.7-42.9-226.4 79.8-349.3C232.4-35.9 420.3 16.7 444.1 23.1c18.2 4.9 32.4 19.1 37.2 37.3 17.1 64.7 42.9 226.4-79.8 349.3zM435.9 54c-20.3-5.4-50.8-11.4-86.3-13.2l113.9 113.9c-1.6-35.7-7.7-66.1-13-86.1-1.9-7.1-7.5-12.7-14.6-14.6zM60.1 458c20.3 5.4 50.8 11.4 86.3 13.2L32.6 357.3c1.6 35.7 7.7 66.1 13 86.1 1.8 7.1 7.4 12.7 14.5 14.6zm402.7-258.8L304.6 41.1c-74.2 5.3-137.2 33.3-187.5 83.7-58.4 58.5-79.3 127.3-83.9 187.9l158.1 158.1c74.2-5.3 137.2-33.3 187.5-83.7 58.5-58.4 79.4-127.2 84-187.9z"] };
var faFootballHelmet = { prefix: 'fal', iconName: 'football-helmet', icon: [512, 512, [], "f44f", "M480 320H355.5l-15.2-76 136.8-17.8c9-1.2 15.6-9.8 13.9-18.7C468.4 93.8 368.3 8 248 8 114.9 8 18.2 109.5 2.6 219.9-7.6 292 13.3 361.2 53.7 412.1c3.1 3.9 7.8 6.1 12.8 6.1H120l85.7 42.9c9.3 4.7 19.4 6.9 29.3 6.9 46.5 0 78.1-49.2 60.9-92.1l-9.5-23.9h42.9l9.5 49.4c9.5 47.4 48 83.2 95.9 89.2 44 5.5 42.5 5.4 45.3 5.4 22.5 0 32-19.7 32-32V352c0-17.7-14.3-32-32-32zm-206.4 0l-10.3-25.7c-17.9-44.9 45.1-46.2 45.2-46.2l14.4 71.9h-49.3zm11.2-101.1c-41.4 5.4-66.7 48.4-51.2 87.2l32.6 83.7c5 12.5 2.1 26.7-7.4 36.2-12.8 12.8-29.3 11-38.8 6.3-88.6-44.3-82.9-43.6-92.5-48.4H74.1c-33.9-45.8-48-102.2-39.9-159.6C47.5 130.6 131.2 40 248 40c96.8 0 181.4 64.9 207.5 156.7l-170.7 22.2zM480 464l-41.3-5.2c-25.9-3.2-48-18.7-60.1-40.7H480V464zm0-80H368.3l-6.4-32H480v32zm-304-72c-13.3 0-24 10.7-24 24s10.7 24 24 24 24-10.7 24-24-10.7-24-24-24z"] };
var faForward = { prefix: 'fal', iconName: 'forward', icon: [512, 512, [], "f04e", "M244.5 230.9L52.5 71.4C31.9 54.3 0 68.6 0 96v320c0 27.4 31.9 41.8 52.5 24.6l192-160.5c15.3-12.9 15.3-36.5 0-49.2zM224 255.4L32 416V96l192 159.4zm276.5-24.5l-192-159.4C287.9 54.3 256 68.6 256 96v320c0 27.4 31.9 41.8 52.5 24.6l192-160.5c15.3-12.9 15.3-36.5 0-49.2zM480 255.4L288 416V96l192 159.4z"] };
var faFrown = { prefix: 'fal', iconName: 'frown', icon: [512, 512, [], "f119", "M368 192c0 26.51-21.49 48-48 48s-48-21.49-48-48a47.789 47.789 0 0 1 5.647-22.603v.015c0 10.916 8.849 19.765 19.765 19.765s19.765-8.849 19.765-19.765-8.849-19.765-19.765-19.765h-.015A47.789 47.789 0 0 1 320 144c26.51 0 48 21.49 48 48zm-176-48a47.789 47.789 0 0 0-22.603 5.647h.015c10.916 0 19.765 8.849 19.765 19.765s-8.849 19.765-19.765 19.765-19.765-8.849-19.765-19.765v-.015A47.789 47.789 0 0 0 144 192c0 26.51 21.49 48 48 48s48-21.49 48-48-21.49-48-48-48zm176.551 212.661c-59.124-91.452-165.846-91.599-225.064 0-11.502 17.79 15.381 35.148 26.873 17.373 46.626-72.119 124.864-71.854 171.318 0 11.327 17.525 38.547.684 26.873-17.373zM256 40C136.055 40 40 137.336 40 256c0 119.945 97.336 216 216 216 119.945 0 216-97.336 216-216 0-119.945-97.336-216-216-216m0-32c136.967 0 248 111.033 248 248S392.967 504 256 504 8 392.967 8 256 119.033 8 256 8z"] };
var faFutbol = { prefix: 'fal', iconName: 'futbol', icon: [496, 512, [], "f1e3", "M483.7 179.4C449.7 74.6 352.5 8 248.1 8 81.2 8-40 171.4 12.3 332.6 46.3 437.4 143.7 504 248 504c166.9 0 288-163.4 235.7-324.6zm-43 173.7l-94.3 11.6-17.8-24.9 33.7-104.1 28.9-9 69.6 65c-3.6 21.1-10.3 41.8-20.1 61.4zM35.6 291.5l69.4-64.9 28.9 9 33.9 103.7-18.1 25.2-94.2-11.6c-13-26-17.2-45.2-19.9-61.4zm196.5-180.7v32.9L146.2 206l-31.5-9.8-18-93.9c15.3-15.1 32.8-27.8 52-37.8l83.4 46.3zm149.4 85.4L350 206l-85.9-62.3v-32.9l83.6-46.4c19.1 10 36.7 22.7 52 37.9l-18.2 93.9zm-215.4 35l82-59.5 82.1 59.6-31.1 96H197.5l-31.4-96.1zm297.7 19.5L412.7 203l13.3-68.3c34.5 50.8 37.3 97.2 37.8 116zM309.2 49.2l-61.1 33.9-61-33.8c71.5-21.2 122-.1 122.1-.1zM70.3 134.1L83.5 203l-51.1 47.5c.8-31.8 8.7-63.4 23.6-92.6 4.2-8.3 9.1-16.2 14.3-23.8zm7.5 254l68.7 8.4 29.2 62.7c-38.8-13.8-72.7-38.5-97.9-71.1zm137.9 81.3l-40.1-86 17.4-24.2h110.2l17.3 24.2-40.1 86c-22.7 3.5-42.4 3.4-64.7 0zm104.8-10.2l29.2-62.7 69-8.5c-25 32.6-58.8 57.1-98.2 71.2z"] };
var faGamepad = { prefix: 'fal', iconName: 'gamepad', icon: [640, 512, [], "f11b", "M472 120c75.2 0 136 60.8 136 136s-60.8 136-136 136c-42.1 0-80-24-97-40H265c-17 16-43.1 40-97 40-75.2 0-136-60.8-136-136s60.8-136 136-136h304m0-32H168C75.2 88 0 163.2 0 256s75.2 168 168 168c41.5 0 79.5-15.1 108.8-40h86.4c29.3 24.9 67.3 40 108.8 40 92.8 0 168-75.2 168-168S564.8 88 472 88zm40 100c-19.9 0-36 16.1-36 36s16.1 36 36 36 36-16.1 36-36-16.1-36-36-36zm-64 64c-19.9 0-36 16.1-36 36s16.1 36 36 36 36-16.1 36-36-16.1-36-36-36zm-268-16v-46c0-3.3-2.7-6-6-6h-28c-3.3 0-6 2.7-6 6v46H94c-3.3 0-6 2.7-6 6v28c0 3.3 2.7 6 6 6h46v46c0 3.3 2.7 6 6 6h28c3.3 0 6-2.7 6-6v-46h46c3.3 0 6-2.7 6-6v-28c0-3.3-2.7-6-6-6h-46z"] };
var faGavel = { prefix: 'fal', iconName: 'gavel', icon: [512, 512, [], "f0e3", "M500.892 186.561l-20.633-20.643c-12.912-12.912-32.416-14.337-46.732-5.448L351.53 78.474c8.888-14.315 7.465-33.82-5.448-46.731L325.44 11.108c-14.808-14.808-38.781-14.813-53.592 0L158.315 124.633c-14.774 14.775-14.774 38.815 0 53.591l20.643 20.644c12.659 12.657 32.118 14.473 46.725 5.439l29.692 29.692-58.803 58.803-8.082-8.082c-16.933-16.934-44.484-16.932-61.417 0L12.699 399.073c-16.932 16.933-16.932 44.484 0 61.417l38.81 38.811c16.931 16.932 44.482 16.933 61.417 0L227.28 384.927c16.932-16.933 16.932-44.484 0-61.417l-8.081-8.081 58.803-58.803 29.692 29.692c-9.031 14.607-7.218 34.067 5.44 46.725l20.643 20.643c14.776 14.776 38.815 14.776 53.591 0l113.525-113.533c14.808-14.809 14.811-38.781-.001-53.592zM204.653 362.3L90.3 476.652c-4.456 4.458-11.707 4.457-16.163 0v.001l-38.79-38.79c-4.456-4.456-4.456-11.707 0-16.163L149.7 307.348c4.456-4.457 11.706-4.458 16.162-.001l38.79 38.79c4.456 4.456 4.456 11.707.001 16.163zm273.62-144.776L364.74 331.058a5.896 5.896 0 0 1-8.337 0l-20.643-20.643a5.902 5.902 0 0 1-.001-8.336l16.478-16.474-125.842-125.841-16.474 16.475a5.902 5.902 0 0 1-8.336.001l-20.643-20.643a5.903 5.903 0 0 1 0-8.337L294.476 33.727a5.896 5.896 0 0 1 8.337 0l20.643 20.644a5.893 5.893 0 0 1-.001 8.336l-16.472 16.475L432.82 205.019l16.477-16.473a5.893 5.893 0 0 1 8.335 0l20.643 20.643v.001a5.893 5.893 0 0 1-.002 8.334z"] };
var faGem = { prefix: 'fal', iconName: 'gem', icon: [576, 512, [], "f3a5", "M463.7 0H112.3c-4.2 0-8.1 2.2-10.3 5.8L1.7 168.6c-2.7 4.4-2.2 10.1 1.2 14l276 325.2c4.8 5.6 13.4 5.6 18.2 0l276-325.2c3.4-3.9 3.8-9.6 1.2-14L474 5.8c-2.2-3.6-6.1-5.8-10.3-5.8zm-13.6 36l74.3 124h-83L384.6 36h65.5zM345 36l56.8 124H174.1L231 36h114zm-219.1 0h65.5l-56.8 124h-83l74.3-124zM61.2 192h73L216 384 61.2 192zm112 0h229.5L288 455.8 173.2 192zM360 384l81.8-192h73L360 384z"] };
var faGenderless = { prefix: 'fal', iconName: 'genderless', icon: [288, 512, [], "f22d", "M144 144c61.9 0 112 50 112 112 0 61.9-50 112-112 112-61.9 0-112-50-112-112 0-61.9 50-112 112-112m0-32C64.5 112 0 176.5 0 256s64.5 144 144 144 144-64.5 144-144-64.5-144-144-144z"] };
var faGift = { prefix: 'fal', iconName: 'gift', icon: [512, 512, [], "f06b", "M488 160h-72.044C426.024 146.62 432 129.996 432 112c0-44.112-35.888-80-80-80-49.048 0-75.315 34.969-94.543 80.224C239.098 66.478 209.724 32 160 32c-44.112 0-80 35.888-80 80 0 17.996 5.976 34.62 16.044 48H24c-13.255 0-24 10.745-24 24v112c0 13.255 10.745 24 24 24h8v112c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V320h8c13.255 0 24-10.745 24-24V184c0-13.255-10.745-24-24-24zM352 64c26.468 0 48 21.532 48 48s-21.532 48-48 48h-80c24-88 57.025-96 80-96zm-240 48c0-26.468 21.533-48 48-48 15.228 0 54.856.003 80 96h-80c-26.467 0-48-21.532-48-48zM32 288v-96h160v96H32zm48 160c-8.822 0-16-7.178-16-16V320h128v128H80zm144 0V192h64v256h-64zm224-16c0 8.822-7.178 16-16 16H320V320h128v112zm32-144H320v-96h160v96z"] };
var faGlassMartini = { prefix: 'fal', iconName: 'glass-martini', icon: [512, 512, [], "f000", "M508 26.6C517.1 16.3 509.7 0 496 0H16C2.3 0-5.1 16.3 4 26.6L240 294v186H122c-14.4 0-26 11.6-26 26 0 3.3 2.7 6 6 6h308c3.3 0 6-2.7 6-6 0-14.4-11.6-26-26-26H272V294L508 26.6zM460.5 32L256 263.8 51.5 32h409z"] };
var faGlobe = { prefix: 'fal', iconName: 'globe', icon: [512, 512, [], "f0ac", "M504 256C504 118.815 392.705 8 256 8 119.371 8 8 118.74 8 256c0 136.938 111.041 248 248 248 136.886 0 248-110.987 248-248zm-41.625 64h-99.434c6.872-42.895 6.6-86.714.055-128h99.38c12.841 41.399 12.843 86.598-.001 128zM256.001 470.391c-30.732-27.728-54.128-69.513-67.459-118.391h134.917c-13.332 48.887-36.73 90.675-67.458 118.391zM181.442 320c-7.171-41.387-7.349-85.537.025-128h149.067c7.371 42.453 7.197 86.6.025 128H181.442zM256 41.617c33.557 30.295 55.554 74.948 67.418 118.383H188.582c11.922-43.649 33.98-88.195 67.418-118.383zM449.544 160h-93.009c-10.928-44.152-29.361-83.705-53.893-114.956C366.825 59.165 420.744 101.964 449.544 160zM209.357 45.044C184.826 76.293 166.393 115.847 155.464 160H62.456C91.25 101.975 145.162 59.169 209.357 45.044zM49.625 192h99.38c-6.544 41.28-6.818 85.1.055 128H49.625c-12.842-41.399-12.844-86.598 0-128zm12.831 160h93.122c11.002 44.176 29.481 83.824 53.833 114.968C144.875 452.786 91.108 409.738 62.456 352zm240.139 114.966c24.347-31.138 42.825-70.787 53.827-114.966h93.121c-28.695 57.827-82.504 100.802-146.948 114.966z"] };
var faGolfBall = { prefix: 'fal', iconName: 'golf-ball', icon: [416, 512, [], "f450", "M416 208C416 91.7 320.5-2.3 203.7 0 91.6 2.3.9 94.2 0 206.3-.5 273.5 31 333 80 371.4V416c0 26.5 21.5 48 48 48 7.3 0 32-4 32 16v26c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6v-26c0-26.5-21.5-48-48-48-7.3 0-32 4-32-16v-16h192v16c0 20-24.6 16-32 16-26.5 0-48 21.5-48 48v26c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6v-26c0-20 24.6-16 32-16 26.5 0 48-21.5 48-48v-44.6c48.6-38 80-96.9 80-163.4zm-384 0c0-97 79-176 176-176s176 79 176 176c0 71-42.4 132.2-103.1 160H135.1C74.4 340.2 32 279 32 208zm240 14.9c0 18.3-14.8 33.1-33.1 33.1-14.4 0-26.3-9.3-30.9-22.1 26.3 9.4 51.5-15.2 41.9-41.9 12.8 4.6 22.1 16.5 22.1 30.9zm80 16c0 18.3-14.8 33.1-33.1 33.1-14.4 0-26.3-9.3-30.9-22.1 26.3 9.4 51.5-15.2 41.9-41.9 12.8 4.6 22.1 16.5 22.1 30.9zm-64 64c0 18.3-14.8 33.1-33.1 33.1-14.4 0-26.3-9.3-30.9-22.1 26.3 9.4 51.5-15.2 41.9-41.9 12.8 4.6 22.1 16.5 22.1 30.9z"] };
var faGolfClub = { prefix: 'fal', iconName: 'golf-club', icon: [640, 512, [], "f451", "M633.2 6.4l-10.8-5.2c-6-2.9-13.1-.4-16 5.6L473 280.7C44 200.2 72.8 205.1 63.9 205.1c-34.5 0-63.9 28-63.9 64V448c0 35.3 28.7 64 64 64h299.1c24.6 0 47-14.1 57.7-36.3l218-453.3c2.9-5.9.4-13.1-5.6-16zm-183.9 323L393.5 444c-10.7 22-33.1 36-57.5 36H64c-17.7 0-32-14.3-32-32v-16h88c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8H32v-64h88c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8H32v-34.9c0-17.7 14.3-32 31.9-32 4.5 0-19.7-4.3 374 69.6 10.4 1.9 16.1 13.2 11.4 22.7z"] };
var faGraduationCap = { prefix: 'fal', iconName: 'graduation-cap', icon: [640, 512, [], "f19d", "M612.36 147.3L350.13 68.245a109.032 109.032 0 0 0-60.26.001L27.654 147.298c-36.977 10.833-36.767 62.633 0 73.404l27.795 8.38c-3.379 10.658-4.673 21.949-5.155 34.504C41.765 268.385 36 277.517 36 288c0 10.386 5.659 19.445 14.058 24.278L40.025 439.37C39.658 444.018 43.333 448 48 448h32c4.663 0 8.342-3.979 7.975-8.63L77.942 312.278C86.341 307.445 92 298.386 92 288c0-10.24-5.499-19.191-13.703-24.074.428-10.309 1.485-18.935 4.045-26.737l58.777 17.72C135.113 294.952 128 342.606 128 343.68 128 402.549 260.642 416 320 416c59.369 0 192-13.454 192-72.32 0-1.071-7.111-48.725-13.117-88.77L612.36 220.7c36.886-10.812 36.82-62.607 0-73.4zM479.915 344.31C472 368 400 384 320 384s-152-16-159.916-39.69l12.009-80.062 117.776 35.507a109.041 109.041 0 0 0 60.26.001l117.776-35.506c5.1 33.986 10.744 71.616 12.01 80.06zm123.317-154.313l-262.035 79.037a77.076 77.076 0 0 1-42.398-.001l-261.876-78.99-.156-.046c-6.345-1.845-6.352-10.147 0-11.994l262.032-79.036a77.094 77.094 0 0 1 42.398-.001l261.88 78.991.155.046c6.345 1.845 6.353 10.147 0 11.994z"] };
var faHSquare = { prefix: 'fal', iconName: 'h-square', icon: [448, 512, [], "f0fd", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zm-80-292v232c0 6.627-5.373 12-12 12h-8c-6.627 0-12-5.373-12-12V272H144v100c0 6.627-5.373 12-12 12h-8c-6.627 0-12-5.373-12-12V140c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v100h160V140c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12z"] };
var faH1 = { prefix: 'fal', iconName: 'h1', icon: [608, 512, [], "f313", "M224.121 114.075V108c0-6.627 5.373-12 12-12h94.176c6.627 0 12 5.373 12 12v6.075c0 6.627-5.373 12-12 12h-29.354v259.85h29.354c6.627 0 12 5.373 12 12V404c0 6.627-5.373 12-12 12h-94.176c-6.627 0-12-5.373-12-12v-6.075c0-6.627 5.373-12 12-12h29.354V271.262H86.534v114.663h29.354c6.627 0 12 5.373 12 12V404c0 6.627-5.373 12-12 12H21.711c-6.627 0-12-5.373-12-12v-6.075c0-6.627 5.373-12 12-12h29.354v-259.85H21.711c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h94.177c6.627 0 12 5.373 12 12v6.075c0 6.627-5.373 12-12 12H86.534v114.214h178.941V126.075h-29.354c-6.627 0-12-5.373-12-12zM509.59 96h-14.648a12 12 0 0 0-8.458 3.488l-61.51 61.123c-4.674 4.645-4.729 12.19-.122 16.901l5.776 5.907c4.67 4.776 12.342 4.819 17.065.096l26.537-26.537c6.537-6.304 10.589-11.199 13-14.505-.108 3.229-.21 7.435-.21 11.715v229.939H428c-6.627 0-12 5.373-12 12V404c0 6.627 5.373 12 12 12h151.262c6.627 0 12-5.373 12-12v-7.873c0-6.627-5.373-12-12-12H521.59V108c0-6.627-5.373-12-12-12z"] };
var faH2 = { prefix: 'fal', iconName: 'h2', icon: [608, 512, [], "f314", "M435.784 384.264H588c6.627 0 12 5.373 12 12V404c0 6.627-5.373 12-12 12H410.208c-6.177 0-11.337-4.687-11.945-10.834-.336-3.398-.523-7.038-.523-11.3 0-111.663 161.125-126.537 161.125-209.911 0-34.401-26.051-58.428-63.352-58.428-25.584 0-48.808 14.904-63.291 34.198-3.861 5.144-11.015 6.46-16.351 2.869l-7.143-4.808c-5.522-3.717-6.925-11.192-3.216-16.719C424.329 113.025 458.799 92 497.303 92c60.832 0 97.773 39.595 97.773 90.165 0 105.913-156.302 121.77-159.292 202.099zM236.121 126.075h29.354v114.214H86.534V126.075h29.354c6.627 0 12-5.373 12-12V108c0-6.627-5.373-12-12-12H21.711c-6.627 0-12 5.373-12 12v6.075c0 6.627 5.373 12 12 12h29.354v259.85H21.711c-6.627 0-12 5.373-12 12V404c0 6.627 5.373 12 12 12h94.177c6.627 0 12-5.373 12-12v-6.075c0-6.627-5.373-12-12-12H86.534V271.262h178.941v114.663h-29.354c-6.627 0-12 5.373-12 12V404c0 6.627 5.373 12 12 12h94.176c6.627 0 12-5.373 12-12v-6.075c0-6.627-5.373-12-12-12h-29.354v-259.85h29.354c6.627 0 12-5.373 12-12V108c0-6.627-5.373-12-12-12h-94.176c-6.627 0-12 5.373-12 12v6.075c0 6.627 5.373 12 12 12z"] };
var faH3 = { prefix: 'fal', iconName: 'h3', icon: [608, 512, [], "f315", "M600 319.542C600 375.874 553.71 420 494.617 420c-36.736 0-72.278-16.619-94.513-36.905-4.653-4.245-5.209-11.373-1.298-16.31l6.327-7.984c4.283-5.405 12.245-6.116 17.377-1.509 18.784 16.867 45.438 29.182 71.66 29.182 37.168 0 70.065-27.476 70.065-66.037 0-41.992-35.653-65.142-77.226-65.142h-14.8a12 12 0 0 1-11.085-7.404l-2.699-6.509a12.001 12.001 0 0 1 1.961-12.391l74.788-87.534c5.276-6.109 10.424-11.405 13.58-14.552-4.27.384-11.339.832-21.016.832H419.585c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h163.939c6.627 0 12 5.373 12 12v6.846a12 12 0 0 1-2.937 7.865L503.659 225.19C555.885 229.715 600 261.409 600 319.542zM236.121 126.075h29.354v114.214H86.534V126.075h29.354c6.627 0 12-5.373 12-12V108c0-6.627-5.373-12-12-12H21.711c-6.627 0-12 5.373-12 12v6.075c0 6.627 5.373 12 12 12h29.354v259.85H21.711c-6.627 0-12 5.373-12 12V404c0 6.627 5.373 12 12 12h94.177c6.627 0 12-5.373 12-12v-6.075c0-6.627-5.373-12-12-12H86.534V271.262h178.941v114.663h-29.354c-6.627 0-12 5.373-12 12V404c0 6.627 5.373 12 12 12h94.176c6.627 0 12-5.373 12-12v-6.075c0-6.627-5.373-12-12-12h-29.354v-259.85h29.354c6.627 0 12-5.373 12-12V108c0-6.627-5.373-12-12-12h-94.176c-6.627 0-12 5.373-12 12v6.075c0 6.627 5.373 12 12 12z"] };
var faHandLizard = { prefix: 'fal', iconName: 'hand-lizard', icon: [576, 512, [], "f258", "M558.232 297.931L406.298 61.41C394.468 42.994 374.338 32 352.45 32H48C21.532 32 0 53.532 0 80v8c0 39.701 32.299 72 72 72h216.103l-23.189 58.93a7.954 7.954 0 0 1-7.444 5.07H144c-44.112 0-80 35.888-80 80 0 26.468 21.532 48 48 48h125.848a31.98 31.98 0 0 1 16.822 4.778l93.536 57.799a7.948 7.948 0 0 1 3.794 6.805V480h224V358.463c0-21.506-6.144-42.439-17.768-60.532zM544 448H384v-26.618c0-13.966-7.093-26.687-18.973-34.027l-93.537-57.799A63.96 63.96 0 0 0 237.847 320H112c-8.822 0-16-7.178-16-16 0-26.468 21.532-48 48-48h113.469c16.551 0 31.161-9.952 37.222-25.353l25.34-64.394c7.227-18.362-6.334-38.254-26.055-38.254H72c-22.056 0-40-17.944-40-40v-8c0-8.822 7.178-16 16-16h304.45c10.943 0 21.009 5.497 26.924 14.705l151.935 236.521A79.854 79.854 0 0 1 544 358.463V448z"] };
var faHandPaper = { prefix: 'fal', iconName: 'hand-paper', icon: [448, 512, [], "f256", "M369.427 119.119V96.31c0-42.828-42.806-72.789-82.304-56.523-19.82-54.166-94.37-52.179-112.451.797-38.439-15.75-81.814 12.815-81.814 55.916v145.654c-20.34-13.673-47.577-13.892-68.39 1.47-26.557 19.605-32.368 57.08-13.133 83.926l124.97 174.429A24 24 0 0 0 155.814 512h232.185a24 24 0 0 0 23.38-18.58l31.442-135.635a200.779 200.779 0 0 0 5.18-45.273V176.25c-.001-41.56-40.56-70.112-78.574-57.131zm46.57 193.394a168.76 168.76 0 0 1-4.35 38.046L381.641 480H159.924L37.336 308.912c-9.049-12.63-6.301-30.369 6.125-39.542 12.322-9.095 29.592-6.403 38.636 6.218l28.259 39.439c4.513 6.301 14.503 3.105 14.503-4.659V96.5c0-38.008 55.428-36.927 55.428.716V256a8 8 0 0 0 8 8h7.143a8 8 0 0 0 8-8V60.25c0-38.024 55.428-36.927 55.428.716V256a8 8 0 0 0 8 8h7.143a8 8 0 0 0 8-8V95.594c0-37.997 55.428-36.927 55.428.716V256a8 8 0 0 0 8 8h7.143a8 8 0 0 0 8-8v-79.034c0-37.556 55.428-38.847 55.428-.716v136.263z"] };
var faHandPeace = { prefix: 'fal', iconName: 'hand-peace', icon: [448, 512, [], "f25b", "M363.642 201.124c-13.07-27.616-44.381-40.855-72.775-31.297V67.5c0-37.22-29.991-67.5-66.855-67.5s-66.855 30.28-66.855 67.5L160 176l-30.852-89.568C115.645 51.546 76.664 34.523 42.319 48.22 8.02 61.896-8.796 100.93 4.609 135.568L65.068 291.78c-29.161 23.68-49.333 51.547-28.683 88.228l57.139 101.5C104.112 500.316 124.007 512 145.445 512h214.273c13.464 0 26.679-4.662 37.21-13.128 10.455-8.405 17.889-20.266 20.933-33.4l28.57-123.25A60.856 60.856 0 0 0 448 328.5V256c0-43.874-45.136-72.88-84.358-54.876zM71.039 328.153l27.757-22.54a8.002 8.002 0 0 0 2.418-9.098L34.453 124.019C17.447 80.08 82.438 54.403 99.305 97.981l62.274 160.906a8 8 0 0 0 7.461 5.112h12.117a8 8 0 0 0 8-8V67.5c0-46.929 69.709-47.021 69.709 0V256a8 8 0 0 0 8 8h7.143a8 8 0 0 0 8-8v-29c0-37.351 55.425-37.41 55.425 0v29a8 8 0 0 0 8 8h7.143a8 8 0 0 0 8-8c0-37.35 55.424-37.41 55.424 0v72.5c0 2.186-.25 4.371-.742 6.496l-28.57 123.25C383.72 471.055 372.629 480 359.719 480H145.445c-9.898 0-19.108-5.437-24.035-14.189l-57.14-101.5c-6.863-12.192-4.016-27.398 6.769-36.158z"] };
var faHandPointDown = { prefix: 'fal', iconName: 'hand-point-down', icon: [448, 512, [], "f0a7", "M185.6 512c38.484 0 70.4-32.063 70.4-70.4v-56.817c.351-.009.703-.02 1.054-.033 14.187-.536 27.727-4.655 39.582-11.885 23.339 4.644 48.386-2.335 65.494-16.635 49.786 1.625 85.87-29.026 85.87-88.631v-23.236c0-54.11-34.281-90.452-42.038-125.102C412.139 113.428 416 105.167 416 96V32c0-17.673-14.327-32-32-32H160c-17.673 0-32 14.327-32 32v64c0 11.62 6.194 21.792 15.459 27.397-10.075 18.05-49.384 49.858-67.144 60.919C53.853 198.2 0 207.454 0 256c0 41.313 29.922 73.6 70.4 73.6 17.79 0 32.611-4.354 44.8-9.791V441.6c0 37.63 32.239 70.4 70.4 70.4zM384 32v64H160V32h224zM185.6 480c-20.4 0-38.4-18.3-38.4-38.4V268.8c-18.9 0-38.4 28.8-76.8 28.8C48 297.6 32 280 32 256s35.686-28.704 61.2-44.5c23.443-14.595 72.556-53.665 83.262-83.5h198.677C384.733 167.68 416 200.026 416 244.364V267.6c0 44.208-24.215 62.317-66.9 55.201-8.728 15.94-37.068 26.347-58.5 14.1-19.882 21.125-50.597 19.404-66.6 5.4V441.6c0 20.7-17.7 38.4-38.4 38.4zM332 64c0-11.046 8.954-20 20-20s20 8.954 20 20-8.954 20-20 20-20-8.954-20-20z"] };
var faHandPointLeft = { prefix: 'fal', iconName: 'hand-point-left', icon: [512, 512, [], "f0a5", "M0 217.6C0 256.084 32.063 288 70.4 288h56.817c.009.351.02.703.033 1.054.536 14.187 4.655 27.727 11.885 39.582-4.644 23.339 2.335 48.386 16.635 65.494-1.625 49.786 29.026 85.87 88.631 85.87h23.236c54.11 0 90.452-34.281 125.102-42.038C398.572 444.139 406.833 448 416 448h64c17.673 0 32-14.327 32-32V192c0-17.673-14.327-32-32-32h-64c-11.62 0-21.792 6.194-27.397 15.459-18.051-10.075-49.858-49.384-60.919-67.144C313.8 85.853 304.546 32 256 32c-41.313 0-73.6 29.922-73.6 70.4 0 17.79 4.354 32.611 9.791 44.8H70.4C32.77 147.2 0 179.439 0 217.6zM480 416h-64V192h64v224zM32 217.6c0-20.4 18.3-38.4 38.4-38.4h172.8c0-18.9-28.8-38.4-28.8-76.8C214.4 80 232 64 256 64s28.704 35.686 44.5 61.2c14.595 23.443 53.665 72.556 83.5 83.262v198.677C344.32 416.733 311.974 448 267.636 448H244.4c-44.208 0-62.317-24.215-55.201-66.9-15.94-8.728-26.347-37.068-14.1-58.5-21.125-19.882-19.404-50.597-5.4-66.6H70.4C49.7 256 32 238.3 32 217.6zM448 364c11.046 0 20 8.954 20 20s-8.954 20-20 20-20-8.954-20-20 8.954-20 20-20z"] };
var faHandPointRight = { prefix: 'fal', iconName: 'hand-point-right', icon: [512, 512, [], "f0a4", "M441.6 147.2H319.809c5.437-12.189 9.791-27.01 9.791-44.8 0-40.478-32.286-70.4-73.6-70.4-48.546 0-57.8 53.853-71.683 76.315-11.062 17.761-42.869 57.069-60.919 67.144C117.792 166.194 107.62 160 96 160H32c-17.673 0-32 14.327-32 32v224c0 17.673 14.327 32 32 32h64c9.167 0 17.428-3.861 23.262-10.038C153.911 445.719 190.254 480 244.364 480H267.6c59.606 0 90.256-36.084 88.631-85.87 14.3-17.108 21.279-42.155 16.635-65.494 7.229-11.856 11.348-25.395 11.885-39.582.013-.351.024-.703.033-1.054H441.6c38.337 0 70.4-31.916 70.4-70.4 0-38.161-32.77-70.4-70.4-70.4zM32 192h64v224H32V192zm409.6 64h-99.301c14.004 16.003 15.726 46.718-5.4 66.6 12.247 21.431 1.841 49.771-14.1 58.5 7.116 42.685-10.993 66.9-55.201 66.9h-23.236c-44.337 0-76.684-31.267-116.364-40.861V208.462c29.835-10.706 68.904-59.818 83.5-83.262C227.296 99.686 232 64 256 64s41.6 16 41.6 38.4c0 38.4-28.8 57.9-28.8 76.8h172.8c20.1 0 38.4 18 38.4 38.4 0 20.7-17.7 38.4-38.4 38.4zM84 384c0 11.046-8.954 20-20 20s-20-8.954-20-20 8.954-20 20-20 20 8.954 20 20z"] };
var faHandPointUp = { prefix: 'fal', iconName: 'hand-point-up', icon: [448, 512, [], "f0a6", "M115.2 70.4v121.792c-12.189-5.437-27.01-9.791-44.8-9.791C29.922 182.4 0 214.687 0 256c0 48.546 53.853 57.8 76.315 71.683 17.761 11.062 57.069 42.869 67.144 60.919C134.194 394.208 128 404.38 128 416v64c0 17.673 14.327 32 32 32h224c17.673 0 32-14.327 32-32v-64c0-9.167-3.861-17.428-10.038-23.262C413.719 358.089 448 321.746 448 267.636V244.4c0-59.606-36.084-90.256-85.87-88.631-17.108-14.3-42.155-21.279-65.494-16.635-11.856-7.229-25.395-11.348-39.582-11.885a92.713 92.713 0 0 0-1.054-.033V70.4C256 32.063 224.084 0 185.6 0c-38.161 0-70.4 32.77-70.4 70.4zM160 480v-64h224v64H160zm64-409.6v99.301c16.003-14.004 46.718-15.726 66.6 5.4 21.431-12.247 49.771-1.841 58.5 14.1 42.685-7.116 66.9 10.993 66.9 55.201v23.236c0 44.337-31.267 76.684-40.861 116.364H176.462c-10.706-29.835-59.818-68.904-83.262-83.5C67.686 284.704 32 280 32 256s16-41.6 38.4-41.6c38.4 0 57.9 28.8 76.8 28.8V70.4c0-20.1 18-38.4 38.4-38.4 20.7 0 38.4 17.7 38.4 38.4zM352 428c11.046 0 20 8.954 20 20s-8.954 20-20 20-20-8.954-20-20 8.954-20 20-20z"] };
var faHandPointer = { prefix: 'fal', iconName: 'hand-pointer', icon: [448, 512, [], "f25a", "M360.543 188.156c-17.46-28.491-54.291-37.063-82.138-19.693-15.965-20.831-42.672-28.278-66.119-20.385V60.25c0-33.222-26.788-60.25-59.714-60.25S92.857 27.028 92.857 60.25v181.902c-20.338-13.673-47.578-13.89-68.389 1.472-26.556 19.605-32.368 57.08-13.132 83.926l114.271 159.5C136.803 502.673 154.893 512 174 512h185.714c27.714 0 51.832-19.294 58.145-46.528l28.571-123.25a60.769 60.769 0 0 0 1.57-13.723v-87c0-45.365-48.011-74.312-87.457-53.343zM82.097 275.588l28.258 39.439a7.999 7.999 0 1 0 14.503-4.659V60.25c0-37.35 55.428-37.41 55.428 0V241.5a8 8 0 0 0 8 8h7.144a8 8 0 0 0 8-8v-36.25c0-37.35 55.429-37.41 55.429 0v36.25a8 8 0 0 0 8 8H274a8 8 0 0 0 8-8v-21.75c0-37.351 55.429-37.408 55.429 0v21.75a8 8 0 0 0 8 8h7.143a8 8 0 0 0 8-8c0-37.35 55.429-37.41 55.429 0v87c0 2.186-.25 4.371-.742 6.496l-28.573 123.251C383.717 471.055 372.626 480 359.715 480H174c-8.813 0-17.181-4.332-22.381-11.588l-114.283-159.5c-22.213-31.004 23.801-62.575 44.761-33.324zM180.285 401v-87a8 8 0 0 1 8-8h7.144a8 8 0 0 1 8 8v87a8 8 0 0 1-8 8h-7.144a8 8 0 0 1-8-8zm78.572 0v-87a8 8 0 0 1 8-8H274a8 8 0 0 1 8 8v87a8 8 0 0 1-8 8h-7.143a8 8 0 0 1-8-8zm78.572 0v-87a8 8 0 0 1 8-8h7.143a8 8 0 0 1 8 8v87a8 8 0 0 1-8 8h-7.143a8 8 0 0 1-8-8z"] };
var faHandRock = { prefix: 'fal', iconName: 'hand-rock', icon: [512, 512, [], "f255", "M412.055 83.099C394.09 42.33 342.756 30.157 308.44 57.07c-28.257-34.829-80.888-32.701-106.878 2.23C157.639 26.987 94.25 58.222 94.25 113.143v10.078C50.599 104.318 0 135.857 0 184.571v59.326c0 31.379 13.628 61.31 37.389 82.119l101.2 88.626C147.059 422.06 145 429.788 145 456c0 13.255 10.745 24 24 24h261c13.255 0 24-10.745 24-24 0-24.785-1.14-33.765 4.887-47.867l44.364-103.808c5.805-13.583 8.749-27.948 8.749-42.694V142.42c0-51.69-55.549-83.525-99.945-59.321zM159.67 390.568l-101.2-88.626C41.648 287.21 32 266.054 32 243.897v-59.326c0-19.525 16.327-35.242 36.112-34.852 19.237.316 34.888 16.267 34.888 35.557v42.946c0 2.306.995 4.5 2.729 6.019l7.25 6.349a8 8 0 0 0 13.271-6.018V113.143c0-45.246 71-47.412 71 .706v27.865a8 8 0 0 0 8 8h7.25a8 8 0 0 0 8-8V98.857c0-45.23 71-47.429 71 .705v42.151a8 8 0 0 0 8 8h7.25a8 8 0 0 0 8-8V109.57c0-46.004 71-46.504 71 .705v31.438a8 8 0 0 0 8 8H401a8 8 0 0 0 8-8c0-45.242 71-47.428 71 .706V261.63a76.236 76.236 0 0 1-6.174 30.119l-44.365 103.808C420.883 415.63 422 429.933 422 448H177c0-19.081 2.866-39.746-17.33-57.432z"] };
var faHandScissors = { prefix: 'fal', iconName: 'hand-scissors', icon: [512, 512, [], "f257", "M256 480h72.5c4.615 0 9.232-.528 13.722-1.569l123.25-28.57c13.133-3.044 24.995-10.478 33.4-20.933 8.466-10.531 13.128-23.746 13.128-37.21V177.445c0-21.438-11.684-41.333-30.492-51.92l-101.5-57.139c-36.681-20.651-64.548-.478-88.228 28.683l-156.211-60.46c-34.639-13.405-73.672 3.411-87.35 37.709-13.696 34.345 3.326 73.326 38.212 86.829L176 192l-108.5-2.843c-37.22 0-67.5 29.991-67.5 66.855s30.28 66.854 67.5 66.854h102.327c-9.558 28.393 3.681 59.705 31.297 72.775C183.12 434.864 212.126 480 256 480zM364.311 96.271l101.5 57.14c8.753 4.927 14.189 14.137 14.189 24.035v214.272c0 12.91-8.945 24.001-21.754 26.97l-123.25 28.57a28.843 28.843 0 0 1-6.496.742H256c-37.41 0-37.35-55.424 0-55.424a8 8 0 0 0 8-8v-7.143a8 8 0 0 0-8-8h-29c-37.41 0-37.351-55.425 0-55.425h29a8 8 0 0 0 8-8v-7.143a8 8 0 0 0-8-8H67.5c-47.021 0-46.929-69.709 0-69.709H256a8 8 0 0 0 8-8V201.04a8 8 0 0 0-5.112-7.461L97.981 131.305c-43.579-16.867-17.902-81.857 26.037-64.852l172.497 66.761a8.002 8.002 0 0 0 9.098-2.418l22.54-27.757c8.76-10.785 23.966-13.632 36.158-6.768z"] };
var faHandSpock = { prefix: 'fal', iconName: 'hand-spock', icon: [512, 512, [], "f259", "M443.093 87.615c-.664-25.947-18.382-50.01-45.605-56.816-32.269-8.067-64.966 11.445-73.064 43.839L297.674 208 266.689 46.772c-7.438-32.377-39.771-52.688-72.214-45.229-29.713 6.826-49.247 34.672-46.508 64.236-41.241-5.55-76.092 31.84-66.719 73.078L116 291.76v13.722l-14.484-13.606c-24.631-23.18-62.766-21.223-85.169 2.582-22.768 24.191-21.611 62.397 2.581 85.166l133.747 125.853A24 24 0 0 0 169.124 512h246.087a24 24 0 0 0 23.01-17.178l32.951-111.146a110.935 110.935 0 0 0 4.578-31.55V313.97c0-4.908.576-9.818 1.713-14.592l32.853-138.174c9.943-41.755-25.657-79.651-67.223-73.589zm36.131 66.179l-32.89 138.172a95.075 95.075 0 0 0-2.584 22.005v38.154a78.974 78.974 0 0 1-3.259 22.455L409.238 480H172.297L40.889 356.322c-11.344-10.677-11.886-28.591-1.21-39.934l.001-.001c10.736-11.409 28.607-11.867 39.932-1.21l54.905 51.676c5.097 4.795 13.483 1.173 13.483-5.825v-71.961c0-.597-.066-1.191-.199-1.772l-35.349-155.534c-8.278-36.423 46.805-48.997 55.096-12.521l31.484 138.532a7.999 7.999 0 0 0 7.801 6.228h8.911c5.136 0 8.948-4.783 7.797-9.791L180.436 66.583c-8.354-36.36 46.662-49.213 55.065-12.649l46.834 203.857a8 8 0 0 0 7.797 6.209h13.689a7.999 7.999 0 0 0 7.761-6.06l43.885-175.542c9.062-36.254 63.888-22.598 54.814 13.703l-39.49 157.958c-1.264 5.052 2.565 9.94 7.761 9.94h10.041a7.999 7.999 0 0 0 7.782-6.147l27.884-117.145c8.655-36.347 63.634-23.323 54.965 13.087z"] };
var faHandshake = { prefix: 'fal', iconName: 'handshake', icon: [640, 512, [], "f2b5", "M616 96h-80c-13.255 0-24 10.745-24 24v8h-13.98L467.4 96.62C450.18 75.88 425.38 64 399.24 64h-43.48c-17.26 0-33.83 5.67-47.6 15.98C292.9 69.69 274.62 64 255.92 64h-30.1c-23.97 0-46.58 8.95-63.81 25.23L127.91 118c-1.01-12.32-11.34-22-23.91-22H24c-13.25 0-24 10.75-24 24v240c0 13.25 10.75 24 24 24h80c12.6 0 22.94-9.72 23.92-22.07l57.83 53.09c10.25 10.3 24.37 18.83 40.9 24.71 15.22 5.41 31.42 8.27 46.84 8.27 14.38 0 28.26-3.57 39.98-10.08 22.078 1.578 45.43-8.115 60.24-26.93 19.507-4.254 36.546-15.967 47.5-31.85 20.077-2.708 36.576-13.139 46.619-27.14H512v8c0 13.255 10.745 24 24 24h80c13.255 0 24-10.745 24-24V120c0-13.255-10.745-24-24-24zM32 352V128h64v224H32zm405.66-13.96c-14.428 13.006-34.599 10.286-37.45 7.27 1.323 12.091-16.941 37.243-46 35.34-5.171 16.807-26.409 30.774-48.26 23.42-24.539 23.802-78.639 7.884-97.95-12.07-77.229-70.883-73.233-68.386-80-70.7V158.24c5.065-2.059 2.284-.376 55.41-45.2C194.66 102.13 209.91 96 225.82 96h30.1c10.56 0 20.83 2.7 29.82 7.7l-47 58.71c-19.44 24.27-19.67 59.72-.56 84.28 27.756 35.648 78.886 35.957 107.24 1.8l30.52-37.84 63.66 81.71c12.6 13.27 10.26 34.67-1.94 45.68zm-41.12-153.01c4.68-6.81 3.39-16.2-3.16-21.48-6.92-5.581-16.988-4.421-22.5 2.41l-50.15 62.16c-15.503 18.586-42.293 18.173-57.3-1.09-9.96-12.8-9.84-31.98.29-44.62l54.1-67.58C327.03 103.329 340.663 96 355.76 96h43.48c16.73 0 32.71 7.82 43.85 21.45l.45.54L484.53 160H512v160h-32.292c.11-1.182.195-2.368.242-3.56.65-16.76-4.99-32.58-15.9-44.76l-67.51-86.65zM608 352h-64V128h64v224zm-48-48c0-8.837 7.163-16 16-16s16 7.163 16 16-7.163 16-16 16-16-7.163-16-16zm-480 0c0 8.837-7.163 16-16 16s-16-7.163-16-16 7.163-16 16-16 16 7.163 16 16z"] };
var faHashtag = { prefix: 'fal', iconName: 'hashtag', icon: [448, 512, [], "f292", "M446.381 182.109l1.429-8c1.313-7.355-4.342-14.109-11.813-14.109h-98.601l20.338-113.891C359.047 38.754 353.392 32 345.92 32h-8.127a12 12 0 0 0-11.813 9.891L304.89 160H177.396l20.338-113.891C199.047 38.754 193.392 32 185.92 32h-8.127a12 12 0 0 0-11.813 9.891L144.89 160H42.003a12 12 0 0 0-11.813 9.891l-1.429 8C27.448 185.246 33.103 192 40.575 192h98.6l-22.857 128H13.432a12 12 0 0 0-11.813 9.891l-1.429 8C-1.123 345.246 4.532 352 12.003 352h98.601L90.266 465.891C88.953 473.246 94.608 480 102.08 480h8.127a12 12 0 0 0 11.813-9.891L143.11 352h127.494l-20.338 113.891C248.953 473.246 254.608 480 262.08 480h8.127a12 12 0 0 0 11.813-9.891L303.11 352h102.886a12 12 0 0 0 11.813-9.891l1.429-8c1.313-7.355-4.342-14.109-11.813-14.109h-98.601l22.857-128h102.886a12 12 0 0 0 11.814-9.891zM276.318 320H148.825l22.857-128h127.494l-22.858 128z"] };
var faHdd = { prefix: 'fal', iconName: 'hdd', icon: [576, 512, [], "f0a0", "M566.819 227.377L462.377 83.768A48.001 48.001 0 0 0 423.557 64H152.443a47.998 47.998 0 0 0-38.819 19.768L9.181 227.377A47.996 47.996 0 0 0 0 255.609V400c0 26.51 21.49 48 48 48h480c26.51 0 48-21.49 48-48V255.609a47.996 47.996 0 0 0-9.181-28.232zM139.503 102.589A16.048 16.048 0 0 1 152.443 96h271.115c5.102 0 9.939 2.463 12.94 6.589L524.796 224H51.204l88.299-121.411zM544 272v128c0 8.823-7.178 16-16 16H48c-8.822 0-16-7.177-16-16V272c0-8.837 7.163-16 16-16h480c8.837 0 16 7.163 16 16zm-56 64c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24zm-64 0c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24z"] };
var faHeading = { prefix: 'fal', iconName: 'heading', icon: [448, 512, [], "f1dc", "M304.51 64.201h47.851v175.07H95.639V64.201h47.851c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12H13.698c-6.627 0-12 5.373-12 12v8.201c0 6.627 5.373 12 12 12h47.851v383.603H13.698c-6.627 0-12 5.373-12 12v8.2c0 6.627 5.373 12 12 12H143.49c6.627 0 12-5.373 12-12v-8.2c0-6.627-5.373-12-12-12H95.639V271.473h256.722v176.331H304.51c-6.627 0-12 5.373-12 12v8.2c0 6.627 5.373 12 12 12h129.792c6.627 0 12-5.373 12-12v-8.2c0-6.627-5.373-12-12-12h-47.851V64.201h47.851c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12H304.51c-6.627 0-12 5.373-12 12v8.201c0 6.628 5.373 12 12 12z"] };
var faHeadphones = { prefix: 'fal', iconName: 'headphones', icon: [512, 512, [], "f025", "M256 32C114.517 32 0 146.497 0 288v51.429a16.003 16.003 0 0 0 8.213 13.978l23.804 13.262c-.005.443-.017.886-.017 1.331 0 61.856 50.144 112 112 112h24c13.255 0 24-10.745 24-24V280c0-13.255-10.745-24-24-24h-24c-49.675 0-91.79 32.343-106.453 77.118L32 330.027V288C32 164.205 132.184 64 256 64c123.796 0 224 100.184 224 224v42.027l-5.547 3.09C459.79 288.343 417.676 256 368 256h-24c-13.255 0-24 10.745-24 24v176c0 13.255 10.745 24 24 24h24c61.856 0 112-50.144 112-112 0-.445-.012-.888-.017-1.332l23.804-13.262A16.002 16.002 0 0 0 512 339.428V288c0-141.482-114.497-256-256-256zM144 288h16v160h-16c-44.112 0-80-35.888-80-80s35.888-80 80-80zm224 160h-16V288h16c44.112 0 80 35.888 80 80s-35.888 80-80 80z"] };
var faHeart = { prefix: 'fal', iconName: 'heart', icon: [576, 512, [], "f004", "M403.7 24c-42.8 0-83.9 25.7-115.7 54.7C256.2 49.8 215.1 24 172.3 24 80.8 24 24 80.6 24 171.7c0 73.2 62.4 132.4 68.1 137.7l170.3 168.2c14.1 13.9 37.1 14 51.2 0l170.2-167.8.5-.5c15.9-15.5 67.7-71.1 67.7-137.6C552 80.6 495.2 24 403.7 24zm57.7 263L291.2 454.7c-1.8 1.8-4.5 1.8-6.3 0L114.3 286.4C85.8 259.6 56 214 56 171.7 56 98.2 98.4 56 172.3 56c45.1 0 85.4 37 115.7 67.4C303.8 107.6 351.7 56 403.7 56 477.6 56 520 98.2 520 171.7c0 42.4-28.2 85.2-58.6 115.3z"] };
var faHeartbeat = { prefix: 'fal', iconName: 'heartbeat', icon: [576, 512, [], "f21e", "M403.7 24c-42.8 0-83.9 25.8-115.7 54.7C256.2 49.8 215.1 24 172.3 24 80.8 24 24 80.6 24 171.7c0 31.9 11.8 61.1 25.6 84.3 7.5 12.6 15.5 23.4 22.6 31.9 9.9 12 18 19.6 19.9 21.4l170.3 168.2c14.1 13.9 37.1 13.9 51.2 0l170.2-167.8.5-.5c4.4-4.2 11.5-11.6 19.4-21.3 7.2-8.8 15.2-19.6 22.6-32 14-23.5 25.7-52.7 25.7-84.3C552 80.6 495.2 24 403.7 24zM291.2 454.7c-1.8 1.8-4.5 1.8-6.3 0L116 288h66.9c5.1 0 9.7-3.2 11.4-8.1l30-95.2 69 207.3c3.6 10.3 17.9 10.8 22.3.8L370.7 249l10.5 32.8c2.1 3.8 6.1 6.2 10.5 6.2h68.6L291.2 454.7zM403.4 256l-24.3-57.8c-4.8-8.7-17.5-8.1-21.5 1l-51 134.5L235.3 120c-3.8-10.7-19-10.7-22.7.1l-44 135.9H87.8C69.9 231.1 56 200.6 56 171.7 56 98.2 98.4 56 172.3 56c43.1 0 81.7 33.7 111.4 63.2 2.4 2.3 6.2 2.3 8.5-.1 19-19.2 63.5-63.2 111.5-63.2C477.6 56 520 98.2 520 171.7c0 29.3-13.5 58.9-32 84.3h-84.6z"] };
var faHexagon = { prefix: 'fal', iconName: 'hexagon', icon: [576, 512, [], "f312", "M441.5 39.8C432.9 25.1 417.1 16 400 16H176c-17.1 0-32.9 9.1-41.5 23.8l-112 192c-8.7 14.9-8.7 33.4 0 48.4l112 192c8.6 14.7 24.4 23.8 41.5 23.8h224c17.1 0 32.9-9.1 41.5-23.8l112-192c8.7-14.9 8.7-33.4 0-48.4l-112-192zm84.3 224.3l-112 192c-2.9 4.9-8.2 7.9-13.8 7.9H176c-5.7 0-11-3-13.8-7.9l-112-192c-2.9-5-2.9-11.2 0-16.1l112-192c2.8-5 8.1-8 13.8-8h224c5.7 0 11 3 13.8 7.9l112 192c2.9 5 2.9 11.2 0 16.2z"] };
var faHistory = { prefix: 'fal', iconName: 'history', icon: [512, 512, [], "f1da", "M20 24h10c6.627 0 12 5.373 12 12v94.625C85.196 57.047 165.239 7.715 256.793 8.001 393.18 8.428 504.213 120.009 504 256.396 503.786 393.181 392.834 504 256 504c-63.926 0-122.202-24.187-166.178-63.908-5.113-4.618-5.354-12.561-.482-17.433l7.069-7.069c4.503-4.503 11.749-4.714 16.482-.454C150.782 449.238 200.935 470 256 470c117.744 0 214-95.331 214-214 0-117.744-95.331-214-214-214-82.862 0-154.737 47.077-190.289 116H164c6.627 0 12 5.373 12 12v10c0 6.627-5.373 12-12 12H20c-6.627 0-12-5.373-12-12V36c0-6.627 5.373-12 12-12zm321.647 315.235l4.706-6.47c3.898-5.36 2.713-12.865-2.647-16.763L272 263.853V116c0-6.627-5.373-12-12-12h-8c-6.627 0-12 5.373-12 12v164.147l84.884 61.734c5.36 3.899 12.865 2.714 16.763-2.646z"] };
var faHockeyPuck = { prefix: 'fal', iconName: 'hockey-puck', icon: [544, 512, [], "f453", "M272 64C141 64 0 99 0 176v144c0 84 136.8 128 272 128s272-44 272-128V176c0-77-141-112-272-112zm240 256c0 53-107.5 96-240 96S32 373 32 320v-87.7c95.7 74 383.6 74.5 480 0V320zm-240-64c-132.5 0-240-35.8-240-80s107.5-80 240-80 240 35.8 240 80-107.5 80-240 80z"] };
var faHockeySticks = { prefix: 'fal', iconName: 'hockey-sticks', icon: [640, 512, [], "f454", "M624 352H410.6c-3 0-5.8-1.7-7.2-4.4L373.6 288l118-236.2c3.9-7.9.7-17.5-7.2-21.5L427.3 1.7c-7.9-4-17.5-.8-21.5 7.2L320 180.6 234.2 8.8c-3.9-7.9-13.6-11.1-21.5-7.2l-57.3 28.6c-7.9 4-11.1 13.6-7.2 21.5l118 236.2-29.8 59.6c-1.4 2.7-4.1 4.4-7.2 4.4H16c-8.8 0-16 7.2-16 16v128c0 8.8 7.2 16 16 16h186.3c36.4 0 69.6-20.6 85.9-53.1l31.8-63.6 31.8 63.6c16.3 32.5 49.5 53.1 85.9 53.1H624c8.8 0 16-7.2 16-16V368c0-8.8-7.2-16-16-16zM184.1 51.8l28.6-14.3 89.4 178.9-17.9 35.8L184.1 51.8zM32 480v-96h32v96H32zm227.6-35.4c-10.9 21.8-32.8 35.4-57.2 35.4H96v-96h133.4c15.3 0 29-8.5 35.8-22.1L427.3 37.5l28.6 14.3-196.3 392.8zM437.7 480c-24.4 0-46.3-13.6-57.2-35.4L338 359.5l17.9-35.8 19.1 38.1c6.8 13.6 20.5 22.1 35.8 22.1H544v96H437.7zm170.3 0h-32v-96h32v96z"] };
var faHome = { prefix: 'fal', iconName: 'home', icon: [512, 512, [], "f015", "M509.8 227.5L448 177.8v-76c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6v50.1L276.1 39.1c-11.7-9.5-28.5-9.5-40.2 0L2.2 227.5c-2.6 2.1-3 5.9-.9 8.4l12.6 15.6c2.1 2.6 5.9 3 8.5.9L64 218.9v229c0 17.7 14.3 32 32 32h116c6.6 0 12-5.4 12-12V335.8l64 .3v132.2c0 6.6 5.4 12 12 12l116-.3c17.7 0 32-14.3 32-32V219l41.6 33.5c2.6 2.1 6.4 1.7 8.5-.9l12.6-15.6c2.1-2.6 1.6-6.4-.9-8.5zM416 448l-96 .3V316c0-6.6-5.4-12-12-12l-104-.3c-6.6 0-12 5.4-12 12V448H96V193.1l156.2-126c2.2-1.8 5.3-1.8 7.5 0l156.2 126V448z"] };
var faHospital = { prefix: 'fal', iconName: 'hospital', icon: [448, 512, [], "f0f8", "M180 352h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v40c0 6.627-5.373 12-12 12zm88 0h40c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12zm-128-96h40c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12zm128 0h40c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12zm180 256H0v-20c0-6.627 5.373-12 12-12h20V85c0-11.598 10.745-21 24-21h88V24c0-13.255 10.745-24 24-24h112c13.255 0 24 10.745 24 24v40h88c13.255 0 24 9.402 24 21v395h20c6.627 0 12 5.373 12 12v20zM64 480h128v-84c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v84h128V96h-80v40c0 13.255-10.745 24-24 24H168c-13.255 0-24-10.745-24-24V96H64v384zM266 64h-26V38a6 6 0 0 0-6-6h-20a6 6 0 0 0-6 6v26h-26a6 6 0 0 0-6 6v20a6 6 0 0 0 6 6h26v26a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V96h26a6 6 0 0 0 6-6V70a6 6 0 0 0-6-6z"] };
var faHourglass = { prefix: 'fal', iconName: 'hourglass', icon: [384, 512, [], "f254", "M368 32h4c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H12C5.373 0 0 5.373 0 12v8c0 6.627 5.373 12 12 12h4c0 91.821 44.108 193.657 129.646 224C59.832 286.441 16 388.477 16 480h-4c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h360c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-4c0-91.821-44.108-193.657-129.646-224C324.168 225.559 368 123.523 368 32zM48 32h288c0 110.457-64.471 200-144 200S48 142.457 48 32zm288 448H48c0-110.457 64.471-200 144-200s144 89.543 144 200z"] };
var faHourglassEnd = { prefix: 'fal', iconName: 'hourglass-end', icon: [384, 512, [], "f253", "M368 32h4c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H12C5.373 0 0 5.373 0 12v8c0 6.627 5.373 12 12 12h4c0 91.821 44.108 193.657 129.646 224C59.832 286.441 16 388.477 16 480h-4c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h360c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-4c0-91.821-44.108-193.657-129.646-224C324.168 225.559 368 123.523 368 32zM48 32h288c0 110.457-64.471 200-144 200S48 142.457 48 32zm288 448H48c0-110.457 64.471-200 144-200s144 89.543 144 200zM98.379 416h187.243a12.01 12.01 0 0 1 11.602 8.903 199.464 199.464 0 0 1 2.059 8.43c1.664 7.522-4 14.667-11.704 14.667H96.422c-7.704 0-13.368-7.145-11.704-14.667.62-2.804 1.307-5.616 2.059-8.43A12.01 12.01 0 0 1 98.379 416zm15.962-50.912a141.625 141.625 0 0 1 6.774-8.739c2.301-2.738 5.671-4.348 9.248-4.348h123.276c3.576 0 6.947 1.61 9.248 4.348a142.319 142.319 0 0 1 6.774 8.739c5.657 7.91-.088 18.912-9.813 18.912H124.153c-9.724 0-15.469-11.003-9.812-18.912z"] };
var faHourglassHalf = { prefix: 'fal', iconName: 'hourglass-half', icon: [384, 512, [], "f252", "M368 32h4c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H12C5.373 0 0 5.373 0 12v8c0 6.627 5.373 12 12 12h4c0 91.821 44.108 193.657 129.646 224C59.832 286.441 16 388.477 16 480h-4c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h360c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-4c0-91.821-44.108-193.657-129.646-224C324.168 225.559 368 123.523 368 32zM48 32h288c0 110.457-64.471 200-144 200S48 142.457 48 32zm288 448H48c0-110.457 64.471-200 144-200s144 89.543 144 200zm-66.34-333.088a141.625 141.625 0 0 1-6.774 8.739c-2.301 2.738-5.671 4.348-9.248 4.348H130.362c-3.576 0-6.947-1.61-9.248-4.348a142.319 142.319 0 0 1-6.774-8.739c-5.657-7.91.088-18.912 9.813-18.912h135.694c9.725 0 15.469 11.003 9.813 18.912zM98.379 416h187.243a12.01 12.01 0 0 1 11.602 8.903 199.464 199.464 0 0 1 2.059 8.43c1.664 7.522-4 14.667-11.704 14.667H96.422c-7.704 0-13.368-7.145-11.704-14.667.62-2.804 1.307-5.616 2.059-8.43A12.01 12.01 0 0 1 98.379 416z"] };
var faHourglassStart = { prefix: 'fal', iconName: 'hourglass-start', icon: [384, 512, [], "f251", "M368 32h4c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H12C5.373 0 0 5.373 0 12v8c0 6.627 5.373 12 12 12h4c0 91.821 44.108 193.657 129.646 224C59.832 286.441 16 388.477 16 480h-4c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h360c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-4c0-91.821-44.108-193.657-129.646-224C324.168 225.559 368 123.523 368 32zM48 32h288c0 110.457-64.471 200-144 200S48 142.457 48 32zm288 448H48c0-110.457 64.471-200 144-200s144 89.543 144 200zM285.621 96H98.379a12.01 12.01 0 0 1-11.602-8.903 199.464 199.464 0 0 1-2.059-8.43C83.054 71.145 88.718 64 96.422 64h191.157c7.704 0 13.368 7.145 11.704 14.667a199.464 199.464 0 0 1-2.059 8.43A12.013 12.013 0 0 1 285.621 96zm-15.961 50.912a141.625 141.625 0 0 1-6.774 8.739c-2.301 2.738-5.671 4.348-9.248 4.348H130.362c-3.576 0-6.947-1.61-9.248-4.348a142.319 142.319 0 0 1-6.774-8.739c-5.657-7.91.088-18.912 9.813-18.912h135.694c9.725 0 15.469 11.003 9.813 18.912z"] };
var faICursor = { prefix: 'fal', iconName: 'i-cursor', icon: [192, 512, [], "f246", "M96 38.223C75.091 13.528 39.824 1.336 6.191.005 2.805-.129 0 2.617 0 6.006v20.013c0 3.191 2.498 5.847 5.686 5.989C46.519 33.825 80 55.127 80 80v160H38a6 6 0 0 0-6 6v20a6 6 0 0 0 6 6h42v160c0 24.873-33.481 46.175-74.314 47.992-3.188.141-5.686 2.797-5.686 5.989v20.013c0 3.389 2.806 6.135 6.192 6.002C40.03 510.658 75.193 498.351 96 473.777c20.909 24.695 56.176 36.887 89.809 38.218 3.386.134 6.191-2.612 6.191-6.001v-20.013c0-3.191-2.498-5.847-5.686-5.989C145.481 478.175 112 456.873 112 432V272h42a6 6 0 0 0 6-6v-20a6 6 0 0 0-6-6h-42V80c0-24.873 33.481-46.175 74.314-47.992 3.188-.142 5.686-2.798 5.686-5.989V6.006c0-3.389-2.806-6.135-6.192-6.002C151.97 1.342 116.807 13.648 96 38.223z"] };
var faIdBadge = { prefix: 'fal', iconName: 'id-badge', icon: [384, 512, [], "f2c1", "M336 0H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48V48c0-26.51-21.49-48-48-48zm16 464c0 8.837-7.163 16-16 16H48c-8.837 0-16-7.163-16-16V64h320v400zm-85.3-179.78C280.02 267.74 288 246.78 288 224c0-52.93-43.199-96-96-96-52.93 0-96 43.07-96 96 0 22.78 7.98 43.74 21.3 60.22-14.84 5.23-27.61 14.58-37.17 27.24C69.58 325.45 64 342.11 64 359.64V372c0 24.301 19.699 44 44 44h168c24.301 0 44-19.699 44-44v-12.36c0-17.53-5.58-34.19-16.13-48.18-9.56-12.66-22.33-22.01-37.17-27.24zM192 160c35.35 0 64 28.65 64 64 0 35.465-28.762 64-64 64-35.227 0-64-28.524-64-64 0-35.35 28.65-64 64-64zm96 212c0 6.627-5.373 12-12 12H108c-6.627 0-12-5.373-12-12v-12.36c0-21.44 14.21-40.27 34.81-46.16l16.29-4.65C160.51 315.96 175.79 320 192 320s31.49-4.04 44.9-11.17l16.29 4.65c20.6 5.89 34.81 24.72 34.81 46.16V372z"] };
var faIdCard = { prefix: 'fal', iconName: 'id-card', icon: [512, 512, [], "f2c2", "M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm16 336c0 8.837-7.163 16-16 16H48c-8.837 0-16-7.163-16-16V128h448v272zm-44-48H300c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h136c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12zm0-64H300c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h136c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12zm0-64H300c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h136c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12zm-192.906 68.949c-6.116-8.109-14.17-14.661-23.283-19.076A69.962 69.962 0 0 0 230.4 236.8c0-38.819-31.581-70.4-70.4-70.4s-70.4 31.581-70.4 70.4a69.962 69.962 0 0 0 10.589 37.073c-9.113 4.415-17.167 10.968-23.283 19.076C68.583 303.983 64 317.67 64 331.49v10.91c0 22.938 18.662 41.6 41.6 41.6h108.8c22.938 0 41.6-18.662 41.6-41.6v-10.91c0-13.82-4.583-27.507-12.906-38.541zM160 198.4c21.208 0 38.4 17.192 38.4 38.4s-17.192 38.4-38.4 38.4-38.4-17.192-38.4-38.4 17.192-38.4 38.4-38.4zm64 144a9.6 9.6 0 0 1-9.6 9.6H105.6a9.6 9.6 0 0 1-9.6-9.6v-10.91c0-14.287 9.471-26.844 23.209-30.769l7.211-2.06c9.987 5.443 21.429 8.539 33.58 8.539s23.594-3.096 33.58-8.539l7.211 2.06C214.529 304.646 224 317.203 224 331.49v10.91z"] };
var faImage = { prefix: 'fal', iconName: 'image', icon: [512, 512, [], "f03e", "M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm16 336c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V112c0-8.822 7.178-16 16-16h416c8.822 0 16 7.178 16 16v288zM112 232c30.928 0 56-25.072 56-56s-25.072-56-56-56-56 25.072-56 56 25.072 56 56 56zm0-80c13.234 0 24 10.766 24 24s-10.766 24-24 24-24-10.766-24-24 10.766-24 24-24zm207.029 23.029L224 270.059l-31.029-31.029c-9.373-9.373-24.569-9.373-33.941 0l-88 88A23.998 23.998 0 0 0 64 344v28c0 6.627 5.373 12 12 12h360c6.627 0 12-5.373 12-12v-92c0-6.365-2.529-12.47-7.029-16.971l-88-88c-9.373-9.372-24.569-9.372-33.942 0zM416 352H96v-4.686l80-80 48 48 112-112 80 80V352z"] };
var faImages = { prefix: 'fal', iconName: 'images', icon: [576, 512, [], "f302", "M528 32H112c-26.51 0-48 21.49-48 48v16H48c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48v-16h16c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm-48 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V144c0-8.822 7.178-16 16-16h16v240c0 26.51 21.49 48 48 48h368v16zm64-64c0 8.822-7.178 16-16 16H112c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h416c8.822 0 16 7.178 16 16v288zM176 200c30.928 0 56-25.072 56-56s-25.072-56-56-56-56 25.072-56 56 25.072 56 56 56zm0-80c13.234 0 24 10.766 24 24s-10.766 24-24 24-24-10.766-24-24 10.766-24 24-24zm240.971 23.029c-9.373-9.373-24.568-9.373-33.941 0L288 238.059l-31.029-31.03c-9.373-9.373-24.569-9.373-33.941 0l-88 88A24.002 24.002 0 0 0 128 312v28c0 6.627 5.373 12 12 12h360c6.627 0 12-5.373 12-12v-92c0-6.365-2.529-12.47-7.029-16.971l-88-88zM480 320H160v-4.686l80-80 48 48 112-112 80 80V320z"] };
var faInbox = { prefix: 'fal', iconName: 'inbox', icon: [576, 512, [], "f01c", "M566.819 227.377L462.377 83.768A48.001 48.001 0 0 0 423.557 64H152.443a47.998 47.998 0 0 0-38.819 19.768L9.181 227.377A47.996 47.996 0 0 0 0 255.609V400c0 26.51 21.49 48 48 48h480c26.51 0 48-21.49 48-48V255.609a47.996 47.996 0 0 0-9.181-28.232zM139.503 102.589A16.048 16.048 0 0 1 152.443 96h271.115c5.102 0 9.939 2.463 12.94 6.589L524.796 224H388.223l-32 64H219.777l-32-64H51.204l88.299-121.411zM544 272v128c0 8.823-7.178 16-16 16H48c-8.822 0-16-7.177-16-16V272c0-8.837 7.163-16 16-16h120l32 64h176l32-64h120c8.837 0 16 7.163 16 16z"] };
var faInboxIn = { prefix: 'fal', iconName: 'inbox-in', icon: [576, 512, [], "f310", "M560.8 329.8l-94.6-88.7c-2.4-2.3-6.2-2.1-8.5.3L444.1 256c-2.3 2.4-2.1 6.2.3 8.5l59.3 55.6H388.2l-32 64H219.8l-32-64H72.4l59.3-55.6c2.4-2.3 2.5-6.1.3-8.5l-13.7-14.6c-2.3-2.4-6.1-2.5-8.5-.3l-94.6 88.7c-9.7 9-15.2 21.7-15.2 35V464c0 26.5 21.5 48 48 48h480c26.5 0 48-21.5 48-48v-99.2c0-13.3-5.5-26-15.2-35zM544 464c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16v-96c0-8.8 7.2-16 16-16h120l32 64h176l32-64h120c8.8 0 16 7.2 16 16v96zM416 128h-64V24c0-13.2-10.8-24-24-24h-80c-13.2 0-24 10.8-24 24v104h-64c-28.4 0-42.8 34.5-22.6 54.6l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c20-20.1 5.8-54.6-22.7-54.6zM288 288L160 160h96V32h64v128h96L288 288z"] };
var faInboxOut = { prefix: 'fal', iconName: 'inbox-out', icon: [576, 512, [], "f311", "M560.8 329.8l-94.6-88.7c-2.4-2.3-6.2-2.1-8.5.3L444.1 256c-2.3 2.4-2.1 6.2.3 8.5l59.3 55.6H388.2l-32 64H219.8l-32-64H72.4l59.3-55.6c2.4-2.3 2.5-6.1.3-8.5l-13.7-14.6c-2.3-2.4-6.1-2.5-8.5-.3l-94.6 88.7C5.5 338.9 0 351.5 0 364.8V464c0 26.5 21.5 48 48 48h480c26.5 0 48-21.5 48-48v-99.2c0-13.3-5.5-25.9-15.2-35zM544 464c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16v-96c0-8.8 7.2-16 16-16h120l32 64h176l32-64h120c8.8 0 16 7.2 16 16v96zM160 192h64v104c0 13.2 10.8 24 24 24h80c13.2 0 24-10.8 24-24V192h64c28.4 0 42.8-34.5 22.6-54.6l-128-128c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-20 20.1-5.8 54.6 22.7 54.6zM288 32l128 128h-96v128h-64V160h-96L288 32z"] };
var faIndent = { prefix: 'fal', iconName: 'indent', icon: [448, 512, [], "f03c", "M0 76V52a6 6 0 0 1 6-6h436a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6zm166 134h276a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H166a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zM6 466h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm160-128h276a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H166a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zM0 351.987V160.014c0-14.27 17.283-21.346 27.313-11.313l96 95.986c6.249 6.248 6.249 16.379 0 22.627l-96 95.987C17.296 373.318 0 366.281 0 351.987zm32-153.36v114.746L89.373 256 32 198.627z"] };
var faIndustry = { prefix: 'fal', iconName: 'industry', icon: [512, 512, [], "f275", "M477.267 162.534L320 241.167V184c0-18.007-18.948-29.359-34.733-21.466L128 241.167V56c0-13.255-10.745-24-24-24H24C10.745 32 0 42.745 0 56v400c0 13.255 10.745 24 24 24h464c13.255 0 24-10.745 24-24V184c0-18.007-18.948-29.359-34.733-21.466zM107.578 287.155L288 196.944V280c0 5.949 6.268 9.81 11.578 7.155L480 196.944V448H32V64h64v216c0 5.947 6.269 9.811 11.578 7.155z"] };
var faIndustryAlt = { prefix: 'fal', iconName: 'industry-alt', icon: [512, 512, [], "f3b3", "M404 384h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v40c0 6.627-5.373 12-12 12zm-116-12v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm-128 0v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm352-188v272c0 13.255-10.745 24-24 24H24c-13.255 0-24-10.745-24-24V56c0-13.255 10.745-24 24-24h80c13.255 0 24 10.745 24 24v185.167l157.267-78.633C301.052 154.641 320 165.993 320 184v57.167l157.267-78.633C493.052 154.641 512 165.993 512 184zM96 280V64H32v384h448V196.944l-180.422 90.211C294.268 289.81 288 285.949 288 280v-83.056l-180.422 90.211C102.269 289.811 96 285.947 96 280z"] };
var faInfo = { prefix: 'fal', iconName: 'info', icon: [256, 512, [], "f129", "M208 368.667V208c0-15.495-7.38-29.299-18.811-38.081C210.442 152.296 224 125.701 224 96c0-52.935-43.065-96-96-96S32 43.065 32 96c0 24.564 9.274 47.004 24.504 64H56c-26.467 0-48 21.533-48 48v48c0 23.742 17.327 43.514 40 47.333v65.333C25.327 372.486 8 392.258 8 416v48c0 26.467 21.533 48 48 48h144c26.467 0 48-21.533 48-48v-48c0-23.742-17.327-43.514-40-47.333zM128 32c35.346 0 64 28.654 64 64s-28.654 64-64 64-64-28.654-64-64 28.654-64 64-64zm88 432c0 8.837-7.163 16-16 16H56c-8.837 0-16-7.163-16-16v-48c0-8.837 7.163-16 16-16h24V272H56c-8.837 0-16-7.163-16-16v-48c0-8.837 7.163-16 16-16h104c8.837 0 16 7.163 16 16v192h24c8.837 0 16 7.163 16 16v48z"] };
var faInfoCircle = { prefix: 'fal', iconName: 'info-circle', icon: [512, 512, [], "f05a", "M256 40c118.621 0 216 96.075 216 216 0 119.291-96.61 216-216 216-119.244 0-216-96.562-216-216 0-119.203 96.602-216 216-216m0-32C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm-36 344h12V232h-12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h48c6.627 0 12 5.373 12 12v140h12c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12h-72c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12zm36-240c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32z"] };
var faInfoSquare = { prefix: 'fal', iconName: 'info-square', icon: [448, 512, [], "f30f", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zm-228-80h12V232h-12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h48c6.627 0 12 5.373 12 12v140h12c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12h-72c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12zm36-240c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32z"] };
var faItalic = { prefix: 'fal', iconName: 'italic', icon: [256, 512, [], "f033", "M102.791 64h45.215L73.143 448H23.762a12 12 0 0 0-11.764 9.632l-1.61 8C8.892 473.062 14.573 480 22.151 480h128.817a12 12 0 0 0 11.764-9.632l1.61-8c1.495-7.43-4.186-14.368-11.764-14.368h-45.215l74.864-384h50.011a12 12 0 0 0 11.764-9.632l1.61-8C247.108 38.938 241.427 32 233.849 32H104.401a12 12 0 0 0-11.764 9.632l-1.61 8C89.532 57.062 95.213 64 102.791 64z"] };
var faJackOLantern = { prefix: 'fal', iconName: 'jack-o-lantern', icon: [576, 512, [], "f30e", "M304 64.2c.1-10.7-.7-26.5 34.6-32.4 8.7-1.5 14.6-9.7 13.2-18.4C350.3 4.7 344.8 0 336 0c-37.9 0-64.5 25.7-64 64.2C68.5 68.7 0 160.6 0 288c0 130.7 72 224 288 224s288-93.3 288-224c0-127.4-68.4-219.3-272-223.8zM288 480c-148.9 0-256-42.1-256-192C32 137.9 139.3 96 288 96c148.9 0 256 42.1 256 192 0 150.1-107.3 192-256 192zm32-192h96c12.4 0 20.1-13.6 13.7-24.2l-48-80c-6.2-10.4-21.2-10.3-27.4 0l-48 80c-3 4.9-3 11.1-.2 16.1 2.8 5 8.1 8.1 13.9 8.1zm48-64.9l19.7 32.9h-39.5l19.8-32.9zm95.7 115.1c-10.7 37.3-43.3 62.2-79.7 76.6V390c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6v34.7c-20.2 4.7-41.9 7.3-64 7.3s-43.8-2.5-64-7.3V390c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6v24.8c-36.4-14.4-69-39.3-79.7-76.6-1.8-6.3 4.3-11.9 10.4-9.7 34.2 12.4 81.5 20.4 133.3 22.8V378c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6v-26c63.9 0 124.2-8.6 165.3-23.5 6.1-2.2 12.2 3.4 10.4 9.7zM160 288h96c12.4 0 20.1-13.6 13.7-24.2l-48-80c-6.2-10.4-21.2-10.3-27.4 0l-48 80c-6.4 10.6 1.3 24.2 13.7 24.2zm48-64.9l19.7 32.9h-39.5l19.8-32.9z"] };
var faKey = { prefix: 'fal', iconName: 'key', icon: [512, 512, [], "f084", "M336 32c79.529 0 144 64.471 144 144s-64.471 144-144 144c-18.968 0-37.076-3.675-53.661-10.339L240 352h-48v64h-64v64H32v-80l170.339-170.339C195.675 213.076 192 194.968 192 176c0-79.529 64.471-144 144-144m0-32c-97.184 0-176 78.769-176 176 0 15.307 1.945 30.352 5.798 44.947L7.029 379.716A24.003 24.003 0 0 0 0 396.686V488c0 13.255 10.745 24 24 24h112c13.255 0 24-10.745 24-24v-40h40c13.255 0 24-10.745 24-24v-40h19.314c6.365 0 12.47-2.529 16.971-7.029l30.769-30.769C305.648 350.055 320.693 352 336 352c97.184 0 176-78.769 176-176C512 78.816 433.231 0 336 0zm48 108c11.028 0 20 8.972 20 20s-8.972 20-20 20-20-8.972-20-20 8.972-20 20-20m0-28c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48z"] };
var faKeyboard = { prefix: 'fal', iconName: 'keyboard', icon: [576, 512, [], "f11c", "M528 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h480c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm16 336c0 8.823-7.177 16-16 16H48c-8.823 0-16-7.177-16-16V112c0-8.823 7.177-16 16-16h480c8.823 0 16 7.177 16 16v288zM168 268v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm-336 80v-24c0-6.627-5.373-12-12-12H84c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm384 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zM120 188v-24c0-6.627-5.373-12-12-12H84c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm-96 152v-8c0-6.627-5.373-12-12-12H180c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h216c6.627 0 12-5.373 12-12z"] };
var faLanguage = { prefix: 'fal', iconName: 'language', icon: [640, 512, [], "f1ab", "M616 96H24c-13.255 0-24 10.745-24 24v272c0 13.255 10.745 24 24 24h592c13.255 0 24-10.745 24-24V120c0-13.255-10.745-24-24-24zM304 384H32V128h272v256zm304 0H336V128h272v256zM91.088 352h10.34a12 12 0 0 0 11.397-8.243l13.508-40.973h67.335l13.508 40.973A12.001 12.001 0 0 0 218.573 352h10.339c8.276 0 14.067-8.18 11.319-15.985l-59.155-168A12 12 0 0 0 169.757 160h-19.513a12 12 0 0 0-11.319 8.014l-59.155 168C77.021 343.82 82.812 352 91.088 352zm60.663-128.991c3.787-10.818 8.113-29.747 8.113-29.747h.541s4.057 18.929 7.572 29.747l17.036 51.38h-50.298l17.036-51.38zM384 212v-8c0-6.627 5.373-12 12-12h68v-20c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v20h68c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12h-15.699c-7.505 24.802-23.432 50.942-44.896 74.842 10.013 9.083 20.475 17.265 30.924 24.086 5.312 3.467 6.987 10.475 3.84 15.982l-3.987 6.976c-3.429 6.001-11.188 7.844-16.993 4.091-13.145-8.5-25.396-18.237-36.56-28.5-11.744 10.454-24.506 20.146-37.992 28.68-5.761 3.646-13.409 1.698-16.791-4.221l-3.972-6.95c-3.197-5.594-1.379-12.672 4.058-16.129 11.382-7.237 22.22-15.428 32.24-24.227-10.026-11.272-18.671-22.562-25.687-33.033-3.833-5.721-2.11-13.48 3.803-17.01l6.867-4.099c5.469-3.264 12.55-1.701 16.092 3.592 6.379 9.531 13.719 18.947 21.677 27.953 15.017-16.935 26.721-34.905 33.549-52.033H396c-6.627 0-12-5.373-12-12z"] };
var faLaptop = { prefix: 'fal', iconName: 'laptop', icon: [640, 512, [], "f109", "M112 352h416c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H112C85.5 0 64 21.5 64 48v256c0 26.5 21.5 48 48 48zM96 48c0-8.8 7.2-16 16-16h416c8.8 0 16 7.2 16 16v256c0 8.8-7.2 16-16 16H112c-8.8 0-16-7.2-16-16V48zm532 336H366c-3.3 0-6 2.7-6 6v10c0 13.3-10.7 24-24 24h-32c-13.3 0-24-10.7-24-24v-10c0-3.3-2.7-6-6-6H12c-6.6 0-12 5.4-12 12v68c0 26.5 21.5 48 48 48h544c26.5 0 48-21.5 48-48v-68c0-6.6-5.4-12-12-12zm-20 80c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16v-48h224c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32h224v48z"] };
var faLeaf = { prefix: 'fal', iconName: 'leaf', icon: [576, 512, [], "f06c", "M501.1 64c32.3 0 42.9 79.9 42.9 103.1 0 170.4-168.3 259.6-285.7 259.6-73 0-134.3-34.4-134.3-34.4-14.3 0-31.4 55.6-56.3 55.6-24 0-35.7-20.6-35.7-33 0-28.4 56.6-50.5 56.6-66.3 0 0-11.1-18.1-11.1-50.7 0-86.7 72.3-148.6 153.4-174.3 58.6-18.5 183.1 3 222.9-33C469.4 76.8 477.1 64 501.1 64m0-32c-38 0-54.3 22.1-68.6 34.8l-.1.1-.1.1c-25.8 23.4-151.8 7.5-211 26.2C124.6 123.7 45.4 198.1 45.4 298c0 18.8 3 34 6.4 45.3C32.5 358.4 0 380 0 415c0 31.7 27.6 65 67.7 65 31.1 0 48.9-26.9 63.2-48.9 26.6 11.4 74 27.6 127.4 27.6 128.9 0 317.7-97.6 317.7-291.6C576 113.5 556 32 501.1 32zM158.7 334c54.9-74.9 125.6-109.8 227.7-102.2 8.8.7 16.5-5.9 17.2-14.8.7-8.8-5.9-16.5-14.8-17.2-110.6-8.3-192.9 29.2-255.9 115.1-5.2 7.1-3.7 17.1 3.4 22.4 7.1 5.4 17.2 3.9 22.4-3.3z"] };
var faLemon = { prefix: 'fal', iconName: 'lemon', icon: [512, 512, [], "f094", "M489.038 22.963C473.784 7.709 454.948 0 437.954 0c-8.734 0-16.98 2.035-24.007 6.129-58.912 34.315-181.245-53.083-321.073 86.745C-46.948 232.697 40.441 355.041 6.129 413.945c-12.059 20.702-6.26 51.999 16.833 75.093 23.08 23.08 54.378 28.899 75.095 16.832 58.902-34.31 181.245 53.081 321.068-86.743C558.949 279.304 471.56 156.96 505.871 98.056c12.059-20.702 6.261-51.999-16.833-75.093zM478.22 81.95c-44.546 76.475 49.666 183.163-81.721 314.55-131.434 131.434-238.029 37.148-314.547 81.72-20.528 11.956-60.128-27.64-48.171-48.167 44.547-76.475-49.667-183.163 81.721-314.55C246.942-15.939 353.523 78.359 430.053 33.78c19.978-11.637 60.439 27.102 48.167 48.17zm-218.749 29.669c-31.89 7.086-64.973 26.511-93.157 54.694-28.184 28.185-47.608 61.268-54.694 93.157-1.657 7.457-8.271 12.533-15.604 12.533-1.149 0-2.316-.125-3.485-.385-8.626-1.917-14.065-10.464-12.148-19.09 8.391-37.756 30.872-76.41 63.306-108.843 32.433-32.434 71.087-54.915 108.843-63.306 8.628-1.919 17.173 3.522 19.09 12.148s-3.525 17.175-12.151 19.092z"] };
var faLevelDown = { prefix: 'fal', iconName: 'level-down', icon: [256, 512, [], "f149", "M252.478 408.503l-99.974 99.975c-4.697 4.697-12.311 4.697-17.008 0l-99.974-99.975c-4.696-4.697-4.696-12.311 0-17.008l8.503-8.503c4.697-4.697 12.311-4.697 17.007 0L126 447.959V36H24.024a11.996 11.996 0 0 1-8.485-3.515l-12-12C-4.021 12.926 1.333 0 12.024 0H138c13.255 0 24 10.745 24 24v423.959l64.967-64.966c4.697-4.697 12.311-4.697 17.007 0l8.503 8.503c4.697 4.696 4.697 12.31.001 17.007z"] };
var faLevelDownAlt = { prefix: 'fal', iconName: 'level-down-alt', icon: [256, 512, [], "f3be", "M216.01 384h-53.986V24c0-13.255-10.745-24-24-24h-118C9.333 0 3.979 12.926 11.539 20.485l12 12A12 12 0 0 0 32.024 36h94v348H72.037c-29.564 0-43.064 36.535-21.26 55.917l71.987 64c12.125 10.777 30.395 10.777 42.52 0l71.986-64C259.082 420.528 245.562 384 216.01 384zm.014 32l-72 64-72-64h144z"] };
var faLevelUp = { prefix: 'fal', iconName: 'level-up', icon: [256, 512, [], "f148", "M252.478 103.497L152.504 3.522c-4.697-4.697-12.311-4.697-17.008 0l-99.974 99.975c-4.696 4.697-4.696 12.311 0 17.008l8.503 8.503c4.697 4.697 12.311 4.697 17.007 0L126 64.041V476H24.024a11.996 11.996 0 0 0-8.485 3.515l-12 12C-4.021 499.074 1.333 512 12.024 512H138c13.255 0 24-10.745 24-24V64.041l64.967 64.966c4.697 4.697 12.311 4.697 17.007 0l8.503-8.503c4.697-4.696 4.697-12.31.001-17.007z"] };
var faLevelUpAlt = { prefix: 'fal', iconName: 'level-up-alt', icon: [256, 512, [], "f3bf", "M237.27 72.083l-71.986-64c-12.125-10.777-30.395-10.777-42.52 0l-71.987 64C28.973 91.465 42.473 128 72.037 128h53.987v348h-94a11.996 11.996 0 0 0-8.485 3.515l-12 12C3.979 499.074 9.333 512 20.024 512h118c13.255 0 24-10.745 24-24V128h53.986c29.552 0 43.072-36.528 21.26-55.917zM72.024 96l72-64 72 64h-144z"] };
var faLifeRing = { prefix: 'fal', iconName: 'life-ring', icon: [512, 512, [], "f1cd", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm168.766 113.176l-62.885 62.885a128.711 128.711 0 0 0-33.941-33.941l62.885-62.885a217.323 217.323 0 0 1 33.941 33.941zM256 352c-52.935 0-96-43.065-96-96s43.065-96 96-96 96 43.065 96 96-43.065 96-96 96zM363.952 68.853l-66.14 66.14c-26.99-9.325-56.618-9.33-83.624 0l-66.139-66.14c66.716-38.524 149.23-38.499 215.903 0zM121.176 87.234l62.885 62.885a128.711 128.711 0 0 0-33.941 33.941l-62.885-62.885a217.323 217.323 0 0 1 33.941-33.941zm-52.323 60.814l66.139 66.14c-9.325 26.99-9.33 56.618 0 83.624l-66.139 66.14c-38.523-66.715-38.5-149.229 0-215.904zm18.381 242.776l62.885-62.885a128.711 128.711 0 0 0 33.941 33.941l-62.885 62.885a217.366 217.366 0 0 1-33.941-33.941zm60.814 52.323l66.139-66.14c26.99 9.325 56.618 9.33 83.624 0l66.14 66.14c-66.716 38.524-149.23 38.499-215.903 0zm242.776-18.381l-62.885-62.885a128.711 128.711 0 0 0 33.941-33.941l62.885 62.885a217.323 217.323 0 0 1-33.941 33.941zm52.323-60.814l-66.14-66.14c9.325-26.99 9.33-56.618 0-83.624l66.14-66.14c38.523 66.715 38.5 149.229 0 215.904z"] };
var faLightbulb = { prefix: 'fal', iconName: 'lightbulb', icon: [384, 512, [], "f0eb", "M192 80c0 8.837-7.164 16-16 16-35.29 0-64 28.71-64 64 0 8.837-7.164 16-16 16s-16-7.163-16-16c0-52.935 43.065-96 96-96 8.836 0 16 7.163 16 16zm176 96c0 101.731-51.697 91.541-90.516 192.674a23.722 23.722 0 0 1-5.484 8.369V464h-.018a23.99 23.99 0 0 1-5.241 14.574l-19.535 24.419A24 24 0 0 1 228.465 512h-72.93a24 24 0 0 1-18.741-9.007l-19.535-24.419A23.983 23.983 0 0 1 112.018 464H112v-86.997a24.153 24.153 0 0 1-5.54-8.478c-38.977-101.401-90.897-90.757-90.457-193.822C16.415 78.01 95.306 0 192 0c97.195 0 176 78.803 176 176zM240 448h-96v12.775L159.38 480h65.24L240 460.775V448zm0-64h-96v32h96v-32zm96-208c0-79.59-64.424-144-144-144-79.59 0-144 64.423-144 144 0 87.475 44.144 70.908 86.347 176h115.306C291.779 247.101 336 263.222 336 176z"] };
var faLink = { prefix: 'fal', iconName: 'link', icon: [512, 512, [], "f0c1", "M301.148 394.702l-79.2 79.19c-50.778 50.799-133.037 50.824-183.84 0-50.799-50.778-50.824-133.037 0-183.84l79.19-79.2a132.833 132.833 0 0 1 3.532-3.403c7.55-7.005 19.795-2.004 20.208 8.286.193 4.807.598 9.607 1.216 14.384.481 3.717-.746 7.447-3.397 10.096-16.48 16.469-75.142 75.128-75.3 75.286-36.738 36.759-36.731 96.188 0 132.94 36.759 36.738 96.188 36.731 132.94 0l79.2-79.2.36-.36c36.301-36.672 36.14-96.07-.37-132.58-8.214-8.214-17.577-14.58-27.585-19.109-4.566-2.066-7.426-6.667-7.134-11.67a62.197 62.197 0 0 1 2.826-15.259c2.103-6.601 9.531-9.961 15.919-7.28 15.073 6.324 29.187 15.62 41.435 27.868 50.688 50.689 50.679 133.17 0 183.851zm-90.296-93.554c12.248 12.248 26.362 21.544 41.435 27.868 6.388 2.68 13.816-.68 15.919-7.28a62.197 62.197 0 0 0 2.826-15.259c.292-5.003-2.569-9.604-7.134-11.67-10.008-4.528-19.371-10.894-27.585-19.109-36.51-36.51-36.671-95.908-.37-132.58l.36-.36 79.2-79.2c36.752-36.731 96.181-36.738 132.94 0 36.731 36.752 36.738 96.181 0 132.94-.157.157-58.819 58.817-75.3 75.286-2.651 2.65-3.878 6.379-3.397 10.096a163.156 163.156 0 0 1 1.216 14.384c.413 10.291 12.659 15.291 20.208 8.286a131.324 131.324 0 0 0 3.532-3.403l79.19-79.2c50.824-50.803 50.799-133.062 0-183.84-50.802-50.824-133.062-50.799-183.84 0l-79.2 79.19c-50.679 50.682-50.688 133.163 0 183.851z"] };
var faLiraSign = { prefix: 'fal', iconName: 'lira-sign', icon: [384, 512, [], "f195", "M371.994 255.681h-16.255c-6.398 0-11.706 5.02-11.983 11.412-4.877 112.517-82.255 173.397-188.949 173.397h-46.834V240.396l170.631-37.918a12 12 0 0 0 9.397-11.714v-8.195c0-7.677-7.109-13.38-14.603-11.714l-165.425 36.761v-47.219l170.631-37.918a12 12 0 0 0 9.397-11.714v-8.195c0-7.677-7.109-13.38-14.603-11.714l-165.425 36.761V44c0-6.627-5.373-12-12-12H76c-6.627 0-12 5.373-12 12v93.387L9.397 149.521A12 12 0 0 0 0 161.235v8.196c0 7.677 7.109 13.379 14.603 11.714L64 170.168v47.219L9.397 229.521A12 12 0 0 0 0 241.235v8.195c0 7.677 7.109 13.38 14.603 11.714L64 250.168V468c0 6.627 5.373 12 12 12h83.268c130.519 0 219.608-76.854 224.724-211.914.256-6.78-5.213-12.405-11.998-12.405z"] };
var faList = { prefix: 'fal', iconName: 'list', icon: [512, 512, [], "f03a", "M506 114H134a6 6 0 0 1-6-6V84a6 6 0 0 1 6-6h372a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6zm6 154v-24a6 6 0 0 0-6-6H134a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h372a6 6 0 0 0 6-6zm0 160v-24a6 6 0 0 0-6-6H134a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h372a6 6 0 0 0 6-6zM84 120V72c0-6.627-5.373-12-12-12H24c-6.627 0-12 5.373-12 12v48c0 6.627 5.373 12 12 12h48c6.627 0 12-5.373 12-12zm0 160v-48c0-6.627-5.373-12-12-12H24c-6.627 0-12 5.373-12 12v48c0 6.627 5.373 12 12 12h48c6.627 0 12-5.373 12-12zm0 160v-48c0-6.627-5.373-12-12-12H24c-6.627 0-12 5.373-12 12v48c0 6.627 5.373 12 12 12h48c6.627 0 12-5.373 12-12z"] };
var faListAlt = { prefix: 'fal', iconName: 'list-alt', icon: [512, 512, [], "f022", "M464 64c8.823 0 16 7.178 16 16v352c0 8.822-7.177 16-16 16H48c-8.823 0-16-7.178-16-16V80c0-8.822 7.177-16 16-16h416m0-32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm-336 96c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm0 96c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm0 96c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm288-148v-24a6 6 0 0 0-6-6H198a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h212a6 6 0 0 0 6-6zm0 96v-24a6 6 0 0 0-6-6H198a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h212a6 6 0 0 0 6-6zm0 96v-24a6 6 0 0 0-6-6H198a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h212a6 6 0 0 0 6-6z"] };
var faListOl = { prefix: 'fal', iconName: 'list-ol', icon: [512, 512, [], "f0cb", "M5.495 142.993c0-6.444 3.401-9.847 9.847-9.847h17.365V79.798c0-4.834.179-9.847.179-9.847h-.359s-1.79 3.939-3.938 5.729l-1.611 1.432c-4.655 4.298-9.489 4.117-13.786-.537l-4.654-5.013c-4.475-4.654-4.297-9.486.358-13.962l22.2-20.767C34.854 33.432 38.256 32 43.268 32h10.205c6.444 0 9.846 3.4 9.846 9.846v91.301h17.544c6.444 0 9.847 3.402 9.847 9.847v7.162c0 6.443-3.402 9.846-9.847 9.846H15.341c-6.445 0-9.847-3.402-9.847-9.846v-7.163zm-1.776 163.45c0-46.482 54.405-54.757 54.405-72.891 0-8.803-7.044-12.501-13.558-12.501-5.634 0-10.387 2.993-13.381 6.163-4.402 4.225-8.98 5.986-13.733 2.112l-6.866-5.458c-4.93-3.874-6.163-8.275-2.465-13.029C14.284 202.74 26.432 192 47.384 192c20.599 0 42.96 11.796 42.96 38.559 0 39.263-50.883 46.834-52.467 63.031h44.72c6.339 0 9.684 3.346 9.684 9.684v7.044c0 6.337-3.345 9.683-9.684 9.683H14.108c-5.986 0-10.388-3.346-10.388-9.683v-3.875zm2.875 149.436l4.754-7.747c3.345-5.457 7.746-5.81 13.204-2.464 4.754 2.64 10.917 5.281 17.959 5.281 11.445 0 17.959-5.634 17.959-12.501 0-9.859-9.86-13.909-23.417-13.909h-.704c-5.634 0-8.451-1.761-10.916-6.691l-.881-1.761c-2.112-4.049-1.233-8.451 2.289-12.5l11.445-13.91c5.986-7.219 10.917-11.797 10.917-11.797v-.352s-4.049.88-11.973.88H16.805c-6.338 0-9.683-3.344-9.683-9.683v-7.043c0-6.339 3.345-9.683 9.683-9.683h60.039c6.338 0 9.684 3.344 9.684 9.507v2.817c0 4.93-1.233 8.276-4.402 11.973l-21.128 24.298c18.663 4.049 30.459 18.838 30.459 36.445C91.458 458.52 76.316 480 44.8 480c-17.078 0-29.051-5.986-36.094-10.739-4.93-3.522-5.281-8.276-2.112-13.382zM512 108V84a6 6 0 0 0-6-6H134a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h372a6 6 0 0 0 6-6zm0 160v-24a6 6 0 0 0-6-6H134a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h372a6 6 0 0 0 6-6zm0 160v-24a6 6 0 0 0-6-6H134a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h372a6 6 0 0 0 6-6z"] };
var faListUl = { prefix: 'fal', iconName: 'list-ul', icon: [512, 512, [], "f0ca", "M506 114H134a6 6 0 0 1-6-6V84a6 6 0 0 1 6-6h372a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6zm6 154v-24a6 6 0 0 0-6-6H134a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h372a6 6 0 0 0 6-6zm0 160v-24a6 6 0 0 0-6-6H134a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6h372a6 6 0 0 0 6-6zM48 60c-19.882 0-36 16.118-36 36s16.118 36 36 36 36-16.118 36-36-16.118-36-36-36zm0 160c-19.882 0-36 16.118-36 36s16.118 36 36 36 36-16.118 36-36-16.118-36-36-36zm0 160c-19.882 0-36 16.118-36 36s16.118 36 36 36 36-16.118 36-36-16.118-36-36-36z"] };
var faLocationArrow = { prefix: 'fal', iconName: 'location-arrow', icon: [512, 512, [], "f124", "M507.38 68.225L315.582 484.108C294.161 530.519 224 515.72 224 463.993V288H47.933c-51.323 0-66.635-70.111-20.115-91.582L443.683 4.529c39.945-18.437 82.602 22.735 63.697 63.696zm-50.156-34.697L41.278 225.457c-15.491 7.149-10.443 30.526 6.708 30.526H256v208c0 17.923 23.596 21.722 30.527 6.705L478.452 54.769c6.3-13.653-7.795-27.441-21.228-21.241z"] };
var faLock = { prefix: 'fal', iconName: 'lock', icon: [448, 512, [], "f023", "M400 224h-16v-62.5C384 73.1 312.9.3 224.5 0 136-.3 64 71.6 64 160v64H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zM96 160c0-70.6 57.4-128 128-128s128 57.4 128 128v64H96v-64zm304 320H48c-8.8 0-16-7.2-16-16V272c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v192c0 8.8-7.2 16-16 16z"] };
var faLockAlt = { prefix: 'fal', iconName: 'lock-alt', icon: [448, 512, [], "f30d", "M224 420c-11 0-20-9-20-20v-64c0-11 9-20 20-20s20 9 20 20v64c0 11-9 20-20 20zm224-148v192c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V272c0-26.5 21.5-48 48-48h16v-64C64 71.6 136-.3 224.5 0 312.9.3 384 73.1 384 161.5V224h16c26.5 0 48 21.5 48 48zM96 224h256v-64c0-70.6-57.4-128-128-128S96 89.4 96 160v64zm320 240V272c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v192c0 8.8 7.2 16 16 16h352c8.8 0 16-7.2 16-16z"] };
var faLockOpen = { prefix: 'fal', iconName: 'lock-open', icon: [640, 512, [], "f3c1", "M480.5 0C392-.3 320 71.6 320 160v64H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48h-48v-62.6c0-70.7 56.7-129 127.3-129.4C550.2 31.6 608 89.2 608 160v84c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-82.5C640 73.1 568.9.3 480.5 0zM400 256c8.8 0 16 7.2 16 16v192c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V272c0-8.8 7.2-16 16-16h352z"] };
var faLockOpenAlt = { prefix: 'fal', iconName: 'lock-open-alt', icon: [640, 512, [], "f3c2", "M227 417c-11 0-20-9-20-20v-64c0-11 9-20 20-20s20 9 20 20v64c0 11-9 20-20 20zM480.5 0C392-.3 320 71.6 320 160v64H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48h-48v-62.6c0-70.7 56.7-129 127.3-129.4C550.2 31.6 608 89.2 608 160v84c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-82.5C640 73.1 568.9.3 480.5 0zM400 256c8.8 0 16 7.2 16 16v192c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V272c0-8.8 7.2-16 16-16h352z"] };
var faLongArrowAltDown = { prefix: 'fal', iconName: 'long-arrow-alt-down', icon: [256, 512, [], "f309", "M223.351 320H145V44c0-6.627-5.373-12-12-12h-10c-6.627 0-12 5.373-12 12v276H32.652c-29.388 0-43.268 34.591-23.231 54.627l95.952 96c12.497 12.496 32.757 12.497 45.255 0l95.955-96C266.56 354.65 252.85 320 223.351 320zM128 448l-96-96h192l-96 96z"] };
var faLongArrowAltLeft = { prefix: 'fal', iconName: 'long-arrow-alt-left', icon: [448, 512, [], "f30a", "M160 351.351V273h276c6.627 0 12-5.373 12-12v-10c0-6.627-5.373-12-12-12H160v-78.348c0-29.388-34.591-43.268-54.627-23.231l-96 95.952c-12.496 12.497-12.497 32.757 0 45.255l96 95.955C125.35 394.56 160 380.85 160 351.351zM32 256l96-96v192l-96-96z"] };
var faLongArrowAltRight = { prefix: 'fal', iconName: 'long-arrow-alt-right', icon: [448, 512, [], "f30b", "M288 160.649V239H12c-6.627 0-12 5.373-12 12v10c0 6.627 5.373 12 12 12h276v78.348c0 29.388 34.591 43.268 54.627 23.231l96-95.952c12.496-12.497 12.497-32.757 0-45.255l-96-95.955C322.65 117.44 288 131.15 288 160.649zM416 256l-96 96V160l96 96z"] };
var faLongArrowAltUp = { prefix: 'fal', iconName: 'long-arrow-alt-up', icon: [256, 512, [], "f30c", "M32.649 192H111v276c0 6.627 5.373 12 12 12h10c6.627 0 12-5.373 12-12V192h78.348c29.388 0 43.268-34.591 23.231-54.627l-95.952-96c-12.497-12.496-32.757-12.497-45.255 0l-95.955 96C-10.56 157.35 3.15 192 32.649 192zM128 64l96 96H32l96-96z"] };
var faLongArrowDown = { prefix: 'fal', iconName: 'long-arrow-down', icon: [256, 512, [], "f175", "M252.485 343.03l-7.07-7.071c-4.686-4.686-12.284-4.686-16.971 0L145 419.887V44c0-6.627-5.373-12-12-12h-10c-6.627 0-12 5.373-12 12v375.887l-83.444-83.928c-4.686-4.686-12.284-4.686-16.971 0l-7.07 7.071c-4.686 4.686-4.686 12.284 0 16.97l116 116.485c4.686 4.686 12.284 4.686 16.971 0l116-116.485c4.686-4.686 4.686-12.284-.001-16.97z"] };
var faLongArrowLeft = { prefix: 'fal', iconName: 'long-arrow-left', icon: [448, 512, [], "f177", "M136.97 380.485l7.071-7.07c4.686-4.686 4.686-12.284 0-16.971L60.113 273H436c6.627 0 12-5.373 12-12v-10c0-6.627-5.373-12-12-12H60.113l83.928-83.444c4.686-4.686 4.686-12.284 0-16.971l-7.071-7.07c-4.686-4.686-12.284-4.686-16.97 0l-116.485 116c-4.686 4.686-4.686 12.284 0 16.971l116.485 116c4.686 4.686 12.284 4.686 16.97-.001z"] };
var faLongArrowRight = { prefix: 'fal', iconName: 'long-arrow-right', icon: [448, 512, [], "f178", "M311.03 131.515l-7.071 7.07c-4.686 4.686-4.686 12.284 0 16.971L387.887 239H12c-6.627 0-12 5.373-12 12v10c0 6.627 5.373 12 12 12h375.887l-83.928 83.444c-4.686 4.686-4.686 12.284 0 16.971l7.071 7.07c4.686 4.686 12.284 4.686 16.97 0l116.485-116c4.686-4.686 4.686-12.284 0-16.971L328 131.515c-4.686-4.687-12.284-4.687-16.97 0z"] };
var faLongArrowUp = { prefix: 'fal', iconName: 'long-arrow-up', icon: [256, 512, [], "f176", "M3.515 168.97l7.07 7.071c4.686 4.686 12.284 4.686 16.971 0L111 92.113V468c0 6.627 5.373 12 12 12h10c6.627 0 12-5.373 12-12V92.113l83.444 83.928c4.686 4.686 12.284 4.686 16.971 0l7.07-7.071c4.686-4.686 4.686-12.284 0-16.97l-116-116.485c-4.686-4.686-12.284-4.686-16.971 0L3.515 152c-4.687 4.686-4.687 12.284 0 16.97z"] };
var faLowVision = { prefix: 'fal', iconName: 'low-vision', icon: [576, 512, [], "f2a8", "M569.348 231.63C512.998 135.99 407.86 72 288 72c-36.303 0-71.26 5.877-103.93 16.722L121.889 4.913c-4-5.391-11.612-6.519-17.003-2.519l-6.507 4.828c-5.391 4-6.519 11.613-2.519 17.004l56.926 76.726C91.489 128.594 40.334 174.447 6.637 231.631c-8.979 15.238-8.719 33.949.004 48.739 30.605 51.943 75.611 94.537 129.537 122.627C29.589 259.268 39.873 273.724 34.215 264.124a16.006 16.006 0 0 1 0-16.247 287.008 287.008 0 0 1 16.929-25.491L204.72 429.39c15 3.91 30.42 6.78 46.18 8.54L72.243 197.124a293.367 293.367 0 0 1 33.449-30.602L308.14 439.39c12.42-.74 24.66-2.18 36.68-4.27L131.942 148.202a293.06 293.06 0 0 1 7.594-4.553 292.057 292.057 0 0 1 32.824-16.313l281.751 379.751c4 5.391 11.612 6.519 17.003 2.519l6.507-4.828c5.391-4 6.519-11.613 2.519-17.004l-56.917-76.714c61.284-27.629 112.419-73.491 146.124-130.69a47.961 47.961 0 0 0 .001-48.74zM362.31 328.959l-38.511-51.906c27.52-18.592 35.914-54.676 20.671-83.193v.02c0 14.56-11.8 26.36-26.35 26.36-14.56 0-26.36-11.8-26.36-26.36 0-14.55 11.8-26.35 26.36-26.35h.02c-22.278-11.908-50.192-9.748-70.538 6.823l-34.7-46.77C233.992 112.746 259.945 104 288 104c70.69 0 128 55.52 128 124 0 41.637-21.187 78.478-53.69 100.959zm179.47-64.839c-31.903 54.148-80.569 96.241-138.133 120.555l-22.24-29.975c74.24-52.148 88.248-153.521 32.713-222.709 54.32 25.45 98.59 66.55 127.66 115.89a15.958 15.958 0 0 1 0 16.239z"] };
var faLuchador = { prefix: 'fal', iconName: 'luchador', icon: [448, 512, [], "f455", "M224 0C100.3 0 0 100.3 0 224v128c0 88.4 71.6 160 160 160h128c88.4 0 160-71.6 160-160V224C448 100.3 347.7 0 224 0zm192 352c0 70.6-57.4 128-128 128H160c-70.6 0-128-57.4-128-128V224c0-105.9 86.1-192 192-192s192 86.1 192 192v128zM226.5 226.2c-.9-.7-4.2-.7-5.1 0C213.3 188.3 182 160 144 160H76c-6.6 0-12 5.4-12 12v30.7c0 47.1 35.8 85.3 80 85.3h22.4c-7.4 12.2-12.5 23.5-15.8 32.9-30.9 4.6-54.6 31-54.6 63.1 0 35.5 29.4 64 64.9 64H287c35.5 0 64.9-28.5 64.9-64 0-32.1-23.7-58.5-54.6-63.1-3.3-9.5-8.4-20.7-15.8-32.9H304c44.2 0 80-38.2 80-85.3V172c0-6.6-5.4-12-12-12h-68c-37.9 0-69.3 28.3-77.5 66.2zm36.2 93.8h-77.4c6.8-14.8 18.5-33.4 38.7-53.3 20.2 19.9 31.9 38.5 38.7 53.3zM144 256c-26.5 0-48-23.9-48-53.3V192h48c26.5 0 48 23.9 48 53.3v8.7c-.6.7-1.2 1.3-1.8 2H144zm176 128c0 17.6-14.4 32-32 32H160c-17.6 0-32-14.4-32-32s14.4-32 32-32h128c17.6 0 32 14.4 32 32zm32-181.3c0 29.4-21.5 53.3-48 53.3h-46.2c-.6-.7-1.2-1.3-1.8-2v-8.7c0-29.4 21.5-53.3 48-53.3h48v10.7z"] };
var faMagic = { prefix: 'fal', iconName: 'magic', icon: [512, 512, [], "f0d0", "M176 60.9l6.2 12.7 14 2-10.1 9.8 2.4 13.9-12.5-6.5-12.5 6.6 2.4-13.9-10.1-9.8 14-2 6.2-12.8m-5.1-25.7L159.2 59 133 62.8c-4.7.7-6.6 6.5-3.2 9.8l19 18.5-4.5 26.1c-.8 4.7 4.1 8.3 8.3 6.1L176 111l23.4 12.3c4.2 2.2 9.1-1.4 8.3-6.1L203.3 91l19-18.5c3.4-3.3 1.5-9.1-3.2-9.8l-26.2-3.8-11.7-23.8c-2.1-4.1-8.2-4.2-10.3.1zm97.7-16.6l-7.8 15.8-17.5 2.6c-3.1.5-4.4 4.3-2.1 6.5l12.6 12.3-3 17.4c-.5 3.1 2.8 5.5 5.6 4L272 69l15.6 8.2c2.8 1.5 6.1-.9 5.6-4l-3-17.4 12.6-12.3c2.3-2.2 1-6.1-2.1-6.5l-17.5-2.5-7.8-15.8c-1.4-3-5.4-3-6.8-.1zm-192 0l-7.8 15.8L51.3 37c-3.1.5-4.4 4.3-2.1 6.5l12.6 12.3-3 17.4c-.5 3.1 2.8 5.5 5.6 4L80 69l15.6 8.2c2.8 1.5 6.1-.9 5.6-4l-3-17.4 12.6-12.3c2.3-2.2 1-6.1-2.1-6.5l-17.5-2.5-7.8-15.8c-1.4-3-5.4-3-6.8-.1zm384 191.5l-7.8 15.8-17.5 2.5c-3.1.5-4.4 4.3-2.1 6.5l12.6 12.3-3 17.4c-.5 3.1 2.8 5.5 5.6 4l15.6-8.2 15.6 8.2c2.8 1.5 6.1-.9 5.6-4l-3-17.4 12.6-12.3c2.3-2.2 1-6.1-2.1-6.5l-17.5-2.5-7.8-15.8c-1.4-2.8-5.4-2.8-6.8 0zM76.1 502.6L9.4 435.9c-12.5-12.5-12.5-32.8 0-45.3L390.6 9.4c12.5-12.5 32.8-12.5 45.3 0l66.7 66.7c12.5 12.5 12.5 32.8 0 45.3L121.4 502.6c-12.5 12.5-32.8 12.5-45.3 0zm282-281.9L291.4 154 32 413.3 98.7 480l259.4-259.3zM480 98.7L413.3 32 314 131.3l66.7 66.7L480 98.7z"] };
var faMagnet = { prefix: 'fal', iconName: 'magnet', icon: [512, 512, [], "f076", "M372 32c-19.9 0-36 16.1-36 36v172c0 64-40 96-79.9 96-40 0-80.1-32-80.1-96V68c0-19.9-16.1-36-36-36H36.4C16.4 32 .2 48.3.4 68.4c.3 24.5.6 58.4.7 91.6H0v32h1.1C1 218.3.7 242 0 257.3 0 408 136.2 504 256.8 504 377.5 504 512 408 512 257.3V68c0-19.9-16.1-36-36-36H372zM36.5 68H140v92H37.1c-.1-33.4-.4-67.4-.6-92zM476 258.1c-.1 30.4-6.6 59.3-19.4 85.8-11.9 24.9-29 47.2-50.8 66.3-20.6 18.1-45.2 32.9-71.2 42.9-25.5 9.8-52.4 15-77.9 15-25.5 0-52.5-5.2-78.2-15-26.2-10-51-24.9-71.8-43-22-19.2-39.2-41.5-51.3-66.3-12.9-26.5-19.4-55.3-19.6-85.6.7-15.9 1-39.7 1.1-66.1H140v48c0 49.2 18.9 79.7 34.8 96.6 10.8 11.5 23.5 20.4 37.8 26.5 13.8 5.9 28.5 8.9 43.5 8.9s29.7-3 43.5-8.9c14.3-6.1 27-15 37.7-26.5 15.8-16.9 34.7-47.4 34.7-96.6v-48h102.9c.1 26.2.4 50.1 1.1 66zM372 160V68h103.5c-.3 24.6-.6 58.6-.6 92H372z"] };
var faMale = { prefix: 'fal', iconName: 'male', icon: [256, 512, [], "f183", "M198.746 140.274C209.582 125.647 216 107.56 216 88c0-48.523-39.477-88-88-88S40 39.477 40 88c0 19.56 6.418 37.647 17.254 52.274C28.585 150.478 8 177.873 8 210v105c0 24.74 17.041 45.576 40 51.387V459c0 29.224 23.776 53 53 53h54c29.224 0 53-23.776 53-53v-92.613c22.959-5.812 40-26.647 40-51.387V210c0-32.127-20.585-59.522-49.254-69.726zM128 32c30.928 0 56 25.072 56 56s-25.072 56-56 56-56-25.072-56-56 25.072-56 56-56zm88 283c0 11.598-9.402 21-21 21h-19v123c0 11.598-9.402 21-21 21h-54c-11.598 0-21-9.402-21-21V336H61c-11.598 0-21-9.402-21-21V210c0-23.196 18.804-42 42-42h9.36c22.711 10.443 49.59 10.894 73.28 0H174c23.196 0 42 18.804 42 42v105z"] };
var faMap = { prefix: 'fal', iconName: 'map', icon: [576, 512, [], "f279", "M531.004 34.78L397.62 94.04 184.791 33.231a31.997 31.997 0 0 0-21.788 1.527l-144 64A32 32 0 0 0 0 128v319.978c0 23.291 23.994 38.577 44.996 29.242l133.384-59.26 212.829 60.808a31.997 31.997 0 0 0 21.788-1.527l144-64A31.997 31.997 0 0 0 576 384V64.022c0-23.291-23.994-38.577-44.996-29.242zM192 68.571l192 54.857v320l-192-54.857v-320zM32 448V128l128-56.889v320L32 448zm512-64l-128 56.889v-320L544 64v320z"] };
var faMapMarker = { prefix: 'fal', iconName: 'map-marker', icon: [384, 512, [], "f041", "M192 0C85.961 0 0 85.961 0 192c0 77.413 26.97 99.031 172.268 309.67 9.534 13.772 29.929 13.774 39.465 0C357.03 291.031 384 269.413 384 192 384 85.961 298.039 0 192 0zm0 473.931C52.705 272.488 32 256.494 32 192c0-42.738 16.643-82.917 46.863-113.137S149.262 32 192 32s82.917 16.643 113.137 46.863S352 149.262 352 192c0 64.49-20.692 80.47-160 281.931z"] };
var faMapMarkerAlt = { prefix: 'fal', iconName: 'map-marker-alt', icon: [384, 512, [], "f3c5", "M192 96c-52.935 0-96 43.065-96 96s43.065 96 96 96 96-43.065 96-96-43.065-96-96-96zm0 160c-35.29 0-64-28.71-64-64s28.71-64 64-64 64 28.71 64 64-28.71 64-64 64zm0-256C85.961 0 0 85.961 0 192c0 77.413 26.97 99.031 172.268 309.67 9.534 13.772 29.929 13.774 39.465 0C357.03 291.031 384 269.413 384 192 384 85.961 298.039 0 192 0zm0 473.931C52.705 272.488 32 256.494 32 192c0-42.738 16.643-82.917 46.863-113.137S149.262 32 192 32s82.917 16.643 113.137 46.863S352 149.262 352 192c0 64.49-20.692 80.47-160 281.931z"] };
var faMapPin = { prefix: 'fal', iconName: 'map-pin', icon: [320, 512, [], "f276", "M304 144C304 65.097 240.54 1.016 161.876.012 82.447-1.002 16.017 64.534 16 143.969c-.016 74.134 55.992 135.18 128 143.142v195.807l10.452 25.368c2.041 4.952 9.055 4.952 11.095 0L176 482.917V287.111C247.998 279.15 304 218.12 304 144zM160 256c-61.898 0-112-50.092-112-112C48 82.102 98.092 32 160 32c61.898 0 112 50.092 112 112 0 61.898-50.092 112-112 112zm8-176c0 8.837-7.163 16-16 16-22.056 0-40 17.944-40 40 0 8.837-7.163 16-16 16s-16-7.163-16-16c0-39.701 32.299-72 72-72 8.837 0 16 7.163 16 16z"] };
var faMapSigns = { prefix: 'fal', iconName: 'map-signs', icon: [512, 512, [], "f277", "M272 160v64h184c13.233 0 24 10.767 24 24v80c0 13.233-10.767 24-24 24H272v148c0 6.627-5.373 12-12 12h-8c-6.627 0-12-5.373-12-12V352H83.313a23.84 23.84 0 0 1-16.97-7.029l-45.657-45.657c-6.249-6.248-6.249-16.379 0-22.627l45.657-45.657a23.84 23.84 0 0 1 16.97-7.029H240v-64H56c-13.233 0-24-10.767-24-24V56c0-13.233 10.767-24 24-24h184V12c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v20h156.687a23.84 23.84 0 0 1 16.97 7.029l45.657 45.657c6.249 6.248 6.249 16.379 0 22.627l-45.657 45.657a23.84 23.84 0 0 1-16.97 7.029H272zm185.373-64l-32-32H64v64h361.373l32-32zM448 256H86.627l-32 32 32 32H448v-64z"] };
var faMars = { prefix: 'fal', iconName: 'mars', icon: [384, 512, [], "f222", "M372 64h-88c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h45.4l-95.5 95.5C209.2 171.8 178 160 144 160 64.5 160 0 224.5 0 304s64.5 144 144 144 144-64.5 144-144c0-34-11.8-65.2-31.5-89.9l95.5-95.5V164c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12zM144 416c-61.9 0-112-50-112-112 0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112z"] };
var faMarsDouble = { prefix: 'fal', iconName: 'mars-double', icon: [512, 512, [], "f227", "M288 208c0-34-11.8-65.2-31.5-89.9L320 54.6V100c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V12c0-6.6-5.4-12-12-12h-88c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h45.4l-63.5 63.5C209.2 75.8 178 64 144 64 64.5 64 0 128.5 0 208s64.5 144 144 144 144-64.5 144-144zM144 320c-61.9 0-112-50-112-112 0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112zm368-148v88c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12v-45.4l-63.5 63.5C436.2 302.8 448 334 448 368c0 79.5-64.5 144-144 144-74.4 0-135.6-56.4-143.2-128.8 10.7-1 21.2-3 31.6-6C197 434.7 245.1 480 304 480c62 0 112-50.1 112-112 0-59-45.4-107-102.8-111.6 3-10.4 4.9-20.9 6-31.6 28.1 2.9 53.8 14 74.7 30.7l63.5-63.5H412c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h88c6.6 0 12 5.4 12 12z"] };
var faMarsStroke = { prefix: 'fal', iconName: 'mars-stroke', icon: [384, 512, [], "f229", "M372 64h-88c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h45.4l-49.6 49.6-31.1-31.1c-4.7-4.7-12.3-4.7-17 0l-5.7 5.7c-4.7 4.7-4.7 12.3 0 17l31.1 31.1-23.3 23.3C209.2 171.8 178 160 144 160 64.5 160 0 224.5 0 304s64.5 144 144 144 144-64.5 144-144c0-34-11.8-65.2-31.5-89.9l23.3-23.3 31.1 31.1c4.7 4.7 12.3 4.7 17 0l5.7-5.7c4.7-4.7 4.7-12.3 0-17l-31.1-31.1 49.6-49.6V164c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V76c-.1-6.6-5.5-12-12.1-12zM144 416c-61.9 0-112-50-112-112 0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112z"] };
var faMarsStrokeH = { prefix: 'fal', iconName: 'mars-stroke-h', icon: [480, 512, [], "f22b", "M474.9 247.5l-62.2-62.2c-4.7-4.7-12.3-4.7-17 0L390 191c-4.7 4.7-4.7 12.3 0 17l32.1 32.1H352v-44c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v44h-32.9c-3.5-31.4-17.2-61.8-41.3-85.8-56.2-56.2-147.4-56.2-203.6 0-56.2 56.2-56.2 147.4 0 203.6 56.2 56.2 147.4 56.2 203.6 0 24-24 37.8-54.5 41.3-85.8H320v44c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-44h70.2l-32.1 32.1c-4.7 4.7-4.7 12.3 0 17l5.7 5.7c4.7 4.7 12.3 4.7 17 0l62.2-62.2c4.6-4.9 4.6-12.5-.1-17.2zM144 368c-61.9 0-112-50-112-112 0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112z"] };
var faMarsStrokeV = { prefix: 'fal', iconName: 'mars-stroke-v', icon: [288, 512, [], "f22a", "M245.8 234.2c-24-24-54.5-37.8-85.8-41.3V160h44c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12h-44V57.8l32.1 32.1c4.7 4.7 12.3 4.7 17 0l5.7-5.7c4.7-4.7 4.7-12.3 0-17L152.5 5.1c-4.7-4.7-12.3-4.7-17 0L73.3 67.3c-4.7 4.7-4.7 12.3 0 17L79 90c4.7 4.7 12.3 4.7 17 0l32-32.2V128H84c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h44v32.9c-31.4 3.5-61.8 17.2-85.8 41.3-56.2 56.2-56.2 147.4 0 203.6 56.2 56.2 147.4 56.2 203.6 0 56.3-56.2 56.3-147.4 0-203.6zM144 448c-61.9 0-112-50-112-112 0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112z"] };
var faMedkit = { prefix: 'fal', iconName: 'medkit', icon: [512, 512, [], "f0fa", "M464 96H352V56c0-13.255-10.745-24-24-24H184c-13.255 0-24 10.745-24 24v40H48c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V144c0-26.51-21.49-48-48-48zM192 64h128v32H192V64zm192 64v320H128V128h256zM32 432V144c0-8.822 7.178-16 16-16h48v320H48c-8.822 0-16-7.178-16-16zm448 0c0 8.822-7.178 16-16 16h-48V128h48c8.822 0 16 7.178 16 16v288zM352 272v32c0 6.627-5.373 12-12 12h-56v56c0 6.627-5.373 12-12 12h-32c-6.627 0-12-5.373-12-12v-56h-56c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h56v-56c0-6.627 5.373-12 12-12h32c6.627 0 12 5.373 12 12v56h56c6.627 0 12 5.373 12 12z"] };
var faMeh = { prefix: 'fal', iconName: 'meh', icon: [512, 512, [], "f11a", "M256 40c118.664 0 216 96.055 216 216 0 118.664-96.055 216-216 216-118.664 0-216-96.055-216-216 0-118.664 96.055-216 216-216m0-32C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm80 312H176c-21.179 0-21.169 32 0 32h160c21.179 0 21.169-32 0-32zm-16-176a47.789 47.789 0 0 0-22.603 5.647h.015c10.916 0 19.765 8.849 19.765 19.765s-8.849 19.765-19.765 19.765-19.765-8.849-19.765-19.765v-.015A47.789 47.789 0 0 0 272 192c0 26.51 21.49 48 48 48s48-21.49 48-48-21.49-48-48-48zm-128 0a47.789 47.789 0 0 0-22.603 5.647h.015c10.916 0 19.765 8.849 19.765 19.765s-8.849 19.765-19.765 19.765-19.765-8.849-19.765-19.765v-.015A47.789 47.789 0 0 0 144 192c0 26.51 21.49 48 48 48s48-21.49 48-48-21.49-48-48-48z"] };
var faMercury = { prefix: 'fal', iconName: 'mercury', icon: [288, 512, [], "f223", "M288 208c0-57-33.1-106.2-81.1-129.6 24-14.9 40.9-37.9 45.3-64.5C253.4 6.6 247.7 0 240.3 0h-8.1c-5.7 0-10.7 4.1-11.8 9.7C214.8 40.4 182.7 64 144 64S73.2 40.4 67.6 9.7C66.6 4 61.6 0 55.8 0h-8.1c-7.4 0-13.1 6.6-11.9 13.9 4.4 26.6 21.3 49.7 45.3 64.5C33.1 101.8 0 151 0 208c0 74.2 56.2 135.3 128.3 143.1-.2.9-.3 1.8-.3 2.7V416H76c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h52v52c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-52h52c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12h-52v-62.2c0-.9-.1-1.8-.3-2.7C231.8 343.3 288 282.2 288 208zM144 320c-61.9 0-112-50-112-112 0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112z"] };
var faMicrochip = { prefix: 'fal', iconName: 'microchip', icon: [512, 512, [], "f2db", "M368 0H144c-26.51 0-48 21.49-48 48v416c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48V48c0-26.51-21.49-48-48-48zm16 464c0 8.822-7.178 16-16 16H144c-8.822 0-16-7.178-16-16V48c0-8.822 7.178-16 16-16h224c8.822 0 16 7.178 16 16v416zm128-358v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42V88h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zm0 96v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42v-48h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zm0 96v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42v-48h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zm0 96v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42v-48h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zM30 376h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6zm0-96h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6zm0-96h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6zm0-96h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6z"] };
var faMicrophone = { prefix: 'fal', iconName: 'microphone', icon: [320, 512, [], "f130", "M160 352c53.019 0 96-42.981 96-96V96c0-53.019-42.981-96-96-96S64 42.981 64 96v160c0 53.019 42.981 96 96 96zM96 96c0-35.29 28.71-64 64-64s64 28.71 64 64v160c0 35.29-28.71 64-64 64s-64-28.71-64-64V96zm224 124v36c0 82.825-63.26 151.149-144 159.202V480h68c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h68v-64.798C63.26 407.149 0 338.825 0 256v-36c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v36c0 70.579 57.42 128 128 128 70.579 0 128-57.421 128-128v-36c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12z"] };
var faMicrophoneAlt = { prefix: 'fal', iconName: 'microphone-alt', icon: [320, 512, [], "f3c9", "M160 352c53.019 0 96-42.981 96-96V96c0-53.019-42.981-96-96-96S64 42.981 64 96v160c0 53.019 42.981 96 96 96zM96 96c0-35.29 28.71-64 64-64s64 28.71 64 64h-58a6 6 0 0 0-6 6v20a6 6 0 0 0 6 6h58v32h-58a6 6 0 0 0-6 6v20a6 6 0 0 0 6 6h58v32h-58a6 6 0 0 0-6 6v20a6 6 0 0 0 6 6h58c0 35.29-28.71 64-64 64s-64-28.71-64-64V96zm224 124v36c0 82.825-63.26 151.149-144 159.202V480h68c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h68v-64.798C63.26 407.149 0 338.825 0 256v-36c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v36c0 70.579 57.42 128 128 128 70.579 0 128-57.421 128-128v-36c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12z"] };
var faMicrophoneSlash = { prefix: 'fal', iconName: 'microphone-slash', icon: [512, 512, [], "f131", "M404.788 314.846l-25.266-25.266C385.094 269.104 384 256.755 384 220c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12 0 37.59 2.072 61.378-11.212 94.846zM192 96c0-35.29 28.71-64 64-64s64 28.71 64 64v134.059l31.816 31.816c.117-1.944.184-3.901.184-5.875V96c0-53.019-42.981-96-96-96-45.044 0-82.836 31.025-93.188 72.87L192 102.059V96zm316.485 406.829l-5.656 5.656c-4.686 4.686-12.284 4.686-16.97 0L357.197 379.824c-23.708 19.414-53.064 32.173-85.197 35.378V480h68c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H172c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h68v-64.798C159.26 407.149 96 338.825 96 256v-36c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v36c0 70.579 57.42 128 128 128 29.535 0 56.762-10.06 78.445-26.928l-22.829-22.829C295.924 345.419 276.733 352 256 352c-53.019 0-96-42.981-96-96v-73.373L3.515 26.142c-4.686-4.686-4.686-12.284 0-16.97l5.656-5.656c4.686-4.686 12.284-4.686 16.97 0L508.485 485.86c4.687 4.685 4.687 12.283 0 16.969zM288.487 311.114L192 214.627V256c0 35.29 28.71 64 64 64a63.58 63.58 0 0 0 32.487-8.886z"] };
var faMinus = { prefix: 'fal', iconName: 'minus', icon: [448, 512, [], "f068", "M436 274c6.6 0 12-5.4 12-12v-12c0-6.6-5.4-12-12-12H12c-6.6 0-12 5.4-12 12v12c0 6.6 5.4 12 12 12h424z"] };
var faMinusCircle = { prefix: 'fal', iconName: 'minus-circle', icon: [512, 512, [], "f056", "M140 274c-6.6 0-12-5.4-12-12v-12c0-6.6 5.4-12 12-12h232c6.6 0 12 5.4 12 12v12c0 6.6-5.4 12-12 12H140zm364-18c0 137-111 248-248 248S8 393 8 256 119 8 256 8s248 111 248 248zm-32 0c0-119.9-97.3-216-216-216-119.9 0-216 97.3-216 216 0 119.9 97.3 216 216 216 119.9 0 216-97.3 216-216z"] };
var faMinusHexagon = { prefix: 'fal', iconName: 'minus-hexagon', icon: [576, 512, [], "f307", "M441.5 39.8C432.9 25.1 417.1 16 400 16H176c-17.1 0-32.9 9.1-41.5 23.8l-112 192c-8.7 14.9-8.7 33.4 0 48.4l112 192c8.6 14.7 24.4 23.8 41.5 23.8h224c17.1 0 32.9-9.1 41.5-23.8l112-192c8.7-14.9 8.7-33.4 0-48.4l-112-192zm84.3 224.3l-112 192c-2.9 4.9-8.2 7.9-13.8 7.9H176c-5.7 0-11-3-13.8-7.9l-112-192c-2.9-5-2.9-11.2 0-16.1l112-192c2.8-5 8.1-8 13.8-8h224c5.7 0 11 3 13.8 7.9l112 192c2.9 5 2.9 11.2 0 16.2zM172 274c-6.6 0-12-5.4-12-12v-12c0-6.6 5.4-12 12-12h232c6.6 0 12 5.4 12 12v12c0 6.6-5.4 12-12 12H172z"] };
var faMinusOctagon = { prefix: 'fal', iconName: 'minus-octagon', icon: [512, 512, [], "f308", "M361.5 14.1c-9-9-21.2-14.1-33.9-14.1H184.5c-12.7 0-24.9 5.1-33.9 14.1L14.1 150.5c-9 9-14.1 21.2-14.1 33.9v143.1c0 12.7 5.1 24.9 14.1 33.9l136.5 136.5c9 9 21.2 14.1 33.9 14.1h143.1c12.7 0 24.9-5.1 33.9-14.1L498 361.4c9-9 14.1-21.2 14.1-33.9v-143c0-12.7-5.1-24.9-14.1-33.9L361.5 14.1zM480 327.5c0 4.3-1.7 8.3-4.7 11.3L338.9 475.3c-3 3-7 4.7-11.3 4.7H184.5c-4.3 0-8.3-1.7-11.3-4.7L36.7 338.9c-3-3-4.7-7-4.7-11.3V184.5c0-4.3 1.7-8.3 4.7-11.3L173.1 36.7c3-3 7-4.7 11.3-4.7h143.1c4.3 0 8.3 1.7 11.3 4.7l136.5 136.5c3 3 4.7 7 4.7 11.3v143zM140 274c-6.6 0-12-5.4-12-12v-12c0-6.6 5.4-12 12-12h232c6.6 0 12 5.4 12 12v12c0 6.6-5.4 12-12 12H140z"] };
var faMinusSquare = { prefix: 'fal', iconName: 'minus-square', icon: [448, 512, [], "f146", "M400 64c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352m0-32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm-60 242c6.6 0 12-5.4 12-12v-12c0-6.6-5.4-12-12-12H108c-6.6 0-12 5.4-12 12v12c0 6.6 5.4 12 12 12h232z"] };
var faMobile = { prefix: 'fal', iconName: 'mobile', icon: [320, 512, [], "f10b", "M192 416c0 17.7-14.3 32-32 32s-32-14.3-32-32 14.3-32 32-32 32 14.3 32 32zM320 48v416c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V48C0 21.5 21.5 0 48 0h224c26.5 0 48 21.5 48 48zm-32 0c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v416c0 8.8 7.2 16 16 16h224c8.8 0 16-7.2 16-16V48z"] };
var faMobileAlt = { prefix: 'fal', iconName: 'mobile-alt', icon: [320, 512, [], "f3cd", "M192 416c0 17.7-14.3 32-32 32s-32-14.3-32-32 14.3-32 32-32 32 14.3 32 32zm32-320H96v240h128V96m20-32c6.6 0 12 5.4 12 12v280c0 6.6-5.4 12-12 12H76c-6.6 0-12-5.4-12-12V76c0-6.6 5.4-12 12-12h168zm76-16v416c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V48C0 21.5 21.5 0 48 0h224c26.5 0 48 21.5 48 48zm-32 0c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v416c0 8.8 7.2 16 16 16h224c8.8 0 16-7.2 16-16V48z"] };
var faMobileAndroid = { prefix: 'fal', iconName: 'mobile-android', icon: [320, 512, [], "f3ce", "M196 448h-72c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h72c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12zM320 48v416c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V48C0 21.5 21.5 0 48 0h224c26.5 0 48 21.5 48 48zm-32 0c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v416c0 8.8 7.2 16 16 16h224c8.8 0 16-7.2 16-16V48z"] };
var faMobileAndroidAlt = { prefix: 'fal', iconName: 'mobile-android-alt', icon: [320, 512, [], "f3cf", "M224 96v240H96V96h128m48-96H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h224c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM48 480c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h224c8.8 0 16 7.2 16 16v416c0 8.8-7.2 16-16 16H48zM244 64H76c-6.6 0-12 5.4-12 12v280c0 6.6 5.4 12 12 12h168c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12zm-48 352h-72c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h72c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12z"] };
var faMoneyBill = { prefix: 'fal', iconName: 'money-bill', icon: [640, 512, [], "f0d6", "M616 96H24c-13.255 0-24 10.745-24 24v272c0 13.255 10.745 24 24 24h592c13.255 0 24-10.745 24-24V120c0-13.255-10.745-24-24-24zm-8 224c-35.346 0-64 28.654-64 64H96c0-35.346-28.654-64-64-64V192c35.346 0 64-28.654 64-64h448c0 35.346 28.654 64 64 64v128zm-208-64c0 53.031-35.833 96-80 96-44.186 0-80-42.989-80-96 0-53.021 35.816-96 80-96s80 42.979 80 96z"] };
var faMoneyBillAlt = { prefix: 'fal', iconName: 'money-bill-alt', icon: [640, 512, [], "f3d1", "M616 96H24c-13.255 0-24 10.745-24 24v272c0 13.255 10.745 24 24 24h592c13.255 0 24-10.745 24-24V120c0-13.255-10.745-24-24-24zm-8 224c-35.346 0-64 28.654-64 64H96c0-35.346-28.654-64-64-64V192c35.346 0 64-28.654 64-64h448c0 35.346 28.654 64 64 64v128zM320 160c-44.184 0-80 42.979-80 96 0 53.011 35.814 96 80 96 44.167 0 80-42.969 80-96 0-53.021-35.816-96-80-96zm45.419 145.008c0 6.443-3.402 9.845-9.846 9.845h-65.522c-6.445 0-9.847-3.402-9.847-9.845v-7.162c0-6.444 3.401-9.846 9.847-9.846h17.365v-48.202c0-4.833.179-9.846.179-9.846h-.359s-1.79 3.939-3.938 5.729l-1.611 1.432c-4.655 4.298-9.489 4.117-13.786-.537l-4.654-5.013c-4.475-4.654-4.297-9.487.358-13.963l22.2-20.767c3.759-3.401 7.161-4.833 12.173-4.833h10.205c6.445 0 9.846 3.4 9.846 9.845V288h17.544c6.444 0 9.846 3.402 9.846 9.846v7.162z"] };
var faMoon = { prefix: 'fal', iconName: 'moon', icon: [512, 512, [], "f186", "M448.964 365.617C348.188 384.809 255.14 307.765 255.14 205.419c0-58.893 31.561-112.832 82.574-141.862 25.83-14.7 19.333-53.859-10.015-59.28A258.114 258.114 0 0 0 280.947 0c-141.334 0-256 114.546-256 256 0 141.334 114.547 256 256 256 78.931 0 151.079-35.924 198.85-94.783 18.846-23.22-1.706-57.149-30.833-51.6zM280.947 480c-123.712 0-224-100.288-224-224s100.288-224 224-224c13.984 0 27.665 1.294 40.94 3.745-58.972 33.56-98.747 96.969-98.747 169.674 0 122.606 111.613 214.523 231.81 191.632C413.881 447.653 351.196 480 280.947 480z"] };
var faMotorcycle = { prefix: 'fal', iconName: 'motorcycle', icon: [640, 512, [], "f21c", "M512.238 192c-17.943-.033-35.025 3.631-50.534 10.266L435.799 160H520c13.255 0 24-10.745 24-24V88c0-13.255-10.745-24-24-24h-60a24.002 24.002 0 0 0-19.2 9.6l-31.893 42.524-27.265-44.485A16.005 16.005 0 0 0 368 64h-76c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h67.04l39.226 64H217.584c-16.679-19.064-41.794-32-89.584-32H80.452c-8.616 0-16.029 6.621-16.433 15.227C63.586 152.416 70.907 160 80 160h48c24.268 0 40.146 8.239 51.566 19.951l-10.364 18.843a127.7 127.7 0 0 0-39.723-6.786C58.709 191.202.272 248.724.001 319.499-.27 390.422 57.141 448 128 448c59.641 0 109.745-40.795 123.956-96h84.776c9.384 0 16.781-8.057 15.936-17.438-5.123-56.79 20.187-110.805 64.631-143.511l16.791 27.395c-30.629 23.533-50.314 60.604-50.086 102.267.38 69.638 57.194 126.66 126.83 127.281 70.58.629 128.112-55.871 129.153-126.057 1.052-71.012-56.729-129.808-127.749-129.937zM462 92h54v40h-84l30-40zM128 416c-52.935 0-96-43.065-96-96s43.065-96 96-96a95.687 95.687 0 0 1 25.45 3.436L97.98 328.289C92.126 338.933 99.838 352 112 352h106.499c-13.208 37.247-48.781 64-90.499 64zm192-96H139.061l70.399-128h159.467C337.778 226.865 320 272.362 320 320zm188.206 95.926c-49.822-1.93-90.199-42.305-92.132-92.127-1.214-31.294 12.642-59.467 34.879-77.836l57.496 93.808c3.463 5.651 10.852 7.424 16.502 3.96l6.821-4.181c5.65-3.463 7.423-10.851 3.96-16.502l-57.051-93.083A95.57 95.57 0 0 1 512 224c52.935 0 96 43.065 96 96 0 54.194-45.139 98.043-99.794 95.926z"] };
var faMousePointer = { prefix: 'fal', iconName: 'mouse-pointer', icon: [320, 512, [], "f245", "M154.149 488.438l-41.915-101.865-46.788 52.8C42.432 465.345 0 448.788 0 413.5V38.561c0-34.714 41.401-51.675 64.794-26.59L309.547 274.41c22.697 24.335 6.074 65.09-27.195 65.09h-65.71l42.809 104.037c8.149 19.807-1.035 42.511-20.474 50.61l-36 15.001c-19.036 7.928-40.808-1.217-48.828-20.71zm-31.84-161.482l61.435 149.307c1.182 2.877 4.117 4.518 6.926 3.347l35.999-15c3.114-1.298 4.604-5.455 3.188-8.896L168.872 307.5h113.479c5.009 0 7.62-7.16 3.793-11.266L41.392 33.795C37.785 29.932 32 32.879 32 38.561V413.5c0 5.775 5.935 8.67 9.497 4.65l80.812-91.194z"] };
var faMusic = { prefix: 'fal', iconName: 'music', icon: [512, 512, [], "f001", "M469.9 1.7l-288 96C168.8 102 160 114.2 160 128v272.3c-17-10.1-39.4-16.3-64-16.3-53 0-96 28.6-96 64 0 35.3 43 64 96 64s96-28.7 96-64V225.7l288-96v206.6c-17-10.1-39.4-16.3-64-16.3-53 0-96 28.6-96 64 0 35.3 43 64 96 64s96-28.7 96-64V32c0-21.9-21.5-37.2-42.1-30.3zM96 484c-37 0-68-18.3-68-36 0-23 42.2-36 68-36 37 0 68 18.3 68 36 0 23-42.2 36-68 36zm96-292v-64l288-96v64l-288 96zm224 228c-37 0-68-18.3-68-36 0-23 42.2-36 68-36 37 0 68 18.3 68 36 0 23-42.2 36-68 36z"] };
var faNeuter = { prefix: 'fal', iconName: 'neuter', icon: [288, 512, [], "f22c", "M288 176c0-79.5-64.5-144-144-144S0 96.5 0 176c0 74.1 56 135.2 128 143.1V468c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V319.1c72-7.9 128-69 128-143.1zM144 288c-61.9 0-112-50-112-112 0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112z"] };
var faNewspaper = { prefix: 'fal', iconName: 'newspaper', icon: [576, 512, [], "f1ea", "M552 64H88c-13.234 0-24 10.767-24 24v8H24c-13.255 0-24 10.745-24 24v280c0 26.51 21.49 48 48 48h504c13.233 0 24-10.767 24-24V88c0-13.233-10.767-24-24-24zM32 400V128h32v272c0 8.822-7.178 16-16 16s-16-7.178-16-16zm512 16H93.258A47.897 47.897 0 0 0 96 400V96h448v320zm-404-96h168c6.627 0 12-5.373 12-12V140c0-6.627-5.373-12-12-12H140c-6.627 0-12 5.373-12 12v168c0 6.627 5.373 12 12 12zm20-160h128v128H160V160zm-32 212v-8c0-6.627 5.373-12 12-12h168c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H140c-6.627 0-12-5.373-12-12zm224 0v-8c0-6.627 5.373-12 12-12h136c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H364c-6.627 0-12-5.373-12-12zm0-64v-8c0-6.627 5.373-12 12-12h136c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H364c-6.627 0-12-5.373-12-12zm0-128v-8c0-6.627 5.373-12 12-12h136c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H364c-6.627 0-12-5.373-12-12zm0 64v-8c0-6.627 5.373-12 12-12h136c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H364c-6.627 0-12-5.373-12-12z"] };
var faObjectGroup = { prefix: 'fal', iconName: 'object-group', icon: [512, 512, [], "f247", "M404 192h-84v-52c0-6.627-5.373-12-12-12H108c-6.627 0-12 5.373-12 12v168c0 6.627 5.373 12 12 12h84v52c0 6.627 5.373 12 12 12h200c6.627 0 12-5.373 12-12V204c0-6.627-5.373-12-12-12zm-276-32h160v128H128V160zm256 192H224v-32h84c6.627 0 12-5.373 12-12v-84h64v128zm116-224c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12h-72c-6.627 0-12 5.373-12 12v20H96V44c0-6.627-5.373-12-12-12H12C5.373 32 0 37.373 0 44v72c0 6.627 5.373 12 12 12h20v256H12c-6.627 0-12 5.373-12 12v72c0 6.627 5.373 12 12 12h72c6.627 0 12-5.373 12-12v-20h320v20c0 6.627 5.373 12 12 12h72c6.627 0 12-5.373 12-12v-72c0-6.627-5.373-12-12-12h-20V128h20zm-52 256h-20c-6.627 0-12 5.373-12 12v20H96v-20c0-6.627-5.373-12-12-12H64V128h20c6.627 0 12-5.373 12-12V96h320v20c0 6.627 5.373 12 12 12h20v256zM64 64v32H32V64h32m416 0v32h-32V64h32M64 416v32H32v-32h32m416 0v32h-32v-32h32"] };
var faObjectUngroup = { prefix: 'fal', iconName: 'object-ungroup', icon: [576, 512, [], "f248", "M564 224c6.627 0 12-5.373 12-12v-72c0-6.627-5.373-12-12-12h-72c-6.627 0-12 5.373-12 12v20h-96v-32h20c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12h-72c-6.627 0-12 5.373-12 12v20H96V44c0-6.627-5.373-12-12-12H12C5.373 32 0 37.373 0 44v72c0 6.627 5.373 12 12 12h20v160H12c-6.627 0-12 5.373-12 12v72c0 6.627 5.373 12 12 12h72c6.627 0 12-5.373 12-12v-20h96v32h-20c-6.627 0-12 5.373-12 12v72c0 6.627 5.373 12 12 12h72c6.627 0 12-5.373 12-12v-20h224v20c0 6.627 5.373 12 12 12h72c6.627 0 12-5.373 12-12v-72c0-6.627-5.373-12-12-12h-20V224h20zm-180 96v32h-32v-32h32zM352 64h32v32h-32V64zM32 64h32v32H32V64zm32 288H32v-32h32v32zm20-64H64V128h20c6.627 0 12-5.373 12-12V96h224v20c0 6.627 5.373 12 12 12h20v160h-20c-6.627 0-12 5.373-12 12v20H96v-20c0-6.627-5.373-12-12-12zm140 160h-32v-32h32v32zm256-52v20H256v-20c0-6.627-5.373-12-12-12h-20v-32h96v20c0 6.627 5.373 12 12 12h72c6.627 0 12-5.373 12-12v-72c0-6.627-5.373-12-12-12h-20v-96h96v20c0 6.627 5.373 12 12 12h20v160h-20c-6.627 0-12 5.373-12 12zm64 52h-32v-32h32v32zm-32-256v-32h32v32h-32z"] };
var faOctagon = { prefix: 'fal', iconName: 'octagon', icon: [512, 512, [], "f306", "M361.5 14.1c-9-9-21.2-14.1-33.9-14.1H184.5c-12.7 0-24.9 5.1-33.9 14.1L14.1 150.5c-9 9-14.1 21.2-14.1 33.9v143.1c0 12.7 5.1 24.9 14.1 33.9l136.5 136.5c9 9 21.2 14.1 33.9 14.1h143.1c12.7 0 24.9-5.1 33.9-14.1L498 361.4c9-9 14.1-21.2 14.1-33.9v-143c0-12.7-5.1-24.9-14.1-33.9L361.5 14.1zM480 327.5c0 4.3-1.7 8.3-4.7 11.3L338.9 475.3c-3 3-7 4.7-11.3 4.7H184.5c-4.3 0-8.3-1.7-11.3-4.7L36.7 338.9c-3-3-4.7-7-4.7-11.3V184.5c0-4.3 1.7-8.3 4.7-11.3L173.1 36.7c3-3 7-4.7 11.3-4.7h143.1c4.3 0 8.3 1.7 11.3 4.7l136.5 136.5c3 3 4.7 7 4.7 11.3v143z"] };
var faOutdent = { prefix: 'fal', iconName: 'outdent', icon: [448, 512, [], "f03b", "M0 76V52a6 6 0 0 1 6-6h436a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6zm198 134h244a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H198a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zM6 466h436a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm192-128h244a6 6 0 0 0 6-6v-24a6 6 0 0 0-6-6H198a6 6 0 0 0-6 6v24a6 6 0 0 0 6 6zm-70-177.987v191.972c0 14.27-17.283 21.346-27.313 11.313l-96-95.986c-6.249-6.248-6.249-16.379 0-22.627l96-95.987C110.705 138.682 128 145.719 128 160.013zm-32 153.36V198.627L38.627 256 96 313.373z"] };
var faPaintBrush = { prefix: 'fal', iconName: 'paint-brush', icon: [512, 512, [], "f1fc", "M446 0c-17.1 0-34.2 7.1-48 19.9-115 106-167.2 148.9-191.9 179.3-18.5 22.8-22 39.5-22 62.2 0 3.7.2 7.3.6 10.9-38.4 2-87.7 15.3-113.5 84.1-19.8-2.8-43.2-22.1-57.6-35.7-5.2-4.9-13.6-1.3-13.6 5.8v11.2c0 48 11.7 89.6 33.8 120.2C59.5 493.3 97.9 512 145.1 512c42 0 77.6-12.6 102.9-36.5 26.2-24.7 40-60.1 40-102.4 0-1.7 0-3.4-.1-5.1 35.9 0 62.7-15.4 92.5-52.9 31.1-39.2 67.8-105.8 117-200.5l.1-.2c7.2-14.4 14.5-31.7 14.5-51 0-35-29.6-63.4-66-63.4zM145.1 480c-37 0-65.7-13.8-85.3-41-12.8-17.7-21.5-41.1-25.4-67.9 16.8 11.9 27.9 17.6 36.9 17.6 13.2 0 24.8-8 29.5-20.5v-.1c20.3-54.8 56.1-63.5 92-64.2 11.6 26.8 34.3 48.9 62.4 58.5.5 3.4.7 6.9.7 10.5C256 440 214.5 480 145.1 480zM468.9 99.9c-46.9 90.4-84.2 158.2-113.6 195.2-27 34-45.8 40.8-67.5 40.8-39 0-71.8-34.2-71.8-74.6 0-42.1 11.2-40.6 203.7-218C427.5 36.2 437.1 32 446 32c16.4 0 34 12 34 31.3 0 12.7-5.6 25.6-11.1 36.6z"] };
var faPaperPlane = { prefix: 'fal', iconName: 'paper-plane', icon: [512, 512, [], "f1d8", "M464 4.3L16 262.7C-7 276-4.7 309.9 19.8 320L160 378v102c0 30.2 37.8 43.3 56.7 20.3l60.7-73.8 126.4 52.2c19.1 7.9 40.7-4.2 43.8-24.7l64-417.1C515.7 10.2 487-9 464 4.3zM192 480v-88.8l54.5 22.5L192 480zm224-30.9l-206.2-85.2 199.5-235.8c4.8-5.6-2.9-13.2-8.5-8.4L145.5 337.3 32 290.5 480 32l-64 417.1z"] };
var faPaperclip = { prefix: 'fal', iconName: 'paperclip', icon: [512, 512, [], "f0c6", "M149.106 512c-33.076 0-66.153-12.59-91.333-37.771-50.364-50.361-50.364-132.305-.002-182.665L319.842 29.498c39.331-39.331 103.328-39.331 142.66 0 39.331 39.332 39.331 103.327 0 142.657l-222.63 222.626c-28.297 28.301-74.347 28.303-102.65 0-28.3-28.301-28.3-74.349 0-102.649l170.301-170.298c4.686-4.686 12.284-4.686 16.97 0l5.661 5.661c4.686 4.686 4.686 12.284 0 16.971l-170.3 170.297c-15.821 15.821-15.821 41.563.001 57.385 15.821 15.82 41.564 15.82 57.385 0l222.63-222.626c26.851-26.851 26.851-70.541 0-97.394-26.855-26.851-70.544-26.849-97.395 0L80.404 314.196c-37.882 37.882-37.882 99.519 0 137.401 37.884 37.881 99.523 37.882 137.404.001l217.743-217.739c4.686-4.686 12.284-4.686 16.97 0l5.661 5.661c4.686 4.686 4.686 12.284 0 16.971L240.44 474.229C215.26 499.41 182.183 512 149.106 512z"] };
var faParagraph = { prefix: 'fal', iconName: 'paragraph', icon: [384, 512, [], "f1dd", "M372 32H159.529C72.194 32 .245 102.216.001 189.551-.243 276.877 70.729 348 158 348v120c0 6.627 5.373 12 12 12h12c6.627 0 12-5.373 12-12V68h60v400c0 6.627 5.373 12 12 12h12c6.627 0 12-5.373 12-12V68h82c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12zM158 312c-67.271 0-122-54.729-122-122S90.729 68 158 68v244z"] };
var faPaste = { prefix: 'fal', iconName: 'paste', icon: [448, 512, [], "f0ea", "M433.941 193.941l-51.882-51.882A48 48 0 0 0 348.118 128H320V80c0-26.51-21.49-48-48-48h-66.752C198.643 13.377 180.858 0 160 0s-38.643 13.377-45.248 32H48C21.49 32 0 53.49 0 80v288c0 26.51 21.49 48 48 48h80v48c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48V227.882a48 48 0 0 0-14.059-33.941zm-22.627 22.627a15.888 15.888 0 0 1 4.195 7.432H352v-63.509a15.88 15.88 0 0 1 7.431 4.195l51.883 51.882zM160 30c9.941 0 18 8.059 18 18s-8.059 18-18 18-18-8.059-18-18 8.059-18 18-18zM48 384c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h66.752c6.605 18.623 24.389 32 45.248 32s38.643-13.377 45.248-32H272c8.822 0 16 7.178 16 16v48H176c-26.51 0-48 21.49-48 48v208H48zm352 96H176c-8.822 0-16-7.178-16-16V176c0-8.822 7.178-16 16-16h144v72c0 13.2 10.8 24 24 24h72v208c0 8.822-7.178 16-16 16z"] };
var faPause = { prefix: 'fal', iconName: 'pause', icon: [448, 512, [], "f04c", "M48 479h96c26.5 0 48-21.5 48-48V79c0-26.5-21.5-48-48-48H48C21.5 31 0 52.5 0 79v352c0 26.5 21.5 48 48 48zM32 79c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V79zm272 400h96c26.5 0 48-21.5 48-48V79c0-26.5-21.5-48-48-48h-96c-26.5 0-48 21.5-48 48v352c0 26.5 21.5 48 48 48zM288 79c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16h-96c-8.8 0-16-7.2-16-16V79z"] };
var faPauseCircle = { prefix: 'fal', iconName: 'pause-circle', icon: [512, 512, [], "f28b", "M256 504c137 0 248-111 248-248S393 8 256 8 8 119 8 256s111 248 248 248zM40 256c0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216zm168-96v192m-10-192h20c3.3 0 6 2.7 6 6v180c0 3.3-2.7 6-6 6h-20c-3.3 0-6-2.7-6-6V166c0-3.3 2.7-6 6-6zm96 0h20c3.3 0 6 2.7 6 6v180c0 3.3-2.7 6-6 6h-20c-3.3 0-6-2.7-6-6V166c0-3.3 2.7-6 6-6z"] };
var faPaw = { prefix: 'fal', iconName: 'paw', icon: [512, 512, [], "f1b0", "M449.558 155.354c-17.456 0-34.331 6.002-49.267 17.25 9.923-18.259 15.652-39.227 15.652-58.25C415.942 71.076 389.526 32 346 32c-50.529 0-83.897 50.052-90 95.004C249.905 82.113 216.588 32 166 32c-43.557 0-69.942 39.114-69.942 82.354 0 19.024 5.729 39.991 15.652 58.25-14.936-11.249-31.811-17.25-49.267-17.25C21.449 155.354 0 190.517 0 225.25c0 60.601 58.78 123.408 115.151 105.413-26.209 31.696-41.305 65.36-41.305 93.525 0 16.7 6.703 55.542 68.789 55.542 23.896 0 44.266-6.718 63.964-13.214 16.983-5.601 33.025-10.891 49.401-10.891 15.505 0 30.701 5.374 46.79 11.062C321.299 473.232 340.437 480 362.73 480c13.182 0 32.496-.905 47.967-8.73 12.526-6.335 27.457-19.646 27.457-47.082 0-28.128-15.143-61.815-41.431-93.564C453.625 348.927 512 285.211 512 225.25c0-38.086-24.267-69.896-62.442-69.896zM346 64c25.242 0 37.942 25.56 37.942 50.354 0 32.91-24.586 77.166-59 77.166-25.237 0-37.942-25.552-37.942-50.354C287 108.073 311.425 64 346 64zm-90 91.251c9.327 66.245 69.858 84.622 113.148 53.731-14.277 25.431-20.762 56.261-10.37 83.953-34.242-28.014-71.49-44.269-102.779-44.269-31.294 0-68.522 16.209-102.732 44.148 10.259-27.483 3.968-58.211-10.417-83.833 43.541 31.069 103.864 12.223 113.15-53.73zM166 64c34.647 0 59 44.181 59 77.167 0 24.653-12.609 50.354-37.942 50.354-34.403 0-59-44.241-59-77.166C128.058 89.687 140.675 64 166 64zM32 225.25c0-14.075 6.412-37.896 30.442-37.896 34.819 0 63.903 43.513 63.903 76.625 0 36.569-27.326 37.625-30.442 37.625C60.936 301.604 32 258.173 32 225.25zM362.73 448c-34.921 0-66.235-24.375-106.73-24.375-42.071 0-74.949 24.104-113.365 24.104-36.789 0-36.789-15.9-36.789-23.542 0-55.049 88.125-143.521 150.154-143.521 61.47 0 150.154 88.204 150.154 143.521 0 12.549-3.321 23.813-43.424 23.813zm53.367-146.396c-3.116 0-30.442-1.056-30.442-37.625 0-33.214 29.161-76.625 63.903-76.625 24.031 0 30.442 23.82 30.442 37.896 0 33.044-29.027 76.354-63.903 76.354z"] };
var faPen = { prefix: 'fal', iconName: 'pen', icon: [512, 512, [], "f304", "M12.8 371.2L.2 485.3c-1.7 15.3 11.2 28.2 26.5 26.5l114.2-12.7 352.4-352.4c25-25 25-65.5 0-90.5l-37.5-37.5c-25-25-65.5-25-90.5 0L12.8 371.2zm113.3 97.4L33 478.9l10.3-93.1 271.9-271.9 82.7 82.7-271.8 272zm344.5-344.5L420.7 174 338 91.3l49.9-49.9c12.5-12.5 32.7-12.5 45.3 0l37.5 37.5c12.4 12.4 12.4 32.7-.1 45.2z"] };
var faPenAlt = { prefix: 'fal', iconName: 'pen-alt', icon: [512, 512, [], "f305", "M493.3 56.2l-37.5-37.5c-25-25-65.5-25-90.5 0l-49.9 49.9L289 42.3c-9.4-9.4-24.6-9.4-33.9 0L125.2 172.2c-4.7 4.7-4.7 12.3 0 17l5.7 5.7c4.7 4.7 12.3 4.7 17 0L272 70.6l20.7 20.7L12.8 371.2.2 485.3c-1.7 15.3 11.2 28.2 26.5 26.5l114.2-12.7 352.4-352.4c24.9-24.9 24.9-65.5 0-90.5zM126.1 468.6L33 478.9l10.3-93.1 271.9-271.9 82.7 82.7-271.8 272zm344.5-344.5L420.7 174 338 91.3l49.9-49.9c12.5-12.5 32.7-12.5 45.3 0l37.5 37.5c12.4 12.4 12.4 32.7-.1 45.2z"] };
var faPenSquare = { prefix: 'fal', iconName: 'pen-square', icon: [448, 512, [], "f14b", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352zm-67.1-324.3c-15.6-15.6-40.9-15.6-56.6 0L72 328l-7.9 71.4C63 409 71.1 417 80.7 416l71.3-8 220.3-220.3c15.6-15.6 15.6-40.9 0-56.6l-23.4-23.4zM137.3 377.4l-39.1 4.3 4.3-39.1 162.7-162.7 34.7 34.7-162.6 162.8zm212.4-212.3l-27 27-34.7-34.7 27-27c3.1-3.1 8.2-3.1 11.3 0l23.4 23.4c3.1 3.1 3.1 8.2 0 11.3z"] };
var faPencil = { prefix: 'fal', iconName: 'pencil', icon: [512, 512, [], "f040", "M493.255 56.236l-37.49-37.49c-24.993-24.993-65.515-24.994-90.51 0L12.838 371.162.151 485.346c-1.698 15.286 11.22 28.203 26.504 26.504l114.184-12.687 352.417-352.417c24.992-24.994 24.992-65.517-.001-90.51zm-95.196 140.45L174 420.745V386h-48v-48H91.255l224.059-224.059 82.745 82.745zM126.147 468.598l-58.995 6.555-30.305-30.305 6.555-58.995L63.255 366H98v48h48v34.745l-19.853 19.853zm344.48-344.48l-49.941 49.941-82.745-82.745 49.941-49.941c12.505-12.505 32.748-12.507 45.255 0l37.49 37.49c12.506 12.506 12.507 32.747 0 45.255z"] };
var faPencilAlt = { prefix: 'fal', iconName: 'pencil-alt', icon: [512, 512, [], "f303", "M493.255 56.236l-37.49-37.49c-24.993-24.993-65.515-24.994-90.51 0L12.838 371.162.151 485.346c-1.698 15.286 11.22 28.203 26.504 26.504l114.184-12.687 352.417-352.417c24.992-24.994 24.992-65.517-.001-90.51zM164.686 347.313c6.249 6.249 16.379 6.248 22.627 0L368 166.627l30.059 30.059L174 420.745V386h-48v-48H91.255l224.059-224.059L345.373 144 164.686 324.687c-6.249 6.248-6.249 16.378 0 22.626zm-38.539 121.285l-58.995 6.555-30.305-30.305 6.555-58.995L63.255 366H98v48h48v34.745l-19.853 19.853zm344.48-344.48l-49.941 49.941-82.745-82.745 49.941-49.941c12.505-12.505 32.748-12.507 45.255 0l37.49 37.49c12.506 12.506 12.507 32.747 0 45.255z"] };
var faPennant = { prefix: 'fal', iconName: 'pennant', icon: [576, 512, [], "f456", "M552 191.3c-30 6.2-115.6 12.5-260.7-63.6-87-45.7-158.1-51.8-210-45.2 9-8.8 14.7-21 14.7-34.5C96 21.5 74.5 0 48 0S0 21.5 0 48c0 20.8 13.4 38.4 32 45.1V504c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8v-79.6c40.2-27.2 102-56.4 179.5-60.2 28.7-1.4 76-5.8 137.9-18.8 4.4-.9 109.4-23.8 190-121.7 11.8-14.3-.7-36.2-19.4-32.4zM48 32c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16zm326.9 282.1c-59.9 12.5-105.4 16.8-133 18.2-84.8 4.2-145.3 35.1-177.9 54.2V117.7c47.2-10.6 119.5-10.5 212.4 38.3 118.9 62.4 202.3 72.4 249.5 70.4-69.5 69.7-150.1 87.5-151 87.7z"] };
var faPercent = { prefix: 'fal', iconName: 'percent', icon: [384, 512, [], "f295", "M96 224c53 0 96-43 96-96s-43-96-96-96S0 75 0 128s43 96 96 96zm0-156c33.1 0 60 26.9 60 60s-26.9 60-60 60-60-26.9-60-60 26.9-60 60-60zm192 220c-53 0-96 43-96 96s43 96 96 96 96-43 96-96-43-96-96-96zm0 156c-33.1 0-60-26.9-60-60s26.9-60 60-60 60 26.9 60 60-26.9 60-60 60zm59.8-412H378c5 0 7.8 5.7 4.8 9.6L41 477.6c-1.1 1.5-2.9 2.4-4.8 2.4H6c-5 0-7.8-5.7-4.8-9.6L343 34.4c1.1-1.5 2.9-2.4 4.8-2.4z"] };
var faPhone = { prefix: 'fal', iconName: 'phone', icon: [512, 512, [], "f095", "M487.776 24.051L387.025.806c-14.745-3.405-29.786 4.226-35.749 18.14l-46.5 108.494c-5.452 12.723-1.778 27.73 8.935 36.495l53.854 44.063c-34.011 69.234-90.333 125.557-159.566 159.566l-44.063-53.854c-8.765-10.713-23.774-14.385-36.496-8.935L18.946 351.276C5.031 357.24-2.598 372.275.806 387.026l23.244 100.75C27.342 502.039 39.864 512 54.5 512 306.659 512 512 307.793 512 54.5c0-14.638-9.961-27.159-24.224-30.449zM55.096 480l-22.972-99.557 107.402-46.03 59.53 72.757c103.641-48.624 159.675-104.867 208.113-208.113l-72.758-59.53 46.031-107.402L480 55.096C479.68 289.713 289.638 479.68 55.096 480z"] };
var faPhoneSlash = { prefix: 'fal', iconName: 'phone-slash', icon: [512, 512, [], "f3dd", "M294.974 405.602l22.981 22.981C243.408 481.156 152.491 512 54.5 512c-14.637 0-27.159-9.961-30.45-24.224L.806 387.026c-3.404-14.751 4.225-29.786 18.14-35.75l108.494-46.499c12.722-5.45 27.731-1.778 36.496 8.935l44.063 53.854a347.815 347.815 0 0 0 31.427-17.513l22.734 22.734c-18.935 12.143-39.814 23.457-63.103 34.383l-59.53-72.757-107.402 46.03L55.096 480c89.018-.122 171.621-27.567 239.878-74.398zm213.511 80.256c4.686 4.686 4.686 12.284 0 16.97l-5.656 5.656c-4.686 4.686-12.284 4.686-16.97 0L3.515 26.142c-4.686-4.686-4.686-12.284 0-16.97l5.656-5.656c4.686-4.686 12.284-4.686 16.971 0l285.892 285.892c22.135-24.253 40.903-51.63 55.531-81.408l-53.854-44.063c-10.713-8.765-14.387-23.772-8.935-36.495l46.5-108.494C357.239 5.034 372.28-2.597 387.025.808l100.751 23.244C502.039 27.341 512 39.862 512 54.5c0 120.768-46.69 230.367-122.87 312.004l119.355 119.354zM334.743 312.116l31.746 31.746C436.803 268.085 479.848 166.641 480 55.096l-99.557-22.972-46.031 107.402 72.758 59.53c-21.482 45.79-44.466 82.326-72.427 113.06z"] };
var faPhoneSquare = { prefix: 'fal', iconName: 'phone-square', icon: [448, 512, [], "f098", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zm-54.867-321.745l-58.499-13.493a29.473 29.473 0 0 0-33.748 17.123l-27.001 62.995c-5.146 12.012-1.678 26.179 8.435 34.451l24.129 19.742a192.006 192.006 0 0 1-75.376 75.375l-19.74-24.127c-8.273-10.115-22.44-13.582-34.453-8.435l-62.992 26.998c-13.138 5.63-20.34 19.824-17.125 33.748l13.494 58.501C81.363 406.597 93.184 416 107 416c153.033 0 277-123.819 277-277 0-13.818-9.403-25.639-22.867-28.745zM108.987 383.992l-12.579-54.518 59.348-25.435 34.601 42.288c61.893-29.035 94.185-60.484 123.973-123.971l-42.29-34.602 25.436-59.348 54.518 12.579c-1.057 133.704-109.058 241.949-243.007 243.007z"] };
var faPhoneVolume = { prefix: 'fal', iconName: 'phone-volume', icon: [448, 512, [], "f2a0", "M189.135 344.94c-5.471-13.646-19.536-22.148-34.19-20.695l-43.183 4.308c-14.454-47.209-14.454-97.895.001-145.105l43.181 4.308c14.662 1.463 28.717-7.048 34.19-20.695l32.479-81.008c5.984-14.924.41-31.941-13.252-40.46l-64.96-40.508c-13.213-8.239-30.132-6.313-41.145 4.676-136.485 136.167-136.196 356.607 0 492.48 11.022 10.996 27.943 12.908 41.146 4.675l64.958-40.507c13.662-8.52 19.236-25.536 13.252-40.46l-32.477-81.009zm2.227 94.338l-64.958 40.506a1.186 1.186 0 0 1-1.473-.167C.981 355.954 1.1 155.927 124.931 32.383a1.204 1.204 0 0 1 1.472-.168l64.958 40.507c.489.306.689.914.475 1.448l-32.479 81.006a1.2 1.2 0 0 1-1.224.742l-68.362-6.82c-28.623 79.031-27.539 137.77 0 213.803l68.363-6.82a1.189 1.189 0 0 1 1.223.74l32.479 81.008a1.185 1.185 0 0 1-.474 1.449zM292.249 92.891l-5.975 5.726c-3.911 3.748-4.793 9.622-2.261 14.41a32.063 32.063 0 0 1 0 29.945c-2.533 4.788-1.65 10.662 2.261 14.41l5.975 5.726c5.611 5.377 14.768 4.111 18.718-2.581 11.832-20.047 11.832-45.008 0-65.055-3.95-6.692-13.108-7.958-18.718-2.581zm93.112-89.538l-5.798 5.557c-4.56 4.371-4.977 11.529-.93 16.379 49.687 59.538 49.646 145.933 0 205.422-4.047 4.85-3.631 12.008.93 16.379l5.798 5.557c5.022 4.813 13.078 4.394 17.552-.933 60.14-71.604 60.092-175.882 0-247.428-4.474-5.327-12.53-5.746-17.552-.933zm-46.2 44.57l-5.818 5.579c-4.4 4.219-4.998 11.095-1.285 15.931 26.536 34.564 26.534 82.572 0 117.134-3.713 4.836-3.115 11.711 1.285 15.931l5.818 5.579c5.159 4.947 13.466 4.337 17.856-1.304 36.05-46.322 36.108-111.149 0-157.546-4.39-5.641-12.697-6.251-17.856-1.304z"] };
var faPlane = { prefix: 'fal', iconName: 'plane', icon: [576, 512, [], "f072", "M462.5 192h-97.117L272.188 13.935l-.549-.966C266.716 4.969 257.823 0 248.431 0h-54.175c-17.58 0-30.468 16.344-26.563 33.333L195.477 192h-76.521l-28.154-50.795-.274-.475c-4.896-8.161-13.85-13.23-23.366-13.23H27.259c-17.213 0-30.089 15.749-26.721 32.594l19.181 95.907-19.18 95.905c-3.376 16.879 9.544 32.595 26.723 32.593l39.9-.002c9.517 0 18.47-5.069 23.366-13.229L118.956 320h76.521l-27.784 158.667C163.787 495.662 176.682 512 194.256 512h54.175c9.393 0 18.286-4.969 23.208-12.969l.291-.473L365.383 320H462.5c48.059 0 113.5-16.538 113.5-64 0-47.549-65.636-64-113.5-64zm0 96H346.014L245.525 480h-45.578l33.621-192H100.106l-35.75 64.497-31.308.002 19.3-96.498-19.3-96.501h31.308l35.75 64.5h133.462L199.947 32h45.578l100.489 192H462.5c48.751 0 81.5 16 81.5 32s-32.749 32-81.5 32z"] };
var faPlaneAlt = { prefix: 'fal', iconName: 'plane-alt', icon: [576, 512, [], "f3de", "M462.5 192.319H353.904l-33.695-64.33c6.53-.113 11.79-5.433 11.79-11.99V76c0-6.627-5.373-12-12-12h-33.307l-26.298-50.208C255.257 4.858 245.982 0 236.714 0h-54.175c-17.549 0-30.473 16.313-26.563 33.331l27.989 160.119c-20.696 1.057-40.83 2.827-58.722 5.169l-31.987-57.441-.259-.447c-4.896-8.161-13.85-13.23-23.366-13.23H29.723c-17.213 0-30.09 15.749-26.721 32.594l13.41 67.052C5.51 235.553 0 245.225 0 256.001c0 10.775 5.51 20.447 16.412 28.854l-13.41 67.049c-3.375 16.877 9.542 32.597 26.722 32.595l39.911-.001c9.516-.002 18.467-5.072 23.362-13.23l32.245-57.887c17.892 2.342 38.025 4.112 58.723 5.169l-27.989 160.119C152.064 495.694 164.999 512 182.539 512h54.175c9.003 0 18.012-4.512 23.456-13.372L286.689 448H320c6.627 0 12-5.373 12-12v-40c0-6.558-5.262-11.878-11.793-11.99l33.697-64.332 108.596.002c48.364 0 113.5-16.362 113.5-63.68 0-47.602-65.772-63.681-113.5-63.681zm0 95.361l-128.441-.001L233.849 480h-45.621l33.588-192.14c-45.335-1.352-67.17-2.232-113.778-9.356l-41.205 73.994-31.315.001L55 256.001 35.517 159.5h31.315l41.206 73.996c46.89-7.168 68.859-8.017 113.777-9.356L188.228 32h45.621l100.21 192.319H462.5c32.513 0 81.5 10.7 81.5 31.681 0 23.203-56.152 31.68-81.5 31.68z"] };
var faPlay = { prefix: 'fal', iconName: 'play', icon: [448, 512, [], "f04b", "M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6zm-16.2 55.1l-352 208C45.6 483.9 32 476.6 32 464V47.9c0-16.3 16.4-18.4 24.1-13.8l352 208.1c10.5 6.2 10.5 21.4.1 27.6z"] };
var faPlayCircle = { prefix: 'fal', iconName: 'play-circle', icon: [512, 512, [], "f144", "M256 504c137 0 248-111 248-248S393 8 256 8 8 119 8 256s111 248 248 248zM40 256c0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216zm331.7-18l-176-107c-15.8-8.8-35.7 2.5-35.7 21v208c0 18.4 19.8 29.8 35.7 21l176-101c16.4-9.1 16.4-32.8 0-42zM192 335.8V176.9c0-4.7 5.1-7.6 9.1-5.1l134.5 81.7c3.9 2.4 3.8 8.1-.1 10.3L201 341c-4 2.3-9-.6-9-5.2z"] };
var faPlug = { prefix: 'fal', iconName: 'plug', icon: [384, 512, [], "f1e6", "M360 160H24c-13.255 0-24 10.745-24 24v48c0 13.255 10.745 24 24 24h8c0 82.965 63.147 151.178 144 159.206V512h32v-96.794c80.853-8.028 144-76.241 144-159.206h8c13.255 0 24-10.745 24-24v-48c0-13.255-10.745-24-24-24zm-8 64h-32v32c0 70.74-57.249 128-128 128-70.74 0-128-57.249-128-128v-32H32v-32h320v32zm-80-80V16c0-8.837 7.163-16 16-16s16 7.163 16 16v128h-32zm-192 0V16c0-8.837 7.163-16 16-16s16 7.163 16 16v128H80z"] };
var faPlus = { prefix: 'fal', iconName: 'plus', icon: [448, 512, [], "f067", "M436 238H242V44c0-6.6-5.4-12-12-12h-12c-6.6 0-12 5.4-12 12v194H12c-6.6 0-12 5.4-12 12v12c0 6.6 5.4 12 12 12h194v194c0 6.6 5.4 12 12 12h12c6.6 0 12-5.4 12-12V274h194c6.6 0 12-5.4 12-12v-12c0-6.6-5.4-12-12-12z"] };
var faPlusCircle = { prefix: 'fal', iconName: 'plus-circle', icon: [512, 512, [], "f055", "M384 250v12c0 6.6-5.4 12-12 12h-98v98c0 6.6-5.4 12-12 12h-12c-6.6 0-12-5.4-12-12v-98h-98c-6.6 0-12-5.4-12-12v-12c0-6.6 5.4-12 12-12h98v-98c0-6.6 5.4-12 12-12h12c6.6 0 12 5.4 12 12v98h98c6.6 0 12 5.4 12 12zm120 6c0 137-111 248-248 248S8 393 8 256 119 8 256 8s248 111 248 248zm-32 0c0-119.9-97.3-216-216-216-119.9 0-216 97.3-216 216 0 119.9 97.3 216 216 216 119.9 0 216-97.3 216-216z"] };
var faPlusHexagon = { prefix: 'fal', iconName: 'plus-hexagon', icon: [576, 512, [], "f300", "M441.5 39.8C432.9 25.1 417.1 16 400 16H176c-17.1 0-32.9 9.1-41.5 23.8l-112 192c-8.7 14.9-8.7 33.4 0 48.4l112 192c8.6 14.7 24.4 23.8 41.5 23.8h224c17.1 0 32.9-9.1 41.5-23.8l112-192c8.7-14.9 8.7-33.4 0-48.4l-112-192zm84.3 224.3l-112 192c-2.9 4.9-8.2 7.9-13.8 7.9H176c-5.7 0-11-3-13.8-7.9l-112-192c-2.9-5-2.9-11.2 0-16.1l112-192c2.8-5 8.1-8 13.8-8h224c5.7 0 11 3 13.8 7.9l112 192c2.9 5 2.9 11.2 0 16.2zM416 250v12c0 6.6-5.4 12-12 12h-98v98c0 6.6-5.4 12-12 12h-12c-6.6 0-12-5.4-12-12v-98h-98c-6.6 0-12-5.4-12-12v-12c0-6.6 5.4-12 12-12h98v-98c0-6.6 5.4-12 12-12h12c6.6 0 12 5.4 12 12v98h98c6.6 0 12 5.4 12 12z"] };
var faPlusOctagon = { prefix: 'fal', iconName: 'plus-octagon', icon: [512, 512, [], "f301", "M361.5 14.1c-9-9-21.2-14.1-33.9-14.1H184.5c-12.7 0-24.9 5.1-33.9 14.1L14.1 150.5c-9 9-14.1 21.2-14.1 33.9v143.1c0 12.7 5.1 24.9 14.1 33.9l136.5 136.5c9 9 21.2 14.1 33.9 14.1h143.1c12.7 0 24.9-5.1 33.9-14.1L498 361.4c9-9 14.1-21.2 14.1-33.9v-143c0-12.7-5.1-24.9-14.1-33.9L361.5 14.1zM480 327.5c0 4.3-1.7 8.3-4.7 11.3L338.9 475.3c-3 3-7 4.7-11.3 4.7H184.5c-4.3 0-8.3-1.7-11.3-4.7L36.7 338.9c-3-3-4.7-7-4.7-11.3V184.5c0-4.3 1.7-8.3 4.7-11.3L173.1 36.7c3-3 7-4.7 11.3-4.7h143.1c4.3 0 8.3 1.7 11.3 4.7l136.5 136.5c3 3 4.7 7 4.7 11.3v143zM384 250v12c0 6.6-5.4 12-12 12h-98v98c0 6.6-5.4 12-12 12h-12c-6.6 0-12-5.4-12-12v-98h-98c-6.6 0-12-5.4-12-12v-12c0-6.6 5.4-12 12-12h98v-98c0-6.6 5.4-12 12-12h12c6.6 0 12 5.4 12 12v98h98c6.6 0 12 5.4 12 12z"] };
var faPlusSquare = { prefix: 'fal', iconName: 'plus-square', icon: [448, 512, [], "f0fe", "M400 64c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352m0-32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm-60 206h-98v-98c0-6.6-5.4-12-12-12h-12c-6.6 0-12 5.4-12 12v98h-98c-6.6 0-12 5.4-12 12v12c0 6.6 5.4 12 12 12h98v98c0 6.6 5.4 12 12 12h12c6.6 0 12-5.4 12-12v-98h98c6.6 0 12-5.4 12-12v-12c0-6.6-5.4-12-12-12z"] };
var faPodcast = { prefix: 'fal', iconName: 'podcast', icon: [448, 512, [], "f2ce", "M326.011 313.366a81.658 81.658 0 0 0-11.127-16.147c-1.855-2.1-1.913-5.215-.264-7.481C328.06 271.264 336 248.543 336 224c0-63.221-52.653-114.375-116.41-111.915-57.732 2.228-104.69 48.724-107.458 106.433-1.278 26.636 6.812 51.377 21.248 71.22 1.648 2.266 1.592 5.381-.263 7.481a81.609 81.609 0 0 0-11.126 16.145c-2.003 3.816-7.25 4.422-9.961 1.072C92.009 289.7 80 258.228 80 224c0-79.795 65.238-144.638 145.178-143.995 77.583.624 141.19 63.4 142.79 140.969.73 35.358-11.362 67.926-31.928 93.377-2.738 3.388-8.004 2.873-10.029-.985zM224 0C100.206 0 0 100.185 0 224c0 82.003 43.765 152.553 107.599 191.485 4.324 2.637 9.775-.93 9.078-5.945-1.244-8.944-2.312-17.741-3.111-26.038a6.025 6.025 0 0 0-2.461-4.291c-48.212-35.164-79.495-92.212-79.101-156.409.636-103.637 84.348-188.625 187.964-190.76C327.674 29.822 416 116.79 416 224c0 63.708-31.192 120.265-79.104 155.21a6.027 6.027 0 0 0-2.462 4.292c-.799 8.297-1.866 17.092-3.11 26.035-.698 5.015 4.753 8.584 9.075 5.947C403.607 376.922 448 306.75 448 224 448 100.204 347.814 0 224 0zm64 355.75c0 32.949-12.871 104.179-20.571 132.813C262.286 507.573 242.858 512 224 512c-18.857 0-38.286-4.427-43.428-23.438C172.927 460.134 160 388.898 160 355.75c0-35.156 31.142-43.75 64-43.75 32.858 0 64 8.594 64 43.75zm-32 0c0-16.317-64-16.3-64 0 0 27.677 11.48 93.805 19.01 122.747 6.038 2.017 19.948 2.016 25.981 0C244.513 449.601 256 383.437 256 355.75zM288 224c0 35.346-28.654 64-64 64s-64-28.654-64-64 28.654-64 64-64 64 28.654 64 64zm-32 0c0-17.645-14.355-32-32-32s-32 14.355-32 32 14.355 32 32 32 32-14.355 32-32z"] };
var faPoo = { prefix: 'fal', iconName: 'poo', icon: [512, 512, [], "f2fe", "M312 224a47.789 47.789 0 0 0-22.603 5.647h.015c10.916 0 19.765 8.849 19.765 19.765s-8.849 19.765-19.765 19.765-19.765-8.849-19.765-19.765v-.015A47.789 47.789 0 0 0 264 272c0 26.51 21.49 48 48 48s48-21.49 48-48-21.49-48-48-48zm-112 0a47.789 47.789 0 0 0-22.603 5.647h.015c10.916 0 19.765 8.849 19.765 19.765s-8.849 19.765-19.765 19.765-19.765-8.849-19.765-19.765v-.015A47.789 47.789 0 0 0 152 272c0 26.51 21.49 48 48 48s48-21.49 48-48-21.49-48-48-48zm56-192c27.761 0 68.961 32.072 68.961 63 0 24.261-5.961 35-15.407 49 13.327 0 86.446-8.875 86.446 56 0 20.049-8.405 38.812-24.979 55.767l-.229.233C417.15 256 438 281.555 438 312c0 14.567-4.412 35.442-24.094 56C458.772 368 480 393.549 480 424c0 30.928-25.072 56-56 56H88c-28.92 0-56-26.182-56-56 0-52.976 47.636-55.192 74.924-60.969-16.621-7.525-32.049-32.105-32.049-51.031 0-46.46 30.205-50.081 67.982-64.048C129.679 240.071 116 223.907 116 207c0-26.643 9.066-48.049 33.62-58.337C151.367 147.853 256 128.961 256 32M224 0v32c0 69.793-72.946 81.247-86.94 87.231-52.955 22.319-60.73 82.953-47.51 114.371-45.152 21.654-55.803 72.613-39.598 110.667C19.011 358.139 0 387.554 0 424c0 47.559 41.53 88 88 88h336c48.523 0 88-39.477 88-88 0-33.955-19.334-63.482-47.569-78.15 15.827-47.007-3.346-92.031-42.171-112.089 19.929-57.009-14.38-110.833-66.417-120.333C360 64 325.215 0 224 0zm127.996 352H160.004c-6.589 0-10.367 7.531-6.41 12.799C176.946 395.889 214.123 416 256 416s79.054-20.111 102.406-51.201c3.957-5.268.179-12.799-6.41-12.799z"] };
var faPortrait = { prefix: 'fal', iconName: 'portrait', icon: [384, 512, [], "f3e0", "M336 0H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48V48c0-26.51-21.49-48-48-48zm16 464c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V48c0-8.822 7.178-16 16-16h288c8.822 0 16 7.178 16 16v416zm-85.3-179.78c14.184-17.548 22.312-40.176 21.199-64.672C285.594 168.845 243.446 128 192 128c-52.93 0-96 43.07-96 96 0 22.78 7.98 43.74 21.3 60.22-14.84 5.23-27.61 14.58-37.17 27.24C69.58 325.45 64 342.11 64 359.64V372c0 24.301 19.699 44 44 44h168c24.301 0 44-19.699 44-44v-12.36c0-17.53-5.58-34.19-16.13-48.18-9.56-12.66-22.33-22.01-37.17-27.24zM192 160c35.35 0 64 28.65 64 64 0 35.465-28.762 64-64 64-35.227 0-64-28.524-64-64 0-35.35 28.65-64 64-64zm96 212c0 6.627-5.373 12-12 12H108c-6.627 0-12-5.373-12-12v-12.36c0-21.44 14.21-40.27 34.81-46.16l16.29-4.65C160.51 315.96 175.79 320 192 320s31.49-4.04 44.9-11.17l16.29 4.65c20.6 5.89 34.81 24.72 34.81 46.16V372z"] };
var faPoundSign = { prefix: 'fal', iconName: 'pound-sign', icon: [320, 512, [], "f154", "M308 368h-16.101c-6.627 0-12 5.373-12 12v62.406H97.556V288H204c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H97.556V150.423c0-41.981 30.702-78.322 85.84-78.322 27.902 0 51.392 12.351 63.42 20.131 5.111 3.306 11.893 2.213 15.753-2.494l10.665-13.006c4.488-5.474 3.283-13.605-2.583-17.568C255.331 48.814 224.167 32 183.396 32 107.58 32 53.695 82.126 53.695 147.916V256H20c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h33.695v155.032H12c-6.627 0-12 5.373-12 12V468c0 6.627 5.373 12 12 12h296c6.627 0 12-5.373 12-12v-88c0-6.627-5.373-12-12-12z"] };
var faPowerOff = { prefix: 'fal', iconName: 'power-off', icon: [512, 512, [], "f011", "M388.5 46.3C457.9 90.3 504 167.8 504 256c0 136.8-110.8 247.7-247.5 248C120 504.3 8.2 393 8 256.4 7.9 168 54 90.3 123.5 46.3c5.8-3.7 13.5-1.8 16.9 4.2l3.9 7c3.1 5.6 1.3 12.6-4.1 16C79.9 112 40 179.6 40 256c0 119.9 97.3 216 216 216 119.9 0 216-97.3 216-216 0-77-40.1-144.2-100.3-182.4-5.4-3.4-7.2-10.5-4.1-16l3.9-7c3.4-6.1 11.2-7.9 17-4.3zM272 276V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v264c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12z"] };
var faPrint = { prefix: 'fal', iconName: 'print', icon: [512, 512, [], "f02f", "M416 192V81.9c0-6.4-2.5-12.5-7-17L351 7c-4.5-4.5-10.6-7-17-7H120c-13.2 0-24 10.8-24 24v168c-53 0-96 43-96 96v136c0 13.2 10.8 24 24 24h72v40c0 13.2 10.8 24 24 24h272c13.2 0 24-10.8 24-24v-40h72c13.2 0 24-10.8 24-24V288c0-53-43-96-96-96zM128 32h202.8L384 85.2V256H128V32zm256 448H128v-96h256v96zm96-64h-64v-40c0-13.2-10.8-24-24-24H120c-13.2 0-24 10.8-24 24v40H32V288c0-35.3 28.7-64 64-64v40c0 13.2 10.8 24 24 24h272c13.2 0 24-10.8 24-24v-40c35.3 0 64 28.7 64 64v128zm-28-112c0 11-9 20-20 20s-20-9-20-20 9-20 20-20 20 9 20 20z"] };
var faPuzzlePiece = { prefix: 'fal', iconName: 'puzzle-piece', icon: [576, 512, [], "f12e", "M506.584 256c-52.307 0-72.012 46.513-87.263 27.506-20.125-25.082-2.028-107.233 3.475-131.942-34.229 6.371-137.243 24.274-163.836 2.178-16.619-13.81 31.313-43.496 31.313-86.443C290.272 26.025 256.447 0 214.842 0c-43.559 0-84.792 25.609-84.792 68.824 0 53.02 45.898 71.605 24.351 88.606C125.985 179.846 35.346 160.524 0 152.041v345.313c33.315 8.012 70.681 14.649 106.163 14.646 42.28 0 85.837-11.839 85.837-54.125 0-29.344-32-40.832-32-73.875 0-24.437 22.534-32 46.978-32C245.675 352 256 372.114 256 384c0 28.783-34.272 36.348-34.272 76.58 0 13.748 5.013 25.445 14.498 33.828 35.153 31.069 106.717 6.319 187.085 6.285-.958-3.426-26.807-86.724-7.702-111.907 16.715-22.023 48.578 29.106 92.52 29.106C550.227 417.893 576 377.616 576 336c0-42.835-26.227-80-69.416-80zm1.544 129.893c-30.002 0-41.364-33.893-81.513-33.893-53.566 0-54.841 64.979-44.272 117.816-36.396 3.424-107.025 16.434-124.926.614C237.293 452.645 288 428.279 288 384c0-37.683-33.317-64-81.022-64-74.981 0-102.885 59.829-56.167 122.037 4.726 6.293 9.189 12.237 9.189 15.838 0 33.69-94.005 20.629-128 13.925V191.971c63.255 11.657 160 18.136 160-46.505 0-28.567-29.95-42.982-29.95-76.642C162.05 44.146 190.265 32 214.842 32c20.035 0 43.43 9.244 43.43 35.298 0 29.426-34.272 40.752-34.272 80.61 0 57.828 100.845 50.931 158.22 43.093C374.142 245.294 373.959 320 429.086 320c29.143 0 43.674-32 77.498-32C531.543 288 544 311.301 544 336c0 34.413-20.977 49.893-35.872 49.893z"] };
var faQrcode = { prefix: 'fal', iconName: 'qrcode', icon: [448, 512, [], "f029", "M0 224h192V32H0v192zM32 64h128v128H32V64zm224-32v192h192V32H256zm160 160H288V64h128v128zM0 480h192V288H0v192zm32-160h128v128H32V320zM64 96h64v64H64V96zm320 64h-64V96h64v64zM64 352h64v64H64v-64zm352-64h32v128H320v-32h-32v96h-32V288h96v32h64v-32zm0 160h32v32h-32v-32zm-64 0h32v32h-32v-32z"] };
var faQuestion = { prefix: 'fal', iconName: 'question', icon: [384, 512, [], "f128", "M200.343 0C124.032 0 69.761 31.599 28.195 93.302c-14.213 21.099-9.458 49.674 10.825 65.054l42.034 31.872c20.709 15.703 50.346 12.165 66.679-8.51 21.473-27.181 28.371-31.96 46.132-31.96 10.218 0 25.289 6.999 25.289 18.242 0 25.731-109.3 20.744-109.3 122.251V304c0 16.007 7.883 30.199 19.963 38.924C109.139 360.547 96 386.766 96 416c0 52.935 43.065 96 96 96s96-43.065 96-96c0-29.234-13.139-55.453-33.817-73.076 12.08-8.726 19.963-22.917 19.963-38.924v-4.705c25.386-18.99 104.286-44.504 104.286-139.423C378.432 68.793 288.351 0 200.343 0zM192 480c-35.29 0-64-28.71-64-64s28.71-64 64-64 64 28.71 64 64-28.71 64-64 64zm50.146-186.406V304c0 8.837-7.163 16-16 16h-68.292c-8.836 0-16-7.163-16-16v-13.749c0-86.782 109.3-57.326 109.3-122.251 0-32-31.679-50.242-57.289-50.242-33.783 0-49.167 16.18-71.242 44.123-5.403 6.84-15.284 8.119-22.235 2.848l-42.034-31.872c-6.757-5.124-8.357-14.644-3.62-21.677C88.876 60.499 132.358 32 200.343 32c70.663 0 146.089 55.158 146.089 127.872 0 96.555-104.286 98.041-104.286 133.722z"] };
var faQuestionCircle = { prefix: 'fal', iconName: 'question-circle', icon: [512, 512, [], "f059", "M256 340c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28zm7.67-24h-16c-6.627 0-12-5.373-12-12v-.381c0-70.343 77.44-63.619 77.44-107.408 0-20.016-17.761-40.211-57.44-40.211-29.144 0-44.265 9.649-59.211 28.692-3.908 4.98-11.054 5.995-16.248 2.376l-13.134-9.15c-5.625-3.919-6.86-11.771-2.645-17.177C185.658 133.514 210.842 116 255.67 116c52.32 0 97.44 29.751 97.44 80.211 0 67.414-77.44 63.849-77.44 107.408V304c0 6.627-5.373 12-12 12zM256 40c118.621 0 216 96.075 216 216 0 119.291-96.61 216-216 216-119.244 0-216-96.562-216-216 0-119.203 96.602-216 216-216m0-32C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8z"] };
var faQuestionSquare = { prefix: 'fal', iconName: 'question-square', icon: [448, 512, [], "f2fd", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zm-192-92c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28zm7.67-24h-16c-6.627 0-12-5.373-12-12v-.381c0-70.343 77.44-63.619 77.44-107.408 0-20.016-17.761-40.211-57.44-40.211-29.144 0-44.265 9.649-59.211 28.692-3.908 4.98-11.054 5.995-16.248 2.376l-13.134-9.15c-5.625-3.919-6.86-11.771-2.645-17.177C153.658 133.514 178.842 116 223.67 116c52.32 0 97.44 29.751 97.44 80.211 0 67.414-77.44 63.849-77.44 107.408V304c0 6.627-5.373 12-12 12z"] };
var faQuidditch = { prefix: 'fal', iconName: 'quidditch', icon: [640, 512, [], "f458", "M638.3 15.5L628.3 3c-2.8-3.5-7.8-4-11.2-1.3l-244.2 193-45.4-57.1c-5-6.3-14.6-6-19.2.5l-48.6 68.6c-28.5.3-107.2 5-158 45.4C38.8 302.1 0 511.4 0 511.4c15.4.7 215.1 6.8 275.6-41.3 50.9-40.5 73.3-116.2 80-143.8l77.5-31.3c7.4-3 9.9-12.3 4.9-18.6l-45.2-56.7L637 26.8c3.4-2.8 4-7.8 1.3-11.3zM255.7 445.6C229 466.8 146.3 480 39.8 480h-.6c4.1-17.8 9-36.8 14.4-55.9l68.8-54.7c5-3.9 1.2-11.9-5-10.6l-46 9.7c15-41.6 32.3-77.3 50.1-91.5 33.6-26.7 89.7-37.2 133.9-38.4l67.8 85.1c-7.1 27.7-27.1 89.8-67.5 121.9zm87.1-148.8l-56.9-71.5 28.4-40.5c2.3-3.3 7.1-3.4 9.6-.3l67.6 84.9c2.5 3.2 1.3 7.9-2.5 9.3l-46.2 18.1zM496 351.5c-44.1 0-80 35.8-80 79.9s35.9 80.6 80 80.6 80-36.5 80-80.6-35.8-79.9-80-79.9zm0 127.9c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z"] };
var faQuoteLeft = { prefix: 'fal', iconName: 'quote-left', icon: [576, 512, [], "f10d", "M336 480h160c26.467 0 48-21.533 48-48V272c0-26.467-21.533-48-48-48h-50.386c9.567-31.726 34.591-49.541 66.159-60.461C531.049 156.87 544 138.654 544 118.208V80.01c0-30.932-29.095-54.082-59.551-46.591C353.208 65.7 288 163.181 288 296v136c0 26.467 21.533 48 48 48zm-16-184c0-119.516 56.608-203.112 172.092-231.517C502.212 61.993 512 69.582 512 80v38.208c0 6.788-4.274 12.87-10.688 15.089-57.863 20.016-91.691 58.979-92.147 122.703H496c8.836 0 16 7.163 16 16v160c0 8.837-7.164 16-16 16H336c-8.836 0-16-7.163-16-16V296zM48 480h160c26.467 0 48-21.533 48-48V272c0-26.467-21.533-48-48-48h-50.386c9.567-31.726 34.591-49.541 66.159-60.461C243.049 156.87 256 138.654 256 118.208V80.01c0-30.932-29.095-54.082-59.551-46.591C65.208 65.7 0 163.181 0 296v136c0 26.467 21.533 48 48 48zM32 296C32 176.484 88.608 92.888 204.092 64.483 214.212 61.993 224 69.582 224 80v38.208c0 6.788-4.274 12.87-10.688 15.089-57.863 20.016-91.691 58.979-92.147 122.703H208c8.836 0 16 7.163 16 16v160c0 8.837-7.164 16-16 16H48c-8.836 0-16-7.163-16-16V296z"] };
var faQuoteRight = { prefix: 'fal', iconName: 'quote-right', icon: [576, 512, [], "f10e", "M208 32H48C21.533 32 0 53.533 0 80v160c0 26.467 21.533 48 48 48h50.386c-9.567 31.726-34.591 49.541-66.159 60.461C12.951 355.13 0 373.346 0 393.792v38.199c0 30.932 29.095 54.082 59.551 46.591C190.792 446.3 256 348.819 256 216V80c0-26.467-21.533-48-48-48zm16 184c0 119.516-56.608 203.112-172.092 231.517C41.788 450.007 32 442.418 32 432v-38.208c0-6.788 4.274-12.87 10.688-15.089 57.863-20.016 91.691-58.979 92.147-122.703H48c-8.836 0-16-7.163-16-16V80c0-8.837 7.164-16 16-16h160c8.836 0 16 7.163 16 16v136zM496 32H336c-26.467 0-48 21.533-48 48v160c0 26.467 21.533 48 48 48h50.386c-9.567 31.726-34.591 49.541-66.159 60.461C300.951 355.13 288 373.346 288 393.792v38.199c0 30.932 29.095 54.082 59.551 46.591C478.792 446.3 544 348.819 544 216V80c0-26.467-21.533-48-48-48zm16 184c0 119.516-56.608 203.112-172.092 231.517C329.788 450.007 320 442.418 320 432v-38.208c0-6.788 4.274-12.87 10.688-15.089 57.863-20.016 91.691-58.979 92.147-122.703H336c-8.836 0-16-7.163-16-16V80c0-8.837 7.164-16 16-16h160c8.836 0 16 7.163 16 16v136z"] };
var faRacquet = { prefix: 'fal', iconName: 'racquet', icon: [640, 512, [], "f45a", "M615.5 59.6C560.6-17.9 433.3-19.2 332.7 52c-57.2 40.5-94.4 96-106.5 150.6-10.7 48.2-34.6 91.7-66.1 129.2-17.9-10-32.2.2-33.9 1.4L13.6 412c-14.4 10.1-18 30-7.8 44.5l29.4 41.9c9.9 14.1 29.7 18.2 44.5 7.8l112.6-78.8c9.5-6.7 13.7-17.6 13-28.4 36-13.7 73.8-21.7 112.3-21.7 31.6 0 112.3 21.8 211.5-48.4 101.8-72.2 140.6-192.8 86.4-269.3zM61.3 480l-29.4-41.8 112.6-78.8 29.4 41.9L61.3 480zm130-109.6l-9.7-13.9c18.7-21.7 34.8-44.9 47.4-69.6 11 33.1 29.1 49.8 44.4 61.5-27.6 3.9-55.2 11.5-82.1 22zm319.2-67.6c-85.6 60.6-194 62.4-238.3-.1-43.9-62-8.5-162.7 79-224.7 84.7-60 193.6-63.1 238.3 0 42 59.4 11.1 161.1-79 224.8z"] };
var faRandom = { prefix: 'fal', iconName: 'random', icon: [512, 512, [], "f074", "M0 128v-8c0-6.6 5.4-12 12-12h105.8c3.3 0 6.5 1.4 8.8 3.9l89.7 97-21.8 23.6L109 140H12c-6.6 0-12-5.4-12-12zm502.6 278.6l-64 64c-20.1 20.1-54.6 5.8-54.6-22.6v-44h-25.7c-3.3 0-6.5-1.4-8.8-3.9l-89.7-97 21.8-23.6L367 372h17v-52c0-28.5 34.5-42.7 54.6-22.6l64 64c12.5 12.5 12.5 32.7 0 45.2zm-19.8-25.4l-64-64c-2.5-2.5-6.8-.7-6.8 2.8v128c0 3.6 4.3 5.4 6.8 2.8l64-64c1.6-1.5 1.6-4.1 0-5.6zm19.8-230.6l-64 64c-20.1 20.1-54.6 5.8-54.6-22.6v-52h-17L126.6 400.1c-2.3 2.5-5.5 3.9-8.8 3.9H12c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h97l240.4-260.1c2.3-2.5 5.5-3.9 8.8-3.9H384V64c0-28.5 34.5-42.7 54.6-22.6l64 64c12.5 12.5 12.5 32.7 0 45.2zm-19.8-25.4l-64-64c-2.5-2.5-6.8-.7-6.8 2.8v128c0 3.6 4.3 5.4 6.8 2.8l64-64c1.6-1.5 1.6-4.1 0-5.6z"] };
var faRectangleLandscape = { prefix: 'fal', iconName: 'rectangle-landscape', icon: [512, 512, [], "f2fa", "M464 64H48C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zm16 336c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16h416c8.8 0 16 7.2 16 16v288z"] };
var faRectanglePortrait = { prefix: 'fal', iconName: 'rectangle-portrait', icon: [384, 512, [], "f2fb", "M384 464V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48zM48 480c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h288c8.8 0 16 7.2 16 16v416c0 8.8-7.2 16-16 16H48z"] };
var faRectangleWide = { prefix: 'fal', iconName: 'rectangle-wide', icon: [640, 512, [], "f2fc", "M592 96H48c-26.5 0-48 21.5-48 48v224c0 26.5 21.5 48 48 48h544c26.5 0 48-21.5 48-48V144c0-26.5-21.5-48-48-48zm16 272c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16h544c8.8 0 16 7.2 16 16v224z"] };
var faRecycle = { prefix: 'fal', iconName: 'recycle', icon: [512, 512, [], "f1b8", "M201.728 62.049l-43.385 69.459c-3.511 5.622-10.916 7.332-16.537 3.819l-6.781-4.237c-5.619-3.511-7.329-10.912-3.819-16.533l43.387-69.48c37.575-60.12 125.263-60.084 162.816 0l46.217 74.015 12.037-52.14c1.491-6.458 7.934-10.484 14.392-8.993l7.794 1.799c6.458 1.491 10.484 7.934 8.993 14.392l-21.633 93.702c-1.491 6.458-7.934 10.484-14.392 8.993l-93.702-21.633c-6.458-1.491-10.484-7.934-8.993-14.392l1.799-7.794c1.491-6.458 7.934-10.484 14.392-8.993l52.202 12.052-46.251-74.047c-25.002-40.006-83.467-40.099-108.536.011zm295.56 239.071l-52.939-84.78c-3.511-5.623-10.916-7.334-16.538-3.821l-6.767 4.228c-5.62 3.512-7.329 10.913-3.819 16.534l52.966 84.798c26.605 42.568-4.054 97.92-54.272 97.92H310.627l37.858-37.858c4.686-4.686 4.686-12.284 0-16.97l-5.656-5.656c-4.686-4.686-12.284-4.686-16.97 0l-68 68c-4.686 4.686-4.686 12.284 0 16.971l68 68c4.686 4.686 12.284 4.686 16.97 0l5.656-5.657c4.686-4.686 4.686-12.284 0-16.971L310.627 448H415.88c75.274 0 121.335-82.997 81.408-146.88zM41.813 318.069l55.803-89.339 12.044 52.166c1.491 6.458 7.934 10.484 14.392 8.993l7.794-1.799c6.458-1.491 10.484-7.934 8.993-14.392l-21.633-93.702c-1.491-6.458-7.934-10.484-14.392-8.993l-93.702 21.633c-6.458 1.491-10.484 7.934-8.993 14.392l1.799 7.794c1.491 6.458 7.934 10.484 14.392 8.993l52.193-12.05-55.796 89.355C-25.188 364.952 20.781 448 96.115 448H196c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H96.078c-50.199 0-80.887-55.335-54.265-97.931z"] };
var faRedo = { prefix: 'fal', iconName: 'redo', icon: [512, 512, [], "f01e", "M492 8h-10c-6.627 0-12 5.373-12 12v110.625C426.804 57.047 346.761 7.715 255.207 8.001 118.82 8.428 7.787 120.009 8 256.396 8.214 393.181 119.166 504 256 504c63.926 0 122.202-24.187 166.178-63.908 5.113-4.618 5.354-12.561.482-17.433l-7.069-7.069c-4.503-4.503-11.749-4.714-16.482-.454C361.218 449.238 311.065 470 256 470c-117.744 0-214-95.331-214-214 0-117.744 95.331-214 214-214 82.862 0 154.737 47.077 190.289 116H332c-6.627 0-12 5.373-12 12v10c0 6.627 5.373 12 12 12h160c6.627 0 12-5.373 12-12V20c0-6.627-5.373-12-12-12z"] };
var faRedoAlt = { prefix: 'fal', iconName: 'redo-alt', icon: [512, 512, [], "f2f9", "M512 32.015V160c0 17.673-14.327 32-32 32H352.032c-28.482 0-42.727-34.528-22.627-54.627l53.617-53.624C346.671 56.872 302.514 42 256 42 137.589 42 42 137.974 42 256c0 118.415 95.978 214 214 214 53.682 0 104.151-19.797 143.108-54.884 4.728-4.258 11.973-4.035 16.472.464l7.079 7.079c4.872 4.872 4.631 12.815-.482 17.433C378.202 479.813 319.926 504 256 504 119.189 504 8.252 393.219 8 256.467 7.749 119.827 119.183 8.096 255.822 8c57.021-.04 109.545 19.177 151.456 51.489l50.095-50.101C477.436-10.676 512 3.54 512 32.015zM480 32L352 160h128V32"] };
var faRegistered = { prefix: 'fal', iconName: 'registered', icon: [512, 512, [], "f25d", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm216 248c0 118.663-96.055 216-216 216-118.663 0-216-96.055-216-216 0-118.663 96.055-216 216-216 118.663 0 216 96.055 216 216zM359.387 374.293c-56.637-104.76-51.795-95.919-53.681-99.047 27.113-11.899 44.118-39.432 44.118-72.825 0-57.934-36.794-80.198-93.917-80.198h-71.086c-6.617 0-12 5.383-12 12V380c0 6.617 5.383 12 12 12h16.908c6.617 0 12-5.383 12-12v-94.854h51.111l54.004 100.532a11.983 11.983 0 0 0 10.57 6.321h19.416c9.1.001 14.878-9.717 10.557-17.706zm-93.371-127.528H213.73v-86.161h43.261c20.716 0 51.203 1.092 51.203 42.539-.001 27.314-15.768 43.622-42.178 43.622z"] };
var faRepeat = { prefix: 'fal', iconName: 'repeat', icon: [512, 512, [], "f363", "M512 256c0 88.225-71.775 160-160 160H110.628l68.201 68.201c4.686 4.686 4.686 12.284 0 16.971l-5.656 5.656c-4.686 4.686-12.284 4.686-16.971 0l-98.343-98.343c-4.686-4.686-4.686-12.284 0-16.971l98.343-98.343c4.686-4.686 12.284-4.686 16.971 0l5.656 5.656c4.686 4.686 4.686 12.284 0 16.971L110.628 384H352c70.579 0 128-57.421 128-128 0-28.555-9.403-54.952-25.271-76.268-3.567-4.792-3.118-11.462 1.106-15.686l5.705-5.705c5.16-5.16 13.678-4.547 18.083 1.271C499.935 186.438 512 219.835 512 256zM57.271 332.268C41.403 310.952 32 284.555 32 256c0-70.579 57.421-128 128-128h241.372l-68.201 68.201c-4.686 4.686-4.686 12.284 0 16.971l5.656 5.656c4.686 4.686 12.284 4.686 16.971 0l98.343-98.343c4.686-4.686 4.686-12.284 0-16.971L355.799 5.172c-4.686-4.686-12.284-4.686-16.971 0l-5.656 5.656c-4.686 4.686-4.686 12.284 0 16.971L401.372 96H160C71.775 96 0 167.775 0 256c0 36.165 12.065 69.562 32.376 96.387 4.405 5.818 12.923 6.432 18.083 1.271l5.705-5.705c4.225-4.224 4.674-10.893 1.107-15.685z"] };
var faRepeat1 = { prefix: 'fal', iconName: 'repeat-1', icon: [512, 512, [], "f365", "M512 256c0 88.225-71.775 160-160 160H110.628l68.201 68.201c4.686 4.686 4.686 12.284 0 16.971l-5.656 5.656c-4.686 4.686-12.284 4.686-16.971 0l-98.343-98.343c-4.686-4.686-4.686-12.284 0-16.971l98.343-98.343c4.686-4.686 12.284-4.686 16.971 0l5.656 5.656c4.686 4.686 4.686 12.284 0 16.971L110.628 384H352c70.579 0 128-57.421 128-128 0-28.555-9.403-54.952-25.271-76.268-3.567-4.792-3.118-11.462 1.106-15.686l5.705-5.705c5.16-5.16 13.678-4.547 18.083 1.271C499.935 186.438 512 219.835 512 256zM57.271 332.268C41.403 310.952 32 284.555 32 256c0-70.579 57.421-128 128-128h241.372l-68.201 68.201c-4.686 4.686-4.686 12.284 0 16.971l5.656 5.656c4.686 4.686 12.284 4.686 16.971 0l98.343-98.343c4.686-4.686 4.686-12.284 0-16.971L355.799 5.172c-4.686-4.686-12.284-4.686-16.971 0l-5.656 5.656c-4.686 4.686-4.686 12.284 0 16.971L401.372 96H160C71.775 96 0 167.775 0 256c0 36.165 12.065 69.562 32.376 96.387 4.405 5.818 12.923 6.432 18.083 1.271l5.705-5.705c4.225-4.224 4.674-10.893 1.107-15.685zm172.224-29.275c0-6.444 3.401-9.847 9.847-9.847h17.365v-53.348c0-4.834.179-9.847.179-9.847h-.359s-1.79 3.939-3.938 5.729l-1.611 1.432c-4.655 4.298-9.489 4.117-13.786-.537l-4.654-5.013c-4.475-4.654-4.297-9.487.358-13.963l22.2-20.767c3.759-3.401 7.161-4.833 12.173-4.833h10.205c6.444 0 9.846 3.4 9.846 9.846v91.301h17.544c6.444 0 9.847 3.402 9.847 9.847v7.162c0 6.444-3.402 9.846-9.847 9.846h-65.522c-6.445 0-9.847-3.402-9.847-9.846v-7.162z"] };
var faRepeat1Alt = { prefix: 'fal', iconName: 'repeat-1-alt', icon: [512, 512, [], "f366", "M54.027 327.713C40.129 307.242 32 282.553 32 256c0-70.579 57.421-128 128-128h160v63.969c0 29.239 36.192 43.177 55.785 21.407l72-79.968c10.952-12.169 10.953-30.644 0-42.814l-72-79.974C356.226-11.114 320 2.738 320 32.026V96H160C71.775 96 0 167.775 0 256c0 33.913 10.612 65.391 28.683 91.299 4.427 6.348 13.606 6.936 18.785 1.185l5.488-6.096c3.667-4.073 4.149-10.14 1.071-14.675zM352 32l72 80-72 80V32zm131.317 132.701c-4.427-6.348-13.606-6.936-18.785-1.185l-5.488 6.096c-3.667 4.073-4.149 10.14-1.071 14.675C471.871 204.758 480 229.447 480 256c0 70.579-57.421 128-128 128H192v-63.969c0-29.239-36.192-43.177-55.785-21.407l-72 79.969c-10.952 12.169-10.953 30.644 0 42.814l72 79.974C155.774 523.113 192 509.264 192 479.974V416h160c88.225 0 160-71.775 160-160 0-33.913-10.612-65.391-28.683-91.299zM160 480l-72-80 72-80v160zm69.495-177.007c0-6.444 3.401-9.847 9.847-9.847h17.365v-53.348c0-4.834.179-9.847.179-9.847h-.359s-1.79 3.939-3.938 5.729l-1.611 1.432c-4.655 4.298-9.489 4.117-13.786-.537l-4.654-5.013c-4.475-4.654-4.297-9.487.358-13.963l22.2-20.767c3.759-3.401 7.161-4.833 12.173-4.833h10.205c6.444 0 9.846 3.4 9.846 9.846v91.301h17.544c6.444 0 9.847 3.402 9.847 9.847v7.162c0 6.443-3.402 9.846-9.847 9.846h-65.522c-6.445 0-9.847-3.402-9.847-9.846v-7.162z"] };
var faRepeatAlt = { prefix: 'fal', iconName: 'repeat-alt', icon: [512, 512, [], "f364", "M54.027 327.713C40.129 307.242 32 282.553 32 256c0-70.579 57.421-128 128-128h160v63.969c0 29.239 36.192 43.177 55.785 21.407l72-79.968c10.952-12.169 10.953-30.644 0-42.814l-72-79.974C356.226-11.114 320 2.738 320 32.026V96H160C71.775 96 0 167.775 0 256c0 33.913 10.612 65.391 28.683 91.299 4.427 6.348 13.606 6.936 18.785 1.185l5.488-6.096c3.667-4.073 4.149-10.14 1.071-14.675zM352 32l72 80-72 80V32zm131.317 132.701c-4.427-6.348-13.606-6.936-18.785-1.185l-5.488 6.096c-3.667 4.073-4.149 10.14-1.071 14.675C471.871 204.758 480 229.447 480 256c0 70.579-57.421 128-128 128H192v-63.969c0-29.239-36.192-43.177-55.785-21.407l-72 79.969c-10.952 12.169-10.953 30.644 0 42.814l72 79.974C155.774 523.113 192 509.264 192 479.974V416h160c88.225 0 160-71.775 160-160 0-33.913-10.612-65.391-28.683-91.299zM160 480l-72-80 72-80v160z"] };
var faReply = { prefix: 'fal', iconName: 'reply', icon: [576, 512, [], "f3e5", "M11.093 251.65l175.998 184C211.81 461.494 256 444.239 256 408v-87.84c154.425 1.812 219.063 16.728 181.19 151.091-8.341 29.518 25.447 52.232 49.68 34.51C520.16 481.421 576 426.17 576 331.19c0-171.087-154.548-201.035-320-203.02V40.016c0-36.27-44.216-53.466-68.91-27.65L11.093 196.35c-14.791 15.47-14.791 39.83 0 55.3zm23.127-33.18l176-184C215.149 29.31 224 32.738 224 40v120c157.114 0 320 11.18 320 171.19 0 74.4-40 122.17-76.02 148.51C519.313 297.707 395.396 288 224 288v120c0 7.26-8.847 10.69-13.78 5.53l-176-184a7.978 7.978 0 0 1 0-11.06z"] };
var faReplyAll = { prefix: 'fal', iconName: 'reply-all', icon: [576, 512, [], "f122", "M105.368 246.631l160.002 159.98c20.02 20.01 54.63 5.98 54.63-22.63v-71.15c121.58 4.36 148.9 28.23 121.2 126.42-8.35 29.59 25.5 52.21 49.69 34.51 51.57-37.71 85.11-90.99 85.11-155.97 0-152.9-140.5-177.23-256-181.07v-72.69c0-28.59-34.59-42.67-54.63-22.63l-160.002 159.97c-12.491 12.5-12.491 32.76 0 45.26zM128 224.001l160-160v104.1c130.165 1.345 256 18.265 256 149.69 0 65.1-40.49 107.16-72 130.21 40.979-145.267-38.329-166.574-184-167.9v103.9l-160-160zM9.372 201.373l160-159.974c13.467-13.467 33.495-11.506 45.189-.105L32 224.001l182.564 182.712c-11.699 11.403-31.738 13.347-45.191-.106l-160-159.978c-12.497-12.498-12.497-32.759-.001-45.256z"] };
var faRetweet = { prefix: 'fal', iconName: 'retweet', icon: [640, 512, [], "f079", "M634.828 363.799l-98.343 98.343c-4.686 4.686-12.284 4.686-16.971 0l-98.343-98.343c-4.686-4.686-4.686-12.284 0-16.971l5.656-5.656c4.686-4.686 12.284-4.686 16.971 0l68.202 68.2V128H260.024a11.996 11.996 0 0 1-8.485-3.515l-8-8c-7.56-7.56-2.206-20.485 8.485-20.485H520c13.255 0 24 10.745 24 24v289.372l68.201-68.201c4.686-4.686 12.284-4.686 16.971 0l5.656 5.656c4.686 4.687 4.686 12.285 0 16.972zm-246.367 23.716a12.002 12.002 0 0 0-8.485-3.515H128V102.628l68.201 68.2c4.686 4.686 12.284 4.686 16.97 0l5.657-5.657c4.686-4.686 4.687-12.284 0-16.971l-98.343-98.343c-4.686-4.686-12.284-4.686-16.971 0L5.172 148.201c-4.686 4.686-4.686 12.285 0 16.971l5.657 5.657c4.686 4.686 12.284 4.686 16.97 0L96 102.628V392c0 13.255 10.745 24 24 24h267.976c10.691 0 16.045-12.926 8.485-20.485l-8-8z"] };
var faRetweetAlt = { prefix: 'fal', iconName: 'retweet-alt', icon: [640, 512, [], "f361", "M607.974 320H544V120c0-13.255-10.745-24-24-24H252.024c-10.998 0-16.202 13.562-8.028 20.919l8.889 8a12 12 0 0 0 8.028 3.081H512v192h-63.968c-29.239 0-43.177 36.192-21.407 55.785l79.969 72c12.169 10.952 30.644 10.953 42.814 0l79.974-72C651.113 356.226 637.264 320 607.974 320zM528 424l-80-72h160l-80 72zm-131.997-28.92l-8.889-8a12 12 0 0 0-8.028-3.08H128V192h63.968c29.239 0 43.177-36.192 21.407-55.785l-79.968-72c-12.169-10.952-30.644-10.953-42.814 0l-79.974 72C-11.114 155.774 2.738 192 32.026 192H96v200c0 13.255 10.745 24 24 24h267.976c10.998 0 16.202-13.562 8.027-20.92zM32 160l80-72 80 72H32z"] };
var faRoad = { prefix: 'fal', iconName: 'road', icon: [576, 512, [], "f018", "M260.3 441.7l5.3-116c.1-3.2 2.8-5.7 6-5.7h32.9c3.2 0 5.8 2.5 6 5.7l5.3 116c.2 3.4-2.6 6.3-6 6.3h-43.4c-3.5 0-6.3-2.9-6.1-6.3zM272.5 288h31c2.9 0 5.1-2.4 5-5.2l-3.9-86c-.1-2.7-2.3-4.8-5-4.8h-23.2c-2.7 0-4.9 2.1-5 4.8l-3.9 86c-.1 2.8 2.2 5.2 5 5.2zm4.4-120h22.2c2.3 0 4.1-1.9 4-4.2l-2.2-48c-.1-2.1-1.9-3.8-4-3.8h-17.8c-2.1 0-3.9 1.7-4 3.8l-2.2 48c-.1 2.3 1.7 4.2 4 4.2zm2.3-72h17.7c1.7 0 3.1-1.4 3-3.1l-1.2-26c-.1-1.6-1.4-2.9-3-2.9h-15.3c-1.6 0-2.9 1.3-3 2.9l-1.2 26c-.1 1.7 1.2 3.1 3 3.1zM6 448h42.8c2.6 0 4.9-1.7 5.7-4.2L172 67.9c.6-1.9-.8-3.9-2.9-3.9h-17.9c-1.2 0-2.3.8-2.8 1.9L.4 439.8c-1.5 3.9 1.4 8.2 5.6 8.2zm521.2 0H570c4.2 0 7.1-4.3 5.6-8.2l-148-373.9c-.5-1.1-1.6-1.9-2.8-1.9h-17.9c-2 0-3.5 2-2.9 3.9l117.5 375.9c.8 2.5 3.1 4.2 5.7 4.2z"] };
var faRocket = { prefix: 'fal', iconName: 'rocket', icon: [511, 512, [], "f135", "M501.8 19.1c-1.1-4.4-4.5-7.8-8.8-8.8C453.7.7 442.5 0 408 0c-68.6 0-128.1 44.9-173.8 96H106.7c-11.4 0-21.9 6-27.6 15.9l-74.7 128C-8 261.2 7.4 288 32 288h82.7c-8.6 19.1-14.3 33.5-18.6 44.6-1.7 4.4-.7 9.5 2.7 12.8l67.7 67.7c3.4 3.4 8.4 4.4 12.8 2.7 11.2-4.3 25.5-10 44.6-18.6V480c0 24.7 26.8 40.1 48.1 27.6l128-74.7c9.8-5.7 15.9-16.3 15.9-27.6V277.8c51.1-45.7 96-105.2 96-173.8.1-34.5-.6-45.8-10.1-84.9zM32 256l74.7-128h101.1c-32.5 42.6-58.6 88.3-78.1 128H32zm224 224v-97.7c39.7-19.5 85.4-45.5 128-78.1v101.1L256 480zm-76.1-98.7l-49.1-49.1C177.6 215.9 283.8 32 408.1 32c24.7 0 37.3 0 65.5 6.5C480 66.7 480 79.2 480 104c0 124.3-184.1 230.5-300.1 277.3zM368 88c-30.9 0-56 25.1-56 56s25.1 56 56 56 56-25.1 56-56-25.1-56-56-56zm0 80c-13.2 0-24-10.8-24-24s10.8-24 24-24 24 10.8 24 24-10.8 24-24 24z"] };
var faRss = { prefix: 'fal', iconName: 'rss', icon: [448, 512, [], "f09e", "M80 352c26.467 0 48 21.533 48 48s-21.533 48-48 48-48-21.533-48-48 21.533-48 48-48m0-32c-44.183 0-80 35.817-80 80s35.817 80 80 80 80-35.817 80-80-35.817-80-80-80zm367.996 147.615c-6.448-237.848-198.06-429.164-435.61-435.61C5.609 31.821 0 37.229 0 44.007v8.006c0 6.482 5.146 11.816 11.626 11.994 220.81 6.05 398.319 183.913 404.367 404.367.178 6.48 5.512 11.626 11.994 11.626h8.007c6.778 0 12.185-5.609 12.002-12.385zm-144.245-.05c-6.347-158.132-133.207-284.97-291.316-291.316C5.643 175.976 0 181.45 0 188.247v8.005c0 6.459 5.114 11.72 11.567 11.989 141.134 5.891 254.301 119.079 260.192 260.192.269 6.453 5.531 11.567 11.989 11.567h8.005c6.798 0 12.271-5.643 11.998-12.435z"] };
var faRssSquare = { prefix: 'fal', iconName: 'rss-square', icon: [448, 512, [], "f143", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zM144 320c8.822 0 16 7.177 16 16s-7.178 16-16 16-16-7.177-16-16 7.178-16 16-16m0-32c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48zm195.981 96h-8.019c-6.369 0-11.678-4.969-11.993-11.33-5.676-114.835-97.728-206.959-212.639-212.639-6.362-.314-11.33-5.623-11.33-11.993v-8.019c0-6.826 5.683-12.331 12.502-12.006 131.615 6.279 237.203 111.811 243.485 243.485.325 6.819-5.18 12.502-12.006 12.502zm-72.006 0h-8.045c-6.298 0-11.53-4.859-11.986-11.14-5.463-75.234-65.751-135.364-140.824-140.805-6.274-.454-11.12-5.695-11.12-11.985v-8.045c0-7.003 5.957-12.482 12.943-11.995 91.397 6.367 164.66 79.629 171.027 171.027.487 6.986-4.992 12.943-11.995 12.943z"] };
var faRubleSign = { prefix: 'fal', iconName: 'ruble-sign', icon: [384, 512, [], "f158", "M245.712 287.809c80.296 0 138.288-50.323 138.288-128.803C384 81.125 326.009 32 245.712 32H108c-6.627 0-12 5.373-12 12v204H12c-6.627 0-12 5.373-12 12v16c0 6.627 5.373 12 12 12h84v58H12c-6.627 0-12 5.373-12 12v14c0 6.627 5.373 12 12 12h84v84c0 6.627 5.373 12 12 12h19.971c6.627 0 12-5.373 12-12v-84H308c6.627 0 12-5.373 12-12v-14c0-6.627-5.373-12-12-12H139.971v-58.191h105.741zM139.971 71.594h104.643c59.266 0 98.14 31.979 98.14 87.215 0 55.818-38.873 88.96-98.777 88.96H139.971V71.594z"] };
var faRupeeSign = { prefix: 'fal', iconName: 'rupee-sign', icon: [320, 512, [], "f156", "M320 60V44c0-6.627-5.373-12-12-12H12C5.373 32 0 37.373 0 44v16c0 6.627 5.373 12 12 12h72.614c47.093 0 81.306 20.121 93.376 56H12c-6.627 0-12 5.373-12 12v16c0 6.627 5.373 12 12 12h170.387c-4.043 50.107-41.849 79.554-98.41 79.554H12c-6.627 0-12 5.373-12 12v15.807c0 2.985 1.113 5.863 3.121 8.072l175.132 192.639a11.998 11.998 0 0 0 8.879 3.928h21.584c10.399 0 15.876-12.326 8.905-20.043L62.306 288h23.407c77.219 0 133.799-46.579 138.024-120H308c6.627 0 12-5.373 12-12v-16c0-6.627-5.373-12-12-12h-87.338c-4.96-22.088-15.287-40.969-29.818-56H308c6.627 0 12-5.373 12-12z"] };
var faSave = { prefix: 'fal', iconName: 'save', icon: [448, 512, [], "f0c7", "M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM288 64v96H96V64h192zm128 368c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h16v104c0 13.255 10.745 24 24 24h208c13.255 0 24-10.745 24-24V64.491a15.888 15.888 0 0 1 7.432 4.195l83.882 83.882A15.895 15.895 0 0 1 416 163.882V432zM224 232c-48.523 0-88 39.477-88 88s39.477 88 88 88 88-39.477 88-88-39.477-88-88-88zm0 144c-30.879 0-56-25.121-56-56s25.121-56 56-56 56 25.121 56 56-25.121 56-56 56z"] };
var faScrubber = { prefix: 'fal', iconName: 'scrubber', icon: [496, 512, [], "f2f8", "M248 40c119.3 0 216 96.6 216 216 0 119.3-96.6 216-216 216-119.3 0-216-96.6-216-216 0-119.3 96.6-216 216-216m0-32C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 216c17.6 0 32 14.4 32 32s-14.4 32-32 32-32-14.4-32-32 14.4-32 32-32m0-32c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64z"] };
var faSearch = { prefix: 'fal', iconName: 'search', icon: [512, 512, [], "f002", "M508.5 481.6l-129-129c-2.3-2.3-5.3-3.5-8.5-3.5h-10.3C395 312 416 262.5 416 208 416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c54.5 0 104-21 141.1-55.2V371c0 3.2 1.3 6.2 3.5 8.5l129 129c4.7 4.7 12.3 4.7 17 0l9.9-9.9c4.7-4.7 4.7-12.3 0-17zM208 384c-97.3 0-176-78.7-176-176S110.7 32 208 32s176 78.7 176 176-78.7 176-176 176z"] };
var faSearchMinus = { prefix: 'fal', iconName: 'search-minus', icon: [512, 512, [], "f010", "M307.8 223.8h-200c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h200c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12zM508.3 497L497 508.3c-4.7 4.7-12.3 4.7-17 0l-129-129c-2.3-2.3-3.5-5.3-3.5-8.5v-8.5C310.6 395.7 261.7 416 208 416 93.8 416 1.5 324.9 0 210.7-1.5 93.7 93.7-1.5 210.7 0 324.9 1.5 416 93.8 416 208c0 53.7-20.3 102.6-53.7 139.5h8.5c3.2 0 6.2 1.3 8.5 3.5l129 129c4.7 4.7 4.7 12.3 0 17zM384 208c0-97.3-78.7-176-176-176S32 110.7 32 208s78.7 176 176 176 176-78.7 176-176z"] };
var faSearchPlus = { prefix: 'fal', iconName: 'search-plus', icon: [512, 512, [], "f00e", "M319.8 204v8c0 6.6-5.4 12-12 12h-84v84c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12v-84h-84c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h84v-84c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v84h84c6.6 0 12 5.4 12 12zm188.5 293L497 508.3c-4.7 4.7-12.3 4.7-17 0l-129-129c-2.3-2.3-3.5-5.3-3.5-8.5v-8.5C310.6 395.7 261.7 416 208 416 93.8 416 1.5 324.9 0 210.7-1.5 93.7 93.7-1.5 210.7 0 324.9 1.5 416 93.8 416 208c0 53.7-20.3 102.6-53.7 139.5h8.5c3.2 0 6.2 1.3 8.5 3.5l129 129c4.7 4.7 4.7 12.3 0 17zM384 208c0-97.3-78.7-176-176-176S32 110.7 32 208s78.7 176 176 176 176-78.7 176-176z"] };
var faServer = { prefix: 'fal', iconName: 'server', icon: [512, 512, [], "f233", "M376 256c0-13.255 10.745-24 24-24s24 10.745 24 24-10.745 24-24 24-24-10.745-24-24zm-40 24c13.255 0 24-10.745 24-24s-10.745-24-24-24-24 10.745-24 24 10.745 24 24 24zm176-128c0 12.296-4.629 23.507-12.232 32 7.603 8.493 12.232 19.704 12.232 32v80c0 12.296-4.629 23.507-12.232 32 7.603 8.493 12.232 19.704 12.232 32v80c0 26.51-21.49 48-48 48H48c-26.51 0-48-21.49-48-48v-80c0-12.296 4.629-23.507 12.232-32C4.629 319.507 0 308.296 0 296v-80c0-12.296 4.629-23.507 12.232-32C4.629 175.507 0 164.296 0 152V72c0-26.51 21.49-48 48-48h416c26.51 0 48 21.49 48 48v80zm-480 0c0 8.822 7.178 16 16 16h416c8.822 0 16-7.178 16-16V72c0-8.822-7.178-16-16-16H48c-8.822 0-16 7.178-16 16v80zm432 48H48c-8.822 0-16 7.178-16 16v80c0 8.822 7.178 16 16 16h416c8.822 0 16-7.178 16-16v-80c0-8.822-7.178-16-16-16zm16 160c0-8.822-7.178-16-16-16H48c-8.822 0-16 7.178-16 16v80c0 8.822 7.178 16 16 16h416c8.822 0 16-7.178 16-16v-80zm-80-224c13.255 0 24-10.745 24-24s-10.745-24-24-24-24 10.745-24 24 10.745 24 24 24zm-64 0c13.255 0 24-10.745 24-24s-10.745-24-24-24-24 10.745-24 24 10.745 24 24 24zm64 240c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm-64 0c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24z"] };
var faShare = { prefix: 'fal', iconName: 'share', icon: [576, 512, [], "f064", "M564.907 196.35L388.91 12.366C364.216-13.45 320 3.746 320 40.016v88.154C154.548 130.155 0 160.103 0 331.19c0 94.98 55.84 150.231 89.13 174.571 24.233 17.722 58.021-4.992 49.68-34.51C100.937 336.887 165.575 321.972 320 320.16V408c0 36.239 44.19 53.494 68.91 27.65l175.998-184c14.79-15.47 14.79-39.83-.001-55.3zm-23.127 33.18l-176 184c-4.933 5.16-13.78 1.73-13.78-5.53V288c-171.396 0-295.313 9.707-243.98 191.7C72 453.36 32 405.59 32 331.19 32 171.18 194.886 160 352 160V40c0-7.262 8.851-10.69 13.78-5.53l176 184a7.978 7.978 0 0 1 0 11.06z"] };
var faShareAll = { prefix: 'fal', iconName: 'share-all', icon: [576, 512, [], "f367", "M470.632 201.371L310.63 41.4C290.59 21.36 256 35.44 256 64.03v72.69C140.5 140.56 0 164.89 0 317.79c0 64.98 33.54 118.26 85.11 155.97 24.19 17.7 58.04-4.92 49.69-34.51-27.7-98.19-.38-122.06 121.2-126.42v71.15c0 28.61 34.61 42.64 54.63 22.63l160.002-159.98c12.491-12.499 12.491-32.759 0-45.259zM288 384.001v-103.9c-145.671 1.326-224.979 22.633-184 167.9-31.51-23.05-72-65.11-72-130.21 0-131.425 125.835-148.345 256-149.69v-104.1l160 160-160 160zm278.628-137.373l-160 159.978c-13.454 13.454-33.492 11.509-45.191.106L544 224.001 361.438 41.294c11.695-11.401 31.723-13.362 45.189.105l160 159.974c12.497 12.497 12.497 32.758.001 45.255z"] };
var faShareAlt = { prefix: 'fal', iconName: 'share-alt', icon: [448, 512, [], "f1e0", "M448 416c0 53.019-42.981 96-96 96s-96-42.981-96-96c0-12.965 2.576-25.327 7.235-36.61l-95.45-59.657C150.199 339.525 124.558 352 96 352c-53.019 0-96-42.981-96-96s42.981-96 96-96c28.558 0 54.199 12.475 71.784 32.267l95.45-59.657C258.576 121.327 256 108.965 256 96c0-53.019 42.981-96 96-96s96 42.981 96 96-42.981 96-96 96c-28.558 0-54.199-12.475-71.784-32.267l-95.451 59.656c9.661 23.396 9.641 49.87 0 73.22l95.451 59.656C297.801 332.475 323.442 320 352 320c53.019 0 96 42.981 96 96zM352 32c-35.29 0-64 28.71-64 64s28.71 64 64 64 64-28.71 64-64-28.71-64-64-64M96 192c-35.29 0-64 28.71-64 64s28.71 64 64 64 64-28.71 64-64-28.71-64-64-64m256 160c-35.29 0-64 28.71-64 64s28.71 64 64 64 64-28.71 64-64-28.71-64-64-64"] };
var faShareAltSquare = { prefix: 'fal', iconName: 'share-alt-square', icon: [448, 512, [], "f1e1", "M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm16 400c0 8.822-7.178 16-16 16H48c-8.822 0-16-7.178-16-16V80c0-8.822 7.178-16 16-16h352c8.822 0 16 7.178 16 16v352zm-72-96c0 30.928-25.072 56-56 56s-56-25.072-56-56c0-3.305.303-6.538.852-9.686l-53.609-26.805C169.618 307.316 157.358 312 144 312c-30.928 0-56-25.072-56-56s25.072-56 56-56c13.358 0 25.618 4.684 35.243 12.49l53.609-26.805A56.292 56.292 0 0 1 232 176c0-30.928 25.072-56 56-56s56 25.072 56 56-25.072 56-56 56c-16.107 0-30.615-6.81-40.832-17.696l-49.744 24.872a56.217 56.217 0 0 1 0 33.647l49.744 24.872C257.385 286.81 271.893 280 288 280c30.928 0 56 25.072 56 56zm-56-184c-13.234 0-24 10.766-24 24s10.766 24 24 24 24-10.766 24-24-10.766-24-24-24m-144 80c-13.234 0-24 10.766-24 24s10.766 24 24 24 24-10.766 24-24-10.766-24-24-24m144 80c-13.234 0-24 10.766-24 24s10.766 24 24 24 24-10.766 24-24-10.766-24-24-24"] };
var faShareSquare = { prefix: 'fal', iconName: 'share-square', icon: [576, 512, [], "f14d", "M566.633 169.37L406.63 9.392C386.626-10.612 352 3.395 352 32.022v72.538C210.132 108.474 88 143.455 88 286.3c0 84.74 49.78 133.742 79.45 155.462 24.196 17.695 58.033-4.917 49.7-34.51C188.286 304.843 225.497 284.074 352 280.54V352c0 28.655 34.654 42.606 54.63 22.63l160.003-160c12.489-12.5 12.489-32.76 0-45.26zM384 352V248.04c-141.718.777-240.762 15.03-197.65 167.96C154.91 393 120 351.28 120 286.3c0-134.037 131.645-149.387 264-150.26V32l160 160-160 160zm37.095 52.186c2.216-1.582 4.298-3.323 6.735-5.584 7.68-7.128 20.17-1.692 20.17 8.787V464c0 26.51-21.49 48-48 48H48c-26.51 0-48-21.49-48-48V112c0-26.51 21.49-48 48-48h172.146c6.612 0 11.954 5.412 11.852 12.04-.084 5.446-4.045 10.087-9.331 11.396-9.462 2.343-18.465 4.974-27.074 7.914-1.25.427-2.555.65-3.876.65H48c-8.837 0-16 7.163-16 16v352c0 8.837 7.163 16 16 16h352c8.837 0 16-7.163 16-16v-50.002c0-3.905 1.916-7.543 5.095-9.812z"] };
var faShekelSign = { prefix: 'fal', iconName: 'shekel-sign', icon: [384, 512, [], "f20b", "M128 71.594H44.015V468c0 6.627-5.373 12-12 12H12c-6.627 0-12-5.373-12-12V44c0-6.627 5.373-12 12-12h117.099c80.376 0 138.425 50.316 138.425 128.197V356c0 6.65-5.408 12.031-12.057 12l-17.288-.082c-6.605-.031-11.942-5.395-11.942-12V160c0-55.236-38.912-88.406-98.237-88.406zM372 32h-20.015c-6.627 0-12 5.373-12 12v396.406H256c-59.325 0-98.237-33.17-98.237-88.406V156.082c0-6.605-5.337-11.968-11.942-12L128.533 144c-6.649-.032-12.057 5.35-12.057 12v195.803c0 77.88 58.049 128.197 138.425 128.197H372c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12z"] };
var faShield = { prefix: 'fal', iconName: 'shield', icon: [512, 512, [], "f132", "M466.5 83.7l-192-80a48.15 48.15 0 0 0-36.9 0l-192 80C27.7 91.1 16 108.6 16 128c0 198.5 114.5 335.7 221.5 380.3 11.8 4.9 25.1 4.9 36.9 0C360.1 472.6 496 349.3 496 128c0-19.4-11.7-36.9-29.5-44.3zM262.2 478.8c-3.9 1.6-8.3 1.6-12.3 0C152 440 48 304 48 128c0-6.5 3.9-12.3 9.8-14.8l192-80c3.8-1.6 8.3-1.7 12.3 0l192 80c6 2.5 9.8 8.3 9.8 14.8.1 176-103.9 312-201.7 350.8z"] };
var faShieldAlt = { prefix: 'fal', iconName: 'shield-alt', icon: [512, 512, [], "f3ed", "M256 410.955V99.999l-142.684 59.452C123.437 279.598 190.389 374.493 256 410.955zm-32-66.764c-36.413-39.896-65.832-97.846-76.073-164.495L224 147.999v196.192zM466.461 83.692l-192-80a47.996 47.996 0 0 0-36.923 0l-192 80A48 48 0 0 0 16 128c0 198.487 114.495 335.713 221.539 380.308a48 48 0 0 0 36.923 0C360.066 472.645 496 349.282 496 128a48 48 0 0 0-29.539-44.308zM262.154 478.768a16.64 16.64 0 0 1-12.31-.001C152 440 48 304 48 128c0-6.48 3.865-12.277 9.846-14.769l192-80a15.99 15.99 0 0 1 12.308 0l192 80A15.957 15.957 0 0 1 464 128c0 176-104 312-201.846 350.768z"] };
var faShieldCheck = { prefix: 'fal', iconName: 'shield-check', icon: [512, 512, [], "f2f7", "M466.461 83.692l-192-80a47.996 47.996 0 0 0-36.923 0l-192 80A48 48 0 0 0 16 128c0 198.487 114.495 335.713 221.539 380.308a48 48 0 0 0 36.923 0C360.066 472.645 496 349.282 496 128a48 48 0 0 0-29.539-44.308zM262.154 478.768a16.64 16.64 0 0 1-12.31-.001C152 440 48 304 48 128c0-6.48 3.865-12.277 9.846-14.769l192-80a15.99 15.99 0 0 1 12.308 0l192 80A15.957 15.957 0 0 1 464 128c0 176-104 312-201.846 350.768zm144.655-299.505l-180.48 179.032c-4.705 4.667-12.303 4.637-16.97-.068l-85.878-86.572c-4.667-4.705-4.637-12.303.068-16.97l8.52-8.451c4.705-4.667 12.303-4.637 16.97.068l68.976 69.533 163.441-162.13c4.705-4.667 12.303-4.637 16.97.068l8.451 8.52c4.668 4.705 4.637 12.303-.068 16.97z"] };
var faShip = { prefix: 'fal', iconName: 'ship', icon: [640, 512, [], "f21a", "M480 366.077l85.182-78.083c18.063-16.557 12.34-44.442-8.577-53.406L480 201.756V80c0-8.837-7.163-16-16-16h-48V24c0-13.255-10.745-24-24-24H248c-13.255 0-24 10.745-24 24v40h-48c-8.837 0-16 7.163-16 16v121.756l-76.055 32.595c-22.484 9.636-26.373 37.834-9.568 53.238L160 366.077C160 402.167 109.048 480 12 480c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12 65.489 0 117.316-28.984 150.756-73.148C173.036 480.79 210.938 512 256 512h128c45.062 0 82.964-31.21 93.244-73.148C510.878 483.273 562.822 512 628 512c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12-93.623 0-148-74.786-148-113.923zM256 32h128v32H256V32zm-64 64h256v92.042l-115.395-49.455a31.999 31.999 0 0 0-25.211 0L192 188.042V96zm256 256v64c0 35.346-28.654 64-64 64H256c-35.346 0-64-28.654-64-64v-64l-96-88 224-96 224 96-96 88z"] };
var faShoppingBag = { prefix: 'fal', iconName: 'shopping-bag', icon: [448, 512, [], "f290", "M352 128C352 57.421 294.579 0 224 0 153.42 0 96 57.421 96 128H0v304c0 44.183 35.817 80 80 80h288c44.183 0 80-35.817 80-80V128h-96zM224 32c52.935 0 96 43.065 96 96H128c0-52.935 43.065-96 96-96zm192 400c0 26.467-21.533 48-48 48H80c-26.467 0-48-21.533-48-48V160h64v48c0 8.837 7.164 16 16 16s16-7.163 16-16v-48h192v48c0 8.837 7.163 16 16 16s16-7.163 16-16v-48h64v272z"] };
var faShoppingBasket = { prefix: 'fal', iconName: 'shopping-basket', icon: [576, 512, [], "f291", "M564 192h-76.875L347.893 37.297c-5.91-6.568-16.027-7.101-22.596-1.189s-7.101 16.028-1.189 22.596L444.075 192h-312.15L251.893 58.703c5.912-6.567 5.379-16.685-1.189-22.596-6.569-5.912-16.686-5.38-22.596 1.189L88.875 192H12c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h16.444L58.25 438.603C61.546 462.334 81.836 480 105.794 480h364.412c23.958 0 44.248-17.666 47.544-41.397L547.556 224H564c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12zm-77.946 242.201c-1.093 7.867-7.906 13.799-15.848 13.799H105.794c-7.942 0-14.755-5.932-15.848-13.799L60.752 224h454.497l-29.195 210.201zM304 280v112c0 8.837-7.163 16-16 16-8.836 0-16-7.163-16-16V280c0-8.837 7.164-16 16-16 8.837 0 16 7.163 16 16zm112 0v112c0 8.837-7.163 16-16 16s-16-7.163-16-16V280c0-8.837 7.163-16 16-16s16 7.163 16 16zm-224 0v112c0 8.837-7.164 16-16 16s-16-7.163-16-16V280c0-8.837 7.164-16 16-16s16 7.163 16 16z"] };
var faShoppingCart = { prefix: 'fal', iconName: 'shopping-cart', icon: [576, 512, [], "f07a", "M551.991 64H129.28l-8.329-44.423C118.822 8.226 108.911 0 97.362 0H12C5.373 0 0 5.373 0 12v8c0 6.627 5.373 12 12 12h78.72l69.927 372.946C150.305 416.314 144 431.42 144 448c0 35.346 28.654 64 64 64s64-28.654 64-64a63.681 63.681 0 0 0-8.583-32h145.167a63.681 63.681 0 0 0-8.583 32c0 35.346 28.654 64 64 64 35.346 0 64-28.654 64-64 0-17.993-7.435-34.24-19.388-45.868C506.022 391.891 496.76 384 485.328 384H189.28l-12-64h331.381c11.368 0 21.177-7.976 23.496-19.105l43.331-208C578.592 77.991 567.215 64 551.991 64zM240 448c0 17.645-14.355 32-32 32s-32-14.355-32-32 14.355-32 32-32 32 14.355 32 32zm224 32c-17.645 0-32-14.355-32-32s14.355-32 32-32 32 14.355 32 32-14.355 32-32 32zm38.156-192H171.28l-36-192h406.876l-40 192z"] };
var faShower = { prefix: 'fal', iconName: 'shower', icon: [512, 512, [], "f2cc", "M384 208c0 8.837-7.163 16-16 16s-16-7.163-16-16 7.163-16 16-16 16 7.163 16 16zm48-16c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm64 0c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm-160 32c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm64 0c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm64 0c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm-160 32c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm64 0c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm64 0c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm-96 32c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm64 0c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm-96 32c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm64 0c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm-32 32c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm-32 32c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zm77.175-290.825l5.65 5.65c4.686 4.686 4.686 12.284 0 16.971l-175.03 175.029c-4.686 4.686-12.284 4.686-16.971 0l-5.649-5.65c-4.686-4.686-4.686-12.284 0-16.971l8.455-8.455C174.168 238.991 160 208.939 160 176c0-32.627 13.781-62.056 36.73-82.95-17.686-18.152-42.47-29.35-69.824-29.044C74.131 64.597 32 108.342 32 161.121V480H0V161.436C0 90.399 58.124 31.372 129.159 32.005c37.496.334 71.19 16.873 94.421 42.935 43.644-20.944 98.18-11.724 132.17 26.69l8.455-8.455c4.686-4.686 12.284-4.686 16.97 0zM333.06 124.32c-29.764-35.464-84.294-38.226-117.63-4.89-.1.1-.2.2-.3.31-33.174 33.508-29.996 87.786 5.19 117.32l112.74-112.74z"] };
var faShuttlecock = { prefix: 'fal', iconName: 'shuttlecock', icon: [512, 512, [], "f45b", "M480 192h-61.6l10.4-72.6c3-20.8-14.5-39.1-36.2-36.2L320 93.6V32c0-17.7-14.3-32-32-32h-43.1c-12.2 0-23.5 7.1-28.8 18.1l-118 245.8-67 67c-41.4 41.4-41.4 108.6 0 150 20.7 20.7 47.8 31.1 75 31.1 27.1 0 54.3-10.4 75-31.1l67-67 245.8-118c11-5.3 18.1-16.6 18.1-28.8V224c0-17.7-14.3-32-32-32zm-82.9-77.1l-11.4 80.2L294 218l22.9-91.7 80.2-11.4zM244.9 32H288v70.3l-102.4 53.3L244.9 32zm35 110.6l-22.3 89.2-87.8 87.8-42.4-42.4 35.2-73.5 117.3-61.1zM32 406c0-18.6 7-36 19.5-49.6l104.2 104.2C142 473 124.6 480 106 480c-40.9 0-74-33.1-74-74zm146.5 32.2L73.8 333.5l32.2-32.2L210.7 406l-32.2 32.2zm56.3-53.5l-42.4-42.4 87.8-87.8 89.2-22.3-61.1 117.3-73.5 35.2zM480 267l-123.6 59.4L409.7 224H480v43z"] };
var faSignIn = { prefix: 'fal', iconName: 'sign-in', icon: [512, 512, [], "f090", "M184 83.5l164.5 164c4.7 4.7 4.7 12.3 0 17L184 428.5c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17l132-131.4H12c-6.6 0-12-5.4-12-12v-10c0-6.6 5.4-12 12-12h279.9L160 107.6c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.6-4.7 12.2-4.7 16.9 0zM512 400V112c0-26.5-21.5-48-48-48H332c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h132c8.8 0 16 7.2 16 16v288c0 8.8-7.2 16-16 16H332c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h132c26.5 0 48-21.5 48-48z"] };
var faSignInAlt = { prefix: 'fal', iconName: 'sign-in-alt', icon: [512, 512, [], "f2f6", "M32 217.1c0-8.8 7.2-16 16-16h144v-93.9c0-7.1 8.6-10.7 13.6-5.7l141.6 143.1c6.3 6.3 6.3 16.4 0 22.7L205.6 410.4c-5 5-13.6 1.5-13.6-5.7v-93.9H48c-8.8 0-16-7.2-16-16v-77.7m-32 0v77.7c0 26.5 21.5 48 48 48h112v61.9c0 35.5 43 53.5 68.2 28.3l141.7-143c18.8-18.8 18.8-49.2 0-68L228.2 78.9c-25.1-25.1-68.2-7.3-68.2 28.3v61.9H48c-26.5 0-48 21.6-48 48zM512 400V112c0-26.5-21.5-48-48-48H332c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h132c8.8 0 16 7.2 16 16v288c0 8.8-7.2 16-16 16H332c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h132c26.5 0 48-21.5 48-48z"] };
var faSignLanguage = { prefix: 'fal', iconName: 'sign-language', icon: [448, 512, [], "f2a7", "M447.971 255.391l-4.467-138.16c-1.57-48.503-65.102-66.816-91.36-24.961l-55.919-72.891C286.778 7.064 272.495.001 257.039 0c-15.93-.001-30.091 7.625-39.007 19.206-35.993-16.888-76.766 13.785-69.427 54.289-30.125 13.048-39.039 51.157-19.364 76.804l4.816 6.277c-25.733 14.752-33.109 49.561-14.534 73.773l8.418 10.973h-52.92c-32.727 0-55.982 31.248-47.933 62.349C11.542 311.644.374 327.898.01 347.221c-.371 19.654 10.668 36.491 26.55 44.946-8.624 32.448 16.301 62.869 48.328 62.869h7.246C77.853 485.01 100.941 512 131.143 512h95.892c11.305 0 22.617-1.333 33.62-3.96l71.85-17.159c24.568-5.867 42.026-28.037 42.026-53.589V342.06l52.546-41.529c13.648-10.787 21.459-27.662 20.894-45.14zm-334.334 207.07c-.091-4.771 1.736-9.31 5.145-12.782 3.457-3.524 8.026-5.465 12.865-5.465h55.619a8 8 0 0 0 8-8v-5.178a8 8 0 0 0-8-8H74.887c-23.423 0-24.037-35.786-.504-35.786h112.883a8 8 0 0 0 8-8v-5.179a8 8 0 0 0-8-8H50.014c-23.426 0-24.034-35.785-.504-35.785h137.756a8 8 0 0 0 8-8v-5.179a8 8 0 0 0-8-8H75.525c-23.429 0-24.033-35.786-.504-35.786h150.505c7.685 0 10.959-9.854 4.751-14.437l-27.755-20.486c-19.135-14.124 2.039-42.644 20.507-29.008l110.145 81.305c5.859 4.325 9.357 11.312 9.357 18.691V437.29c0 10.771-7.18 20.01-17.459 22.465l-71.85 17.159a112.86 112.86 0 0 1-26.187 3.085h-95.893c-9.47.001-17.323-7.866-17.505-17.538zm59.145-273.264l7.578 9.878c-11.571 15.417-10.662 36.638 1.045 50.996h-6.421l-30.072-39.2c-14.556-18.97 13.442-40.482 27.87-21.674zm174.094 82.761l-110.144-81.304c-11.634-8.586-26.841-10.128-39.76-4.64l-42.344-55.195c-14.408-18.782 12.669-41.491 27.252-22.479l69.353 90.401a7.995 7.995 0 0 0 5.36 3.069 7.983 7.983 0 0 0 5.948-1.662l4.025-3.182a8.001 8.001 0 0 0 1.387-11.146L183.63 75.904c-14.411-18.788 12.672-41.488 27.251-22.481l84.634 110.321a7.995 7.995 0 0 0 5.36 3.069 7.983 7.983 0 0 0 5.948-1.662l4.025-3.182a8.001 8.001 0 0 0 1.387-11.146l-68.651-89.487c-14.396-18.768 12.642-41.525 27.251-22.481l92.467 120.532a8.001 8.001 0 0 0 14.344-5.128l-1.126-34.813c-.784-24.211 34.249-24.39 35-1.182l4.468 138.16c.239 7.377-3.033 14.479-8.753 19l-41.574 32.858c-.341-14.339-7.308-27.851-18.785-36.324z"] };
var faSignOut = { prefix: 'fal', iconName: 'sign-out', icon: [512, 512, [], "f08b", "M48 64h132c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H48c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h132c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H48c-26.5 0-48-21.5-48-48V112c0-26.5 21.5-48 48-48zm279 19.5l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17l132 131.4H172c-6.6 0-12 5.4-12 12v10c0 6.6 5.4 12 12 12h279.9L320 404.4c-4.7 4.7-4.7 12.3 0 17l7.1 7.1c4.7 4.7 12.3 4.7 17 0l164.5-164c4.7-4.7 4.7-12.3 0-17L344 83.5c-4.7-4.7-12.3-4.7-17 0z"] };
var faSignOutAlt = { prefix: 'fal', iconName: 'sign-out-alt', icon: [512, 512, [], "f2f5", "M160 217.1c0-8.8 7.2-16 16-16h144v-93.9c0-7.1 8.6-10.7 13.6-5.7l141.6 143.1c6.3 6.3 6.3 16.4 0 22.7L333.6 410.4c-5 5-13.6 1.5-13.6-5.7v-93.9H176c-8.8 0-16-7.2-16-16v-77.7m-32 0v77.7c0 26.5 21.5 48 48 48h112v61.9c0 35.5 43 53.5 68.2 28.3l141.7-143c18.8-18.8 18.8-49.2 0-68L356.2 78.9c-25.1-25.1-68.2-7.3-68.2 28.3v61.9H176c-26.5 0-48 21.6-48 48zM0 112v288c0 26.5 21.5 48 48 48h132c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12H48c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16h132c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12H48C21.5 64 0 85.5 0 112z"] };
var faSignal = { prefix: 'fal', iconName: 'signal', icon: [544, 512, [], "f012", "M6 384h20c3.3 0 6 2.7 6 6v116c0 3.3-2.7 6-6 6H6c-3.3 0-6-2.7-6-6V390c0-3.3 2.7-6 6-6zm122-42v164c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6V342c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6zm128-80v244c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6V262c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6zm128-112v356c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6V150c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6zM512 6v500c0 3.3 2.7 6 6 6h20c3.3 0 6-2.7 6-6V6c0-3.3-2.7-6-6-6h-20c-3.3 0-6 2.7-6 6z"] };
var faSitemap = { prefix: 'fal', iconName: 'sitemap', icon: [640, 512, [], "f0e8", "M616 320h-72v-48c0-26.468-21.532-48-48-48H336v-32h56c13.255 0 24-10.745 24-24V24c0-13.255-10.745-24-24-24H248c-13.255 0-24 10.745-24 24v144c0 13.255 10.745 24 24 24h56v32H144c-26.467 0-48 21.532-48 48v48H24c-13.255 0-24 10.745-24 24v144c0 13.255 10.745 24 24 24h144c13.255 0 24-10.745 24-24V344c0-13.255-10.745-24-24-24h-40v-48c0-8.822 7.178-16 16-16h160v64h-56c-13.255 0-24 10.745-24 24v144c0 13.255 10.745 24 24 24h144c13.255 0 24-10.745 24-24V344c0-13.255-10.745-24-24-24h-56v-64h160c8.822 0 16 7.178 16 16v48h-40c-13.255 0-24 10.745-24 24v144c0 13.255 10.745 24 24 24h144c13.255 0 24-10.745 24-24V344c0-13.255-10.745-24-24-24zm-456 32v128H32V352h128zm224 0v128H256V352h128zM256 160V32h128v128H256zm352 320H480V352h128v128z"] };
var faSlidersH = { prefix: 'fal', iconName: 'sliders-h', icon: [576, 512, [], "f1de", "M564 100H160V60c0-13.2-10.8-24-24-24H88c-13.2 0-24 10.8-24 24v40H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h52v40c0 13.2 10.8 24 24 24h48c13.2 0 24-10.8 24-24v-40h404c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12zm-436 64H96V68h32v96zm436 80h-84v-40c0-13.2-10.8-24-24-24h-48c-13.2 0-24 10.8-24 24v40H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h372v40c0 13.2 10.8 24 24 24h48c13.2 0 24-10.8 24-24v-40h84c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12zm-116 64h-32v-96h32v96zm116 80H288v-40c0-13.2-10.8-24-24-24h-48c-13.2 0-24 10.8-24 24v40H12c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h180v40c0 13.2 10.8 24 24 24h48c13.2 0 24-10.8 24-24v-40h276c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12zm-308 64h-32v-96h32v96z"] };
var faSlidersHSquare = { prefix: 'fal', iconName: 'sliders-h-square', icon: [448, 512, [], "f3f0", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352zm-92-272H224v-40c0-13.2-10.8-24-24-24h-48c-13.2 0-24 10.8-24 24v40H92c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h36v40c0 13.2 10.8 24 24 24h48c13.2 0 24-10.8 24-24v-40h100c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12zm-132 64h-32v-96h32v96zm148 96h-20v-40c0-13.2-10.8-24-24-24h-48c-13.2 0-24 10.8-24 24v40H108c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h116v40c0 13.2 10.8 24 24 24h48c13.2 0 24-10.8 24-24v-40h20c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12zm-52 64h-32v-96h32v96z"] };
var faSlidersV = { prefix: 'fal', iconName: 'sliders-v', icon: [448, 512, [], "f3f1", "M136 96H96V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v84H24c-13.2 0-24 10.8-24 24v48c0 13.2 10.8 24 24 24h40v308c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V192h40c13.2 0 24-10.8 24-24v-48c0-13.2-10.8-24-24-24zm-8 64H32v-32h96v32zm152 160h-40V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v308h-40c-13.2 0-24 10.8-24 24v48c0 13.2 10.8 24 24 24h40v84c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-84h40c13.2 0 24-10.8 24-24v-48c0-13.2-10.8-24-24-24zm-8 64h-96v-32h96v32zm152-224h-40V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v148h-40c-13.2 0-24 10.8-24 24v48c0 13.2 10.8 24 24 24h40v244c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V256h40c13.2 0 24-10.8 24-24v-48c0-13.2-10.8-24-24-24zm-8 64h-96v-32h96v32z"] };
var faSlidersVSquare = { prefix: 'fal', iconName: 'sliders-v-square', icon: [448, 512, [], "f3f2", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352zM200 160h-40v-32c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v32H88c-13.2 0-24 10.8-24 24v48c0 13.2 10.8 24 24 24h40v116c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V256h40c13.2 0 24-10.8 24-24v-48c0-13.2-10.8-24-24-24zm-8 64H96v-32h96v32zm168 32h-40V128c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v128h-40c-13.2 0-24 10.8-24 24v48c0 13.2 10.8 24 24 24h40v20c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-20h40c13.2 0 24-10.8 24-24v-48c0-13.2-10.8-24-24-24zm-8 64h-96v-32h96v32z"] };
var faSmile = { prefix: 'fal', iconName: 'smile', icon: [512, 512, [], "f118", "M130.563 312.687c-11.491-17.773 15.372-35.165 26.873-17.373 53.453 82.678 143.744 82.63 197.164 0 11.523-17.82 38.352-.382 26.873 17.373-66.111 102.261-184.893 102.113-250.91 0zM320 144a47.789 47.789 0 0 0-22.603 5.647h.015c10.916 0 19.765 8.849 19.765 19.765s-8.849 19.765-19.765 19.765-19.765-8.849-19.765-19.765v-.015A47.789 47.789 0 0 0 272 192c0 26.51 21.49 48 48 48s48-21.49 48-48-21.49-48-48-48zm-128 0a47.789 47.789 0 0 0-22.603 5.647h.015c10.916 0 19.765 8.849 19.765 19.765s-8.849 19.765-19.765 19.765-19.765-8.849-19.765-19.765v-.015A47.789 47.789 0 0 0 144 192c0 26.51 21.49 48 48 48s48-21.49 48-48-21.49-48-48-48zm64-104C136.055 40 40 137.336 40 256c0 119.945 97.336 216 216 216 119.945 0 216-97.336 216-216 0-119.945-97.336-216-216-216m0-32c136.967 0 248 111.033 248 248S392.967 504 256 504 8 392.967 8 256 119.033 8 256 8z"] };
var faSnowflake = { prefix: 'fal', iconName: 'snowflake', icon: [450, 512, [], "f2dc", "M448.272 301.642a15.942 15.942 0 0 0 1.792-11.319c-1.835-8.644-10.331-14.163-18.974-12.328l-93.959 24.148L249.208 256l87.923-46.144 93.959 24.148c8.643 1.835 17.139-3.684 18.974-12.328 1.835-8.642-3.683-17.138-12.328-18.974l-67.037-12.227 70.356-40.62c7.653-4.418 10.275-14.203 5.856-21.856-4.418-7.652-14.203-10.275-21.856-5.856l-70.356 40.62 22.93-64.17c2.733-8.403-1.864-17.431-10.268-20.164-8.403-2.732-17.431 1.865-20.163 10.268l-26.067 93.445-79.923 46.144V136L309.1 66.703c5.911-6.567 5.379-16.685-1.189-22.596-6.566-5.91-16.684-5.38-22.596 1.189L241.208 97.24V16c0-8.837-7.163-16-16-16-8.836 0-16 7.163-16 16v81.24l-44.107-51.943c-5.911-6.568-16.027-7.102-22.596-1.189-6.568 5.911-7.101 16.028-1.189 22.596L209.208 136v92.287l-79.923-46.144-26.067-93.445c-2.732-8.403-11.76-13-20.163-10.268-8.401 2.732-13.001 11.759-10.268 20.163l22.93 64.17-70.356-40.62c-7.653-4.418-17.438-1.797-21.856 5.856-4.418 7.652-1.797 17.438 5.856 21.856l70.356 40.62-67.037 12.228C4.036 204.538-1.484 213.032.352 221.677c1.835 8.643 10.331 14.163 18.974 12.328l93.959-24.148L201.208 256l-87.923 46.144-93.959-24.148C10.683 276.16 2.187 281.68.352 290.323c-1.834 8.644 3.684 17.139 12.328 18.974l67.037 12.227-70.356 40.62C1.709 366.562-.912 376.348 3.506 384c4.418 7.653 14.203 10.275 21.856 5.856l70.356-40.62-22.93 64.17a15.957 15.957 0 0 0 1.362 12.952 15.94 15.94 0 0 0 8.906 7.211c8.403 2.733 17.431-1.865 20.163-10.268l26.067-93.445 79.923-46.144V376l-67.892 69.297c-5.912 6.567-5.379 16.685 1.189 22.596 6.568 5.91 16.685 5.379 22.596-1.189l44.107-51.943V496c0 8.837 7.164 16 16 16 8.837 0 16-7.163 16-16v-81.24l44.107 51.943A15.957 15.957 0 0 0 297.213 472a15.94 15.94 0 0 0 10.698-4.107c6.568-5.911 7.101-16.028 1.189-22.596L241.208 376v-92.287l79.923 46.144 26.067 93.445c2.732 8.403 11.76 13 20.163 10.268 8.402-2.733 13.001-11.76 10.268-20.164l-22.93-64.17 70.356 40.62c7.653 4.418 17.438 1.796 21.856-5.856 4.418-7.653 1.797-17.438-5.856-21.856l-70.356-40.62 67.037-12.227a15.96 15.96 0 0 0 10.536-7.655z"] };
var faSort = { prefix: 'fal', iconName: 'sort', icon: [320, 512, [], "f0dc", "M288 288H32c-28.4 0-42.8 34.5-22.6 54.6l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c20-20.1 5.7-54.6-22.7-54.6zM160 448L32 320h256L160 448zM32 224h256c28.4 0 42.8-34.5 22.6-54.6l-128-128c-12.5-12.5-32.8-12.5-45.3 0l-128 128C-10.7 189.5 3.6 224 32 224zM160 64l128 128H32L160 64z"] };
var faSortAlphaDown = { prefix: 'fal', iconName: 'sort-alpha-down', icon: [448, 512, [], "f15d", "M204.485 392l-84 84.485c-4.686 4.686-12.284 4.686-16.971 0l-84-84.485c-4.686-4.686-4.686-12.284 0-16.97l7.07-7.071c4.686-4.686 12.284-4.686 16.971 0L95 419.887V44c0-6.627 5.373-12 12-12h10c6.627 0 12 5.373 12 12v375.887l51.444-51.928c4.686-4.686 12.284-4.686 16.971 0l7.07 7.071c4.687 4.686 4.687 12.284 0 16.97zm100.492-220.355h61.547l15.5 44.317A12 12 0 0 0 393.351 224h11.552c8.31 0 14.105-8.243 11.291-16.062l-60.441-168A11.999 11.999 0 0 0 344.462 32h-16.924a11.999 11.999 0 0 0-11.291 7.938l-60.441 168c-2.813 7.82 2.981 16.062 11.291 16.062h11.271c5.12 0 9.676-3.248 11.344-8.088l15.265-44.267zm10.178-31.067l18.071-51.243c.853-2.56 1.776-5.626 2.668-8.743.871 3.134 1.781 6.219 2.644 8.806l17.821 51.18h-41.204zm-3.482 307.342c4.795-6.044-1.179 2.326 92.917-133.561a12.011 12.011 0 0 0 2.136-6.835V300c0-6.627-5.373-12-12-12h-113.84c-6.627 0-12 5.373-12 12v8.068c0 6.644 5.393 12.031 12.037 12.031 81.861.001 76.238.011 78.238-.026-2.973 3.818 4.564-7.109-92.776 133.303a12.022 12.022 0 0 0-2.142 6.847V468c0 6.627 5.373 12 12 12h119.514c6.627 0 12-5.373 12-12v-8.099c0-6.627-5.373-12-12-12-87.527-.001-81.97-.01-84.084.019z"] };
var faSortAlphaUp = { prefix: 'fal', iconName: 'sort-alpha-up', icon: [448, 512, [], "f15e", "M19.515 120l84-84.485c4.686-4.686 12.284-4.686 16.971 0l84 84.485c4.686 4.686 4.686 12.284 0 16.97l-7.07 7.071c-4.686 4.686-12.284 4.686-16.971 0L129 92.113V468c0 6.627-5.373 12-12 12h-10c-6.627 0-12-5.373-12-12V92.113l-51.444 51.928c-4.686 4.686-12.284 4.686-16.971 0l-7.07-7.071c-4.687-4.686-4.687-12.284 0-16.97zm285.462 51.645h61.547l15.5 44.317A12 12 0 0 0 393.351 224h11.552c8.31 0 14.105-8.243 11.291-16.062l-60.441-168A11.999 11.999 0 0 0 344.462 32h-16.924a11.999 11.999 0 0 0-11.291 7.938l-60.441 168c-2.813 7.82 2.981 16.062 11.291 16.062h11.271c5.12 0 9.676-3.248 11.344-8.088l15.265-44.267zm10.178-31.067l18.071-51.243c.853-2.56 1.776-5.626 2.668-8.743.871 3.134 1.781 6.219 2.644 8.806l17.821 51.18h-41.204zm-3.482 307.342c4.795-6.044-1.179 2.326 92.917-133.561a12.011 12.011 0 0 0 2.136-6.835V300c0-6.627-5.373-12-12-12h-113.84c-6.627 0-12 5.373-12 12v8.068c0 6.644 5.393 12.031 12.037 12.031 81.861.001 76.238.011 78.238-.026-2.973 3.818 4.564-7.109-92.776 133.303a12.022 12.022 0 0 0-2.142 6.847V468c0 6.627 5.373 12 12 12h119.514c6.627 0 12-5.373 12-12v-8.099c0-6.627-5.373-12-12-12-87.527-.001-81.97-.01-84.084.019z"] };
var faSortAmountDown = { prefix: 'fal', iconName: 'sort-amount-down', icon: [512, 512, [], "f160", "M204.485 392l-84 84.485c-4.686 4.686-12.284 4.686-16.971 0l-84-84.485c-4.686-4.686-4.686-12.284 0-16.97l7.07-7.071c4.686-4.686 12.284-4.686 16.971 0L95 419.887V44c0-6.627 5.373-12 12-12h10c6.627 0 12 5.373 12 12v375.887l51.444-51.928c4.686-4.686 12.284-4.686 16.971 0l7.07 7.071c4.687 4.686 4.687 12.284 0 16.97zM384 308v-8c0-6.627-5.373-12-12-12H268c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h104c6.627 0 12-5.373 12-12zm64-96v-8c0-6.627-5.373-12-12-12H268c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h168c6.627 0 12-5.373 12-12zm64-96v-8c0-6.627-5.373-12-12-12H268c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h232c6.627 0 12-5.373 12-12zM320 404v-8c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12z"] };
var faSortAmountUp = { prefix: 'fal', iconName: 'sort-amount-up', icon: [512, 512, [], "f161", "M19.515 120l84-84.485c4.686-4.686 12.284-4.686 16.971 0l84 84.485c4.686 4.686 4.686 12.284 0 16.97l-7.07 7.071c-4.686 4.686-12.284 4.686-16.971 0L129 92.113V468c0 6.627-5.373 12-12 12h-10c-6.627 0-12-5.373-12-12V92.113l-51.444 51.928c-4.686 4.686-12.284 4.686-16.971 0l-7.07-7.071c-4.687-4.686-4.687-12.284 0-16.97zM384 308v-8c0-6.627-5.373-12-12-12H268c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h104c6.627 0 12-5.373 12-12zm64-96v-8c0-6.627-5.373-12-12-12H268c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h168c6.627 0 12-5.373 12-12zm64-96v-8c0-6.627-5.373-12-12-12H268c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h232c6.627 0 12-5.373 12-12zM320 404v-8c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12z"] };
var faSortDown = { prefix: 'fal', iconName: 'sort-down', icon: [320, 512, [], "f0dd", "M287.968 288H32.038c-28.425 0-42.767 34.488-22.627 54.627l127.962 128c12.496 12.496 32.758 12.497 45.255 0l127.968-128C330.695 322.528 316.45 288 287.968 288zM160 448L32 320h256L160 448z"] };
var faSortNumericDown = { prefix: 'fal', iconName: 'sort-numeric-down', icon: [448, 512, [], "f162", "M204.485 392l-84 84.485c-4.686 4.686-12.284 4.686-16.971 0l-84-84.485c-4.686-4.686-4.686-12.284 0-16.97l7.07-7.071c4.686-4.686 12.284-4.686 16.971 0L95 419.887V44c0-6.627 5.373-12 12-12h10c6.627 0 12 5.373 12 12v375.887l51.444-51.928c4.686-4.686 12.284-4.686 16.971 0l7.07 7.071c4.687 4.686 4.687 12.284 0 16.97zM343.749 88.242c-.003.937-.002 98.995-.002 100.618H315.56c-6.627 0-12 5.373-12 12V212c0 6.627 5.373 12 12 12H412c6.627 0 12-5.373 12-12v-11.141c0-6.627-5.373-12-12-12h-27.669V44c0-6.627-5.373-12-12-12h-18.019a12 12 0 0 0-8.313 3.346L307.95 71.899c-4.76 4.573-4.933 12.133-.387 16.919l8.668 9.124c4.559 4.799 12.145 4.999 16.952.448 10.028-9.494 9.34-8.837 10.566-10.148zM432 374.935C432 431.624 399.805 483 341.806 483c-10.201 0-20.757-1.522-30.976-5.09-6.197-2.163-9.434-8.984-7.307-15.193l4.424-12.912c2.126-6.205 8.845-9.558 15.076-7.51 28.067 9.225 51.308-2.49 61.146-34.269-38.961 21.51-93.711-4.095-93.711-56.917 0-37.688 28.643-66.109 66.627-66.109C397.229 285 432 316.975 432 374.935zm-42.611-14.503c0-17.094-14.409-37.741-32.304-37.741-14.293 0-24.274 11.685-24.274 28.417 0 18.119 11.592 28.937 31.008 28.937 14.578.001 25.57-8.432 25.57-19.613z"] };
var faSortNumericUp = { prefix: 'fal', iconName: 'sort-numeric-up', icon: [448, 512, [], "f163", "M19.515 120l84-84.485c4.686-4.686 12.284-4.686 16.971 0l84 84.485c4.686 4.686 4.686 12.284 0 16.97l-7.07 7.071c-4.686 4.686-12.284 4.686-16.971 0L129 92.113V468c0 6.627-5.373 12-12 12h-10c-6.627 0-12-5.373-12-12V92.113l-51.444 51.928c-4.686 4.686-12.284 4.686-16.971 0l-7.07-7.071c-4.687-4.686-4.687-12.284 0-16.97zm324.234-31.758c-.003.937-.002 98.995-.002 100.618H315.56c-6.627 0-12 5.373-12 12V212c0 6.627 5.373 12 12 12H412c6.627 0 12-5.373 12-12v-11.141c0-6.627-5.373-12-12-12h-27.669V44c0-6.627-5.373-12-12-12h-18.019a12 12 0 0 0-8.313 3.346L307.95 71.899c-4.76 4.573-4.933 12.133-.387 16.919l8.668 9.124c4.559 4.799 12.145 4.999 16.952.448 10.028-9.494 9.34-8.837 10.566-10.148zM432 374.935C432 431.624 399.805 483 341.806 483c-10.201 0-20.757-1.522-30.976-5.09-6.197-2.163-9.434-8.984-7.307-15.193l4.424-12.912c2.126-6.205 8.845-9.558 15.076-7.51 28.067 9.225 51.308-2.49 61.146-34.269-38.961 21.51-93.711-4.095-93.711-56.917 0-37.688 28.643-66.109 66.627-66.109C397.229 285 432 316.975 432 374.935zm-42.611-14.503c0-17.094-14.409-37.741-32.304-37.741-14.293 0-24.274 11.685-24.274 28.417 0 18.119 11.592 28.937 31.008 28.937 14.578.001 25.57-8.432 25.57-19.613z"] };
var faSortUp = { prefix: 'fal', iconName: 'sort-up', icon: [320, 512, [], "f0de", "M32.032 224h255.93c28.425 0 42.767-34.488 22.627-54.627l-127.962-128c-12.496-12.496-32.758-12.497-45.255 0l-127.968 128C-10.695 189.472 3.55 224 32.032 224zM160 64l128 128H32L160 64z"] };
var faSpaceShuttle = { prefix: 'fal', iconName: 'space-shuttle', icon: [640, 512, [], "f197", "M448 168C208 168 240 32 96.003 32H80c-26.51 0-48 28.654-48 64v64c-23.197 0-32 10.032-32 24v144c0 13.983 8.819 24 32 24v64c0 35.346 21.49 64 48 64h16.003C240 480 208 344 448 344c106.039 0 192-39.399 192-88s-85.961-88-192-88zm-152 0H166.495c-11.973-5.241-25.014-8-38.495-8V67.183C187.971 80.409 219.668 148.917 296 168zM127.046 320H64v-48h48c17.673 0 32-7.163 32-16s-14.327-16-32-16H64v-48h64c35.629 0 64.458 29.114 63.994 64.85-.456 35.171-29.775 63.15-64.948 63.15zM64 96c0-19.851 10.359-32 16-32h16v96H64V96zm0 320v-64h32v96H80c-5.641 0-16-12.149-16-32zm64 28.817v-92.829c13.196-.126 26.009-2.869 37.816-7.989H296c-76.327 19.083-108.024 87.591-168 100.818zM448 312H205.781c24.716-33.856 23.823-79.277.215-112H448c41.469 0 88 0 128 24v64c-40 24-86.45 24-128 24zm40.014-16c-4.426 0-8.014-3.582-8.014-8v-64c0-4.418 3.588-8 8.014-8 31.998 0 31.965 80 0 80z"] };
var faSpade = { prefix: 'fal', iconName: 'spade', icon: [512, 512, [], "f2f4", "M471.4 200.3C456.1 186.4 327 57.7 278.6 9.3c-12.5-12.5-32.7-12.5-45.2 0-48.4 48.4-177.5 177-192.8 191C15.1 223.5 0 256.4 0 292c0 68.4 55.6 124 124 124 35.5 0 52-8 76-32 0 24-9.7 27.6-30.2 53.4-23.9 30.1-2.4 74.6 36 74.6h100.3c38.5 0 60-44.5 36-74.6-19-24.1-30.1-29.4-30.1-53.4 24 24 48.9 32 76 32 68.4 0 124-55.6 124-124 0-35.7-15.2-68.5-40.6-91.7zM385.5 384c-41-.4-54.6-11.3-87.2-45.2-3.7-3.9-10.3-1.2-10.3 4.2v25c0 40.6 0 52.6 29.1 89.3 7.3 9.2.7 22.7-11 22.7H205.8c-11.7 0-18.3-13.5-11-22.7C224 420.6 224 408.6 224 368v-25c0-5.4-6.6-8.1-10.3-4.2-32.3 33.7-45.9 44.7-87.1 45.2-51.8.5-95-41-94.5-92.8.2-26 11.4-50.1 30.1-67.2C81.3 206.5 256 32 256 32s174.7 174.5 193.9 192c19 17.3 29.9 41.6 30.1 67.3.4 51.8-42.7 93.2-94.5 92.7z"] };
var faSpinner = { prefix: 'fal', iconName: 'spinner', icon: [512, 512, [], "f110", "M288 32c0 17.673-14.327 32-32 32s-32-14.327-32-32 14.327-32 32-32 32 14.327 32 32zm-32 416c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm256-192c0-17.673-14.327-32-32-32s-32 14.327-32 32 14.327 32 32 32 32-14.327 32-32zm-448 0c0-17.673-14.327-32-32-32S0 238.327 0 256s14.327 32 32 32 32-14.327 32-32zm33.608 126.392c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm316.784 0c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zM97.608 65.608c-17.673 0-32 14.327-32 32 0 17.673 14.327 32 32 32s32-14.327 32-32c0-17.673-14.327-32-32-32z"] };
var faSpinnerThird = { prefix: 'fal', iconName: 'spinner-third', icon: [512, 512, [], "f3f4", "M460.115 373.846l-6.941-4.008c-5.546-3.202-7.564-10.177-4.661-15.886 32.971-64.838 31.167-142.731-5.415-205.954-36.504-63.356-103.118-103.876-175.8-107.701C260.952 39.963 256 34.676 256 28.321v-8.012c0-6.904 5.808-12.337 12.703-11.982 83.552 4.306 160.157 50.861 202.106 123.67 42.069 72.703 44.083 162.322 6.034 236.838-3.14 6.149-10.75 8.462-16.728 5.011z"] };
var faSquare = { prefix: 'fal', iconName: 'square', icon: [448, 512, [], "f0c8", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352z"] };
var faSquareFull = { prefix: 'fal', iconName: 'square-full', icon: [512, 512, [], "f45c", "M480 32v448H32V32h448m32-32H0v512h512V0z"] };
var faStar = { prefix: 'fal', iconName: 'star', icon: [576, 512, [], "f005", "M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM405.8 317.9l27.8 162L288 403.5 142.5 480l27.8-162L52.5 203.1l162.7-23.6L288 32l72.8 147.5 162.7 23.6-117.7 114.8z"] };
var faStarExclamation = { prefix: 'fal', iconName: 'star-exclamation', icon: [576, 512, [], "f2f3", "M260.2 158.3c-.2-3.4 2.5-6.3 6-6.3h43.6c3.4 0 6.2 2.9 6 6.3l-7.3 132c-.2 3.2-2.8 5.7-6 5.7h-28.9c-3.2 0-5.8-2.5-6-5.7l-7.4-132zM288 320c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm257.9-94L440.1 329l25 145.5c4.5 26.2-23.1 46-46.4 33.7L288 439.6l-130.7 68.7c-23.4 12.3-50.9-7.6-46.4-33.7l25-145.5L30.1 226c-19-18.5-8.5-50.8 17.7-54.6L194 150.2l65.3-132.4c11.8-23.8 45.7-23.7 57.4 0L382 150.2l146.1 21.2c26.2 3.8 36.7 36.1 17.8 54.6zm-22.4-22.9l-162.7-23.7L288 32l-72.8 147.4-162.7 23.7 117.7 114.8-27.8 162L288 403.4l145.5 76.5-27.8-162 117.8-114.8z"] };
var faStarHalf = { prefix: 'fal', iconName: 'star-half', icon: [576, 512, [], "f089", "M288 403.4l-145.5 76.5 27.8-162L52.5 203.1l162.7-23.6L288 32V0c-11.4 0-22.8 5.9-28.7 17.8L194 150.2 47.9 171.4c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.1 23 46 46.4 33.7L288 439.6v-36.2z"] };
var faStepBackward = { prefix: 'fal', iconName: 'step-backward', icon: [448, 512, [], "f048", "M76 479h8c6.6 0 12-5.4 12-12V276.7c1.1 1.2 2.2 2.4 3.5 3.4l232 191.4c20.6 17.2 52.5 2.8 52.5-24.6V63c0-27.4-31.9-41.8-52.5-24.6L99.5 231c-1.3 1.1-2.4 2.2-3.5 3.4V43c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v424c0 6.6 5.4 12 12 12zm40.5-223.4L351.8 63.2l.1-.1.1-.1v384l-.1-.1-.2-.1-235.2-191.2z"] };
var faStepForward = { prefix: 'fal', iconName: 'step-forward', icon: [448, 512, [], "f051", "M372 31h-8c-6.6 0-12 5.4-12 12v190.3c-1.1-1.2-2.2-2.4-3.5-3.4l-232-191.4C95.9 21.3 64 35.6 64 63v384c0 27.4 31.9 41.8 52.5 24.6l232-192.6c1.3-1.1 2.4-2.2 3.5-3.4V467c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V43c0-6.6-5.4-12-12-12zm-40.5 223.4L96.2 446.8l-.1.1-.1.1V63l.1.1.2.1 235.2 191.2z"] };
var faStethoscope = { prefix: 'fal', iconName: 'stethoscope', icon: [512, 512, [], "f0f1", "M430.069 96.493c-43.622 1.028-78.68 37.506-78.061 81.135.542 38.187 27.841 69.9 63.992 77.238V360.47C416 426.379 358.579 480 288 480c-70.58 0-128-53.621-128-119.529v-8.894c71.899-7.985 128-69.112 128-143.106V25.85a12.002 12.002 0 0 0-9.09-11.642L223.522.361c-6.43-1.607-12.945 2.302-14.552 8.731l-1.94 7.761c-1.607 6.43 2.302 12.945 8.731 14.552L256 41.465v165.773c0 61.803-49.543 112.875-111.345 113.23C82.599 320.825 32 270.446 32 208.471V41.465l40.239-10.059c6.43-1.607 10.339-8.122 8.731-14.552l-1.94-7.761C77.423 2.663 70.907-1.246 64.478.362L9.09 14.208A12.002 12.002 0 0 0 0 25.85v182.621c0 73.994 56.101 135.121 128 143.106v8.894C128 444.024 199.776 512 288 512c88.225 0 160-67.976 160-151.529V254.867c36.515-7.413 64-39.694 64-78.397 0-44.824-36.865-81.038-81.931-79.977zM432 224.471c-26.467 0-48-21.533-48-48s21.533-48 48-48 48 21.533 48 48-21.533 48-48 48zm23.529-48C455.529 189.466 444.995 200 432 200s-23.529-10.534-23.529-23.529 10.534-23.529 23.529-23.529 23.529 10.534 23.529 23.529z"] };
var faStickyNote = { prefix: 'fal', iconName: 'sticky-note', icon: [448, 512, [], "f249", "M448 348.106V80c0-26.51-21.49-48-48-48H48C21.49 32 0 53.49 0 80v351.988c0 26.51 21.49 48 48 48h268.118a48 48 0 0 0 33.941-14.059l83.882-83.882A48 48 0 0 0 448 348.106zm-120.569 95.196a15.89 15.89 0 0 1-7.431 4.195v-95.509h95.509a15.88 15.88 0 0 1-4.195 7.431l-83.883 83.883zM416 80v239.988H312c-13.255 0-24 10.745-24 24v104H48c-8.837 0-16-7.163-16-16V80c0-8.837 7.163-16 16-16h352c8.837 0 16 7.163 16 16z"] };
var faStop = { prefix: 'fal', iconName: 'stop', icon: [448, 512, [], "f04d", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352z"] };
var faStopCircle = { prefix: 'fal', iconName: 'stop-circle', icon: [512, 512, [], "f28d", "M256 504c137 0 248-111 248-248S393 8 256 8 8 119 8 256s111 248 248 248zM40 256c0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216zm296-96H176c-8.8 0-16 7.2-16 16v160c0 8.8 7.2 16 16 16h160c8.8 0 16-7.2 16-16V176c0-8.8-7.2-16-16-16zm-16 160H192V192h128v128z"] };
var faStopwatch = { prefix: 'fal', iconName: 'stopwatch', icon: [448, 512, [], "f2f2", "M393.3 141.3l17.5-17.5c4.7-4.7 4.7-12.3 0-17l-5.7-5.7c-4.7-4.7-12.3-4.7-17 0l-17.5 17.5c-35.8-31-81.5-50.9-131.7-54.2V32h25c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12h-80c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h23v32.6C91.2 73.3 0 170 0 288c0 123.7 100.3 224 224 224s224-100.3 224-224c0-56.1-20.6-107.4-54.7-146.7zM224 480c-106.1 0-192-85.9-192-192S117.9 96 224 96s192 85.9 192 192-85.9 192-192 192zm4-128h-8c-6.6 0-12-5.4-12-12V172c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v168c0 6.6-5.4 12-12 12z"] };
var faStreetView = { prefix: 'fal', iconName: 'street-view', icon: [512, 512, [], "f21d", "M326.746 140.274C337.582 125.647 344 107.56 344 88c0-48.523-39.477-88-88-88s-88 39.477-88 88c0 19.56 6.418 37.647 17.254 52.274C156.585 150.478 136 177.873 136 210v74.613c0 24.74 17.041 45.576 40 51.387v59c0 29.224 23.776 53 53 53h54c29.224 0 53-23.776 53-53v-59c22.959-5.812 40-26.647 40-51.387V210c0-32.127-20.585-59.522-49.254-69.726zM256 32c30.928 0 56 25.072 56 56s-25.072 56-56 56-56-25.072-56-56 25.072-56 56-56zm88 252.613c0 11.598-9.402 21-21 21h-19V395c0 11.598-9.402 21-21 21h-54c-11.598 0-21-9.402-21-21v-89.387h-19c-11.598 0-21-9.402-21-21V210c0-23.196 18.804-42 42-42h9.36c22.711 10.443 49.59 10.894 73.28 0H302c23.196 0 42 18.804 42 42v74.613zM512 416c0 77.107-178.646 96-256 96-77.244 0-256-18.865-256-96 0-39.552 47.005-63.785 103.232-78.01A101.027 101.027 0 0 0 128 365.147v.464C76.181 376.15 32 392.871 32 416c0 46.304 167.656 64 224 64 70.303 0 224-20.859 224-64 0-23.957-44.879-40.255-96-50.407v-.446a101.04 101.04 0 0 0 24.768-27.156C464.989 352.213 512 376.444 512 416z"] };
var faStrikethrough = { prefix: 'fal', iconName: 'strikethrough', icon: [512, 512, [], "f0cc", "M500 272H12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h488c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12zm-199.246 16c34.104 17.688 58.216 40.984 58.216 83.01 0 57.657-45.969 87.221-104.86 87.221-43.044 0-101.711-17.734-101.711-60.762V388c0-6.627-5.373-12-12-12h-10.72c-6.627 0-12 5.373-12 12v15.77c0 60.082 76.565 87.291 136.431 87.291 78.593 0 140.211-46.632 140.211-123.832 0-35.712-11.87-60.522-30.603-79.229h-62.964zm-137.387-64h74.348c-43.357-17.896-75.865-37.601-75.865-84.203 0-52.844 43.64-79.03 96.041-79.03 32.008 0 90.37 12.598 90.37 44.38V116c0 6.627 5.373 12 12 12h10.721c6.627 0 12-5.373 12-12V96.327c0-44.421-64.45-68.391-125.091-68.391-72.526 0-131.392 41.225-131.392 115.011 0 38.214 14.813 63.053 36.868 81.053z"] };
var faSubscript = { prefix: 'fal', iconName: 'subscript', icon: [512, 512, [], "f12c", "M276 288c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12h-50.835a12.002 12.002 0 0 1-10.241-5.745l-61.191-100.18c-5.153-7.443-9.734-16.604-9.734-16.604s-3.435 8.588-9.16 17.177L74.218 314.24A12.002 12.002 0 0 1 63.967 320H12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h36.098l73.861-117.439L54.397 64H12C5.373 64 0 58.627 0 52v-8c0-6.627 5.373-12 12-12h58.264a12 12 0 0 1 10.252 5.763l54.323 89.283c4.581 7.444 9.161 16.605 9.161 16.605s4.008-8.588 9.161-17.177l55.449-88.828A12 12 0 0 1 218.789 32H276c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12h-39.528l-68.136 106.561L243.342 288H276zm92.454 159.728c2.519-30.07 31.341-49.771 61.78-70.58 36.308-24.822 77.459-52.954 77.459-104.002 0-22.542-8.326-42.999-23.444-57.603C468.304 200.141 446.05 192 419.89 192c-35.475 0-65.345 18.9-82.559 44.759-3.655 5.491-2.163 12.91 3.31 16.592l7.467 5.024c5.341 3.594 12.522 2.299 16.371-2.862 12.982-17.407 32.006-29.673 53.845-29.673 31.312 0 53.181 20.097 53.181 48.872 0 32.67-30.043 53.42-61.851 75.388-37.092 25.617-79.132 54.652-79.132 108.281 0 4.257.225 7.85.551 10.925.645 6.09 5.806 10.694 11.931 10.694H500c6.627 0 12-5.373 12-12v-8.272c0-6.627-5.373-12-12-12H368.454z"] };
var faSubway = { prefix: 'fal', iconName: 'subway', icon: [448, 512, [], "f239", "M112 384c26.51 0 48-21.49 48-48s-21.49-48-48-48-48 21.49-48 48 21.49 48 48 48zm0-64c8.823 0 16 7.177 16 16s-7.177 16-16 16-16-7.177-16-16 7.177-16 16-16zm224 64c26.51 0 48-21.49 48-48s-21.49-48-48-48-48 21.49-48 48 21.49 48 48 48zm0-64c8.823 0 16 7.177 16 16s-7.177 16-16 16-16-7.177-16-16 7.177-16 16-16zM320 0H128C64 0 0 42.981 0 96v256c0 47.169 50.656 86.391 106.9 94.473l-55.285 55.285c-3.78 3.78-1.103 10.243 4.243 10.243h25.798c3.182 0 6.235-1.264 8.485-3.515L150.627 448h146.745l60.486 60.485a12.002 12.002 0 0 0 8.485 3.515h25.798c5.345 0 8.022-6.463 4.243-10.243L341.1 446.472C397.344 438.391 448 399.169 448 352V96c0-53.019-63-96-128-96zM32 128h176v96H32v-96zm384 224c0 32.299-47.552 64-96 64H128c-48.448 0-96-31.701-96-64v-96h384v96zm0-128H240v-96h176v96zM32 96c0-32.299 47.552-64 96-64h192c58.237 0 96 37.881 96 64H32z"] };
var faSuitcase = { prefix: 'fal', iconName: 'suitcase', icon: [512, 512, [], "f0f2", "M464 96H352V56c0-13.255-10.745-24-24-24H184c-13.255 0-24 10.745-24 24v40H48c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V144c0-26.51-21.49-48-48-48zM192 64h128v32H192V64zm192 64v320H128V128h256zM32 432V144c0-8.822 7.178-16 16-16h48v320H48c-8.822 0-16-7.178-16-16zm448 0c0 8.822-7.178 16-16 16h-48V128h48c8.822 0 16 7.178 16 16v288z"] };
var faSun = { prefix: 'fal', iconName: 'sun', icon: [512, 512, [], "f185", "M489.332 299.468l-42.159-35.682c-4.812-4.072-4.822-11.492-.001-15.572l42.161-35.682c22.676-19.192 10.625-56.315-19.014-58.516l-55.081-4.086c-6.287-.467-10.655-6.464-9.153-12.598l13.136-53.649c7.053-28.808-24.452-51.837-49.776-36.164L322.48 76.59c-5.357 3.318-12.419 1.032-14.809-4.812l-20.908-51.151c-11.245-27.503-50.28-27.503-61.525-.001l-20.909 51.153c-2.383 5.829-9.436 8.137-14.809 4.811l-46.964-29.07c-25.263-15.633-56.844 7.297-49.776 36.164l13.136 53.649c1.499 6.123-2.856 12.13-9.153 12.598l-55.082 4.086c-29.627 2.2-41.698 39.317-19.012 58.516l42.159 35.682c4.812 4.071 4.822 11.492.001 15.572l-42.161 35.682c-22.676 19.192-10.625 56.315 19.014 58.516l55.081 4.086c6.287.467 10.655 6.464 9.153 12.598L92.78 428.318c-7.053 28.808 24.452 51.837 49.776 36.164l46.965-29.071c5.358-3.316 12.419-1.033 14.809 4.812l20.908 51.151c11.245 27.503 50.28 27.503 61.525.001l20.909-51.153c2.384-5.832 9.437-8.135 14.809-4.811l46.964 29.07c25.264 15.633 56.844-7.298 49.776-36.164l-13.136-53.649c-1.499-6.123 2.856-12.13 9.153-12.598l55.082-4.086c29.627-2.201 41.698-39.317 19.012-58.516zm-21.084 30.592l-55.082 4.086c-23.569 1.749-39.889 24.261-34.278 47.18l13.136 53.649c1.121 4.578-3.84 8.173-7.843 5.697l-46.963-29.069c-20.096-12.439-46.531-3.822-55.463 18.02l-20.908 51.124c-1.781 4.354-7.91 4.361-9.693-.001l-20.908-51.122c-8.914-21.799-35.33-30.483-55.462-18.021l-46.964 29.07c-4 2.476-8.964-1.121-7.843-5.697l13.136-53.649c5.62-22.956-10.749-45.434-34.278-47.18l-55.082-4.086c-4.691-.347-6.593-6.174-2.996-9.219l42.16-35.682c18.042-15.27 18.011-43.074 0-58.318L40.758 191.16c-3.592-3.039-1.705-8.871 2.995-9.219l55.082-4.086c23.569-1.749 39.889-24.261 34.278-47.18l-13.136-53.649c-1.119-4.569 3.836-8.177 7.843-5.697l46.963 29.069c20.096 12.439 46.531 3.822 55.463-18.02l20.908-51.124c1.781-4.353 7.909-4.361 9.693 0l20.908 51.123c8.945 21.875 35.398 30.439 55.462 18.021l46.964-29.07c3.998-2.478 8.964 1.121 7.843 5.697l-13.136 53.649c-5.62 22.956 10.749 45.434 34.278 47.18l55.082 4.086c4.691.347 6.593 6.174 2.996 9.219l-42.16 35.682c-18.042 15.27-18.011 43.074 0 58.318l42.159 35.682c3.592 3.039 1.705 8.871-2.995 9.219zM256 128c-70.579 0-128 57.421-128 128s57.421 128 128 128 128-57.421 128-128-57.421-128-128-128zm0 224c-52.935 0-96-43.065-96-96s43.065-96 96-96 96 43.065 96 96-43.065 96-96 96z"] };
var faSuperscript = { prefix: 'fal', iconName: 'superscript', icon: [512, 512, [], "f12b", "M276 448c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12h-50.835a12.002 12.002 0 0 1-10.241-5.745l-61.191-100.18c-5.153-7.443-9.734-16.604-9.734-16.604s-3.435 8.588-9.16 17.177L74.218 474.24A12.002 12.002 0 0 1 63.967 480H12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h36.098l73.861-117.439L54.397 224H12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h58.264a12 12 0 0 1 10.252 5.763l54.323 89.283c4.581 7.444 9.161 16.605 9.161 16.605s4.008-8.588 9.161-17.177l55.449-88.828A12 12 0 0 1 218.789 192H276c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12h-39.528l-68.136 106.561L243.342 448H276zm92.454-160.272c2.519-30.07 31.341-49.771 61.78-70.58 36.308-24.822 77.459-52.955 77.459-104.002 0-22.542-8.326-42.999-23.444-57.603C468.304 40.141 446.05 32 419.89 32c-35.475 0-65.345 18.9-82.559 44.759-3.655 5.491-2.163 12.91 3.31 16.592l7.467 5.024c5.341 3.594 12.522 2.299 16.371-2.862 12.982-17.407 32.006-29.673 53.845-29.673 31.312 0 53.181 20.097 53.181 48.872 0 32.67-30.043 53.42-61.851 75.388-37.092 25.617-79.132 54.652-79.132 108.281 0 4.257.225 7.85.551 10.925.645 6.09 5.806 10.694 11.931 10.694H500c6.627 0 12-5.373 12-12v-8.272c0-6.627-5.373-12-12-12H368.454z"] };
var faSync = { prefix: 'fal', iconName: 'sync', icon: [512, 512, [], "f021", "M492 8h-10c-6.627 0-12 5.373-12 12v110.627C426.929 57.261 347.224 8 256 8 123.228 8 14.824 112.338 8.31 243.493 7.971 250.311 13.475 256 20.301 256h10.016c6.353 0 11.646-4.949 11.977-11.293C48.157 132.216 141.097 42 256 42c82.862 0 154.737 47.077 190.289 116H332c-6.627 0-12 5.373-12 12v10c0 6.627 5.373 12 12 12h160c6.627 0 12-5.373 12-12V20c0-6.627-5.373-12-12-12zm-.301 248h-10.015c-6.352 0-11.647 4.949-11.977 11.293C463.841 380.158 370.546 470 256 470c-82.608 0-154.672-46.952-190.299-116H180c6.627 0 12-5.373 12-12v-10c0-6.627-5.373-12-12-12H20c-6.627 0-12 5.373-12 12v160c0 6.627 5.373 12 12 12h10c6.627 0 12-5.373 12-12V381.373C85.071 454.739 164.777 504 256 504c132.773 0 241.176-104.338 247.69-235.493.339-6.818-5.165-12.507-11.991-12.507z"] };
var faSyncAlt = { prefix: 'fal', iconName: 'sync-alt', icon: [512, 512, [], "f2f1", "M457.373 9.387l-50.095 50.102C365.411 27.211 312.953 8 256 8 123.228 8 14.824 112.338 8.31 243.493 7.971 250.311 13.475 256 20.301 256h10.015c6.352 0 11.647-4.949 11.977-11.293C48.159 131.913 141.389 42 256 42c47.554 0 91.487 15.512 127.02 41.75l-53.615 53.622c-20.1 20.1-5.855 54.628 22.627 54.628H480c17.673 0 32-14.327 32-32V32.015c0-28.475-34.564-42.691-54.627-22.628zM480 160H352L480 32v128zm11.699 96h-10.014c-6.353 0-11.647 4.949-11.977 11.293C463.84 380.203 370.504 470 256 470c-47.525 0-91.468-15.509-127.016-41.757l53.612-53.616c20.099-20.1 5.855-54.627-22.627-54.627H32c-17.673 0-32 14.327-32 32v127.978c0 28.614 34.615 42.641 54.627 22.627l50.092-50.096C146.587 484.788 199.046 504 256 504c132.773 0 241.176-104.338 247.69-235.493.339-6.818-5.165-12.507-11.991-12.507zM32 480V352h128L32 480z"] };
var faTable = { prefix: 'fal', iconName: 'table', icon: [512, 512, [], "f0ce", "M464 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zM160 448H48c-8.837 0-16-7.163-16-16v-80h128v96zm0-128H32v-96h128v96zm0-128H32V96h128v96zm160 256H192v-96h128v96zm0-128H192v-96h128v96zm0-128H192V96h128v96zm160 160v80c0 8.837-7.163 16-16 16H352v-96h128zm0-32H352v-96h128v96zm0-128H352V96h128v96z"] };
var faTableTennis = { prefix: 'fal', iconName: 'table-tennis', icon: [512, 512, [], "f45d", "M482.8 325.2c47.1-83.1 36.2-190.6-34.5-261.4C407.2 22.7 352.6 0 294.5 0c-105.8 0-153 63.1-219.3 129.5-49.2 49.3-49.2 129.6 0 179l20.2 20.3-83.6 72.6c-15.1 13.2-15.7 36.3-1.8 50.3l50.1 50.1c17.5 17.6 40.7 9.4 50.3-1.8l72.4-83.6c15.9 15.9 58.9 70.6 132.5 56.1 20.6 24 50.7 39.5 84.7 39.5 61.8 0 112-50.2 112-112 0-28.8-11.3-54.9-29.2-74.8zM163.4 86.5c72.5-72.7 189.8-72.7 262.3 0 58.9 59 69 147.8 32 218-56.7-34.4-124.3-12.3-154.5 40.1l-199-199 59.2-59.1zm17.8 282.9L82.8 479.3l-50.1-50.2 109.6-98.6-44.5-44.6c-31.2-31.3-35.6-79-13.9-115.4L290.4 377c-2 9.6-6.3 34.1 5.7 64.2-51.7 1.5-70.5-27.3-114.9-71.8zM400 480c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"] };
var faTablet = { prefix: 'fal', iconName: 'tablet', icon: [448, 512, [], "f10a", "M256 416c0 17.7-14.3 32-32 32s-32-14.3-32-32c0-21.3 14.3-32 32-32s32 14.3 32 32zM448 48v416c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V48C0 21.5 21.5 0 48 0h352c26.5 0 48 21.5 48 48zm-32 0c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v416c0 8.8 7.2 16 16 16h352c8.8 0 16-7.2 16-16V48z"] };
var faTabletAlt = { prefix: 'fal', iconName: 'tablet-alt', icon: [448, 512, [], "f3fa", "M352 96v256H96V96h256m20-32H76c-6.6 0-12 5.4-12 12v296c0 6.6 5.4 12 12 12h296c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12zm28-64H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zm16 464c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v416zm-192-64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z"] };
var faTabletAndroid = { prefix: 'fal', iconName: 'tablet-android', icon: [448, 512, [], "f3fb", "M400 0H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zm16 464c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v416zm-140-16H172c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h104c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12z"] };
var faTabletAndroidAlt = { prefix: 'fal', iconName: 'tablet-android-alt', icon: [448, 512, [], "f3fc", "M352 96v256H96V96h256m48-96H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM48 480c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v416c0 8.8-7.2 16-16 16H48zM372 64H76c-6.6 0-12 5.4-12 12v296c0 6.6 5.4 12 12 12h296c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12zm-96 352H172c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h104c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12z"] };
var faTachometer = { prefix: 'fal', iconName: 'tachometer', icon: [576, 512, [], "f0e4", "M365.42 136.945c-8.319-2.99-17.482 1.322-20.475 9.635l-51.013 141.704C256.145 284.81 224 314.519 224 352c0 35.346 28.654 64 64 64s64-28.654 64-64c0-21.976-11.081-41.36-27.956-52.884l51.011-141.696c2.992-8.315-1.322-17.482-9.635-20.475zM288 384c-17.645 0-32-14.355-32-32s14.355-32 32-32 32 14.355 32 32-14.355 32-32 32zm0-352C128.942 32 0 160.942 0 320c0 48.556 12.023 94.3 33.246 134.429A48.018 48.018 0 0 0 75.693 480h424.613a48.02 48.02 0 0 0 42.448-25.571C563.977 414.3 576 368.556 576 320c0-159.058-128.942-288-288-288zm226.466 407.469a15.983 15.983 0 0 1-14.16 8.531H75.693a15.983 15.983 0 0 1-14.16-8.531C42.68 403.819 32 363.175 32 320 32 178.677 146.473 64 288 64c141.323 0 256 114.472 256 256 0 40.599-9.481 81.553-29.534 119.469z"] };
var faTachometerAlt = { prefix: 'fal', iconName: 'tachometer-alt', icon: [576, 512, [], "f3fd", "M312 96c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24zm224 224c0-13.255-10.745-24-24-24s-24 10.745-24 24 10.745 24 24 24 24-10.745 24-24zm-448 0c0-13.255-10.745-24-24-24s-24 10.745-24 24 10.745 24 24 24 24-10.745 24-24zm41.608-182.392c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm316.784 0c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm-71.337 19.812l-51.011 141.696C340.919 310.64 352 330.024 352 352c0 35.346-28.654 64-64 64s-64-28.654-64-64c0-37.481 32.145-67.19 69.932-63.716l51.013-141.704c2.992-8.312 12.155-12.625 20.475-9.635 8.313 2.993 12.627 12.16 9.635 20.475zM320 352c0-17.645-14.355-32-32-32s-32 14.355-32 32 14.355 32 32 32 32-14.355 32-32zm256-32c0 48.556-12.023 94.3-33.246 134.429A48.018 48.018 0 0 1 500.307 480H75.693a48.02 48.02 0 0 1-42.448-25.571C12.023 414.3 0 368.556 0 320 0 160.942 128.942 32 288 32s288 128.942 288 288zm-32 0c0-141.528-114.677-256-256-256C146.473 64 32 178.677 32 320c0 43.175 10.68 83.819 29.533 119.469A15.983 15.983 0 0 0 75.693 448h424.613a15.983 15.983 0 0 0 14.16-8.531C534.519 401.553 544 360.599 544 320z"] };
var faTag = { prefix: 'fal', iconName: 'tag', icon: [512, 512, [], "f02b", "M497.941 225.941L286.059 14.059A48 48 0 0 0 252.118 0H48C21.49 0 0 21.49 0 48v204.118a48 48 0 0 0 14.059 33.941l211.882 211.882c18.745 18.745 49.137 18.746 67.882 0l204.118-204.118c18.745-18.745 18.745-49.137 0-67.882zm-22.627 45.255L271.196 475.314c-6.243 6.243-16.375 6.253-22.627 0L36.686 263.431A15.895 15.895 0 0 1 32 252.117V48c0-8.822 7.178-16 16-16h204.118c4.274 0 8.292 1.664 11.314 4.686l211.882 211.882c6.238 6.239 6.238 16.39 0 22.628zM144 124c11.028 0 20 8.972 20 20s-8.972 20-20 20-20-8.972-20-20 8.972-20 20-20m0-28c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48z"] };
var faTags = { prefix: 'fal', iconName: 'tags', icon: [640, 512, [], "f02c", "M625.941 293.823L421.823 497.941c-18.746 18.746-49.138 18.745-67.882 0l-1.775-1.775 22.627-22.627 1.775 1.775c6.253 6.253 16.384 6.243 22.627 0l204.118-204.118c6.238-6.239 6.238-16.389 0-22.627L391.431 36.686A15.895 15.895 0 0 0 380.117 32h-19.549l-32-32h51.549a48 48 0 0 1 33.941 14.059L625.94 225.941c18.746 18.745 18.746 49.137.001 67.882zM252.118 32H48c-8.822 0-16 7.178-16 16v204.118c0 4.274 1.664 8.292 4.686 11.314l211.882 211.882c6.253 6.253 16.384 6.243 22.627 0l204.118-204.118c6.238-6.239 6.238-16.389 0-22.627L263.431 36.686A15.895 15.895 0 0 0 252.118 32m0-32a48 48 0 0 1 33.941 14.059l211.882 211.882c18.745 18.745 18.745 49.137 0 67.882L293.823 497.941c-18.746 18.746-49.138 18.745-67.882 0L14.059 286.059A48 48 0 0 1 0 252.118V48C0 21.49 21.49 0 48 0h204.118zM144 124c-11.028 0-20 8.972-20 20s8.972 20 20 20 20-8.972 20-20-8.972-20-20-20m0-28c26.51 0 48 21.49 48 48s-21.49 48-48 48-48-21.49-48-48 21.49-48 48-48z"] };
var faTasks = { prefix: 'fal', iconName: 'tasks', icon: [512, 512, [], "f0ae", "M506 114H198c-3.3 0-6-2.7-6-6V84c0-3.3 2.7-6 6-6h308c3.3 0 6 2.7 6 6v24c0 3.3-2.7 6-6 6zm6 154v-24c0-3.3-2.7-6-6-6H198c-3.3 0-6 2.7-6 6v24c0 3.3 2.7 6 6 6h308c3.3 0 6-2.7 6-6zm0 160v-24c0-3.3-2.7-6-6-6H198c-3.3 0-6 2.7-6 6v24c0 3.3 2.7 6 6 6h308c3.3 0 6-2.7 6-6zM68.4 376c-19.9 0-36 16.1-36 36s16.1 36 36 36 35.6-16.1 35.6-36-15.7-36-35.6-36zM170.9 42.9l-7.4-7.4c-4.7-4.7-12.3-4.7-17 0l-78.8 79.2-38.4-38.4c-4.7-4.7-12.3-4.7-17 0l-8.9 8.9c-4.7 4.7-4.7 12.3 0 17l54.3 54.3c4.7 4.7 12.3 4.7 17 0l.2-.2L170.8 60c4.8-4.8 4.8-12.4.1-17.1zm.4 160l-7.4-7.4c-4.7-4.7-12.3-4.7-17 0l-78.8 79.2-38.4-38.4c-4.7-4.7-12.3-4.7-17 0L4 245.2c-4.7 4.7-4.7 12.3 0 17l54.3 54.3c4.7 4.7 12.3 4.7 17 0l-.2-.2 96.3-96.3c4.6-4.8 4.6-12.4-.1-17.1z"] };
var faTaxi = { prefix: 'fal', iconName: 'taxi', icon: [512, 512, [], "f1ba", "M496 304c0-30.753-14.462-58.125-36.954-75.695l-19.442-77.768A71.896 71.896 0 0 0 369.754 96H352V56c0-13.255-10.745-24-24-24H184c-13.255 0-24 10.745-24 24v40h-17.754a71.898 71.898 0 0 0-69.851 54.537l-19.442 77.768C30.462 245.875 16 273.247 16 304v56c0 15.254 6.107 29.077 16 39.176V440c0 22.091 17.909 40 40 40h48c22.091 0 40-17.909 40-40v-24h192v24c0 22.091 17.909 40 40 40h48c22.091 0 40-17.909 40-40v-40.823c9.893-10.1 16-23.922 16-39.176V304zM192 64h128v32H192V64zm-88.56 94.299A39.942 39.942 0 0 1 142.246 128h227.508a39.942 39.942 0 0 1 38.806 30.299l13.035 52.141A96.278 96.278 0 0 0 400 208H112c-7.425 0-14.654.844-21.595 2.44l13.035-52.141zM48 304c0-35.29 28.71-64 64-64h288c35.29 0 64 28.71 64 64v56c0 13.234-10.766 24-24 24H72c-13.234 0-24-10.766-24-24v-56zm80 136c0 4.411-3.589 8-8 8H72c-4.411 0-8-3.589-8-8v-24.578c5.681.813 3.456.578 64 .578v24zm312 8h-48c-4.411 0-8-3.589-8-8v-24c60.441 0 58.314.236 64-.578V440c0 4.411-3.589 8-8 8zM176 340v-8c0-6.627 5.373-12 12-12h136c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H188c-6.627 0-12-5.373-12-12zm-96-20c0-17.673 14.327-32 32-32s32 14.327 32 32-14.327 32-32 32-32-14.327-32-32zm288 0c0-17.673 14.327-32 32-32s32 14.327 32 32-14.327 32-32 32-32-14.327-32-32z"] };
var faTennisBall = { prefix: 'fal', iconName: 'tennis-ball', icon: [496, 512, [], "f45e", "M248 8C111.2 8 0 119.2 0 256s111.2 248 248 248 248-111.2 248-248S384.8 8 248 8zm-12.5 32.6c-5.5 9.7-9.3 20.5-9.3 32.4 0 41.3-18.5 87.6-46 115.1s-73.8 46-115 46c-12 0-22.8 3.8-32.5 9.4 6.2-109.1 93.7-196.6 202.8-202.9zm-201 246.6c4.9-12.6 16.6-21.1 30.6-21.1 50 0 104-21.8 137.6-55.4 33.6-33.6 55.4-87.7 55.4-137.7 0-14 8.4-25.7 21-30.5 94.1 13.7 168.6 88.2 182.3 182.3-4.9 12.5-16.6 20.9-30.6 21-50 0-104 21.8-137.6 55.4-33.6 33.6-55.4 87.7-55.4 137.7 0 14-8.5 25.8-21.1 30.6-94-13.7-168.5-88.2-182.2-182.3zm226 184.2c5.6-9.7 9.3-20.5 9.4-32.5 0-41.3 18.5-87.6 46-115.1s73.8-46 115-46c11.9 0 22.8-3.8 32.4-9.3-6.2 109.1-93.7 196.6-202.8 202.9z"] };
var faTerminal = { prefix: 'fal', iconName: 'terminal', icon: [640, 512, [], "f120", "M34.495 36.465l211.051 211.05c4.686 4.686 4.686 12.284 0 16.971L34.495 475.535c-4.686 4.686-12.284 4.686-16.97 0l-7.071-7.07c-4.686-4.686-4.686-12.284 0-16.971L205.947 256 10.454 60.506c-4.686-4.686-4.686-12.284 0-16.971l7.071-7.07c4.686-4.687 12.284-4.687 16.97 0zM640 468v-10c0-6.627-5.373-12-12-12H300c-6.627 0-12 5.373-12 12v10c0 6.627 5.373 12 12 12h328c6.627 0 12-5.373 12-12z"] };
var faTextHeight = { prefix: 'fal', iconName: 'text-height', icon: [448, 512, [], "f034", "M0 116V44c0-6.627 5.373-12 12-12h264c6.627 0 12 5.373 12 12v72c0 6.627-5.373 12-12 12h-8.48c-6.627 0-12-5.373-12-12V64h-94.965v384H204c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H84c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h43.444V64H32.48v52c0 6.627-5.373 12-12 12H12c-6.627 0-12-5.373-12-12zm393.87-81.123l-39.984 48.001C349.914 87.648 352.49 96 360.03 96H384v320h-23.998c-6.841 0-10.434 7.971-6.143 13.122l39.985 48.001c3.193 3.833 9.089 3.838 12.287 0l39.984-48.001c3.973-4.77 1.396-13.122-6.143-13.122H416V96h23.998c6.841 0 10.434-7.971 6.143-13.122l-39.985-48.001c-3.192-3.834-9.088-3.838-12.286 0z"] };
var faTextWidth = { prefix: 'fal', iconName: 'text-width', icon: [448, 512, [], "f035", "M0 116V44c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v72c0 6.627-5.373 12-12 12h-8.48c-6.627 0-12-5.373-12-12V64H240.556v256H284c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H164c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h43.444V64H32.48v52c0 6.627-5.373 12-12 12H12c-6.627 0-12-5.373-12-12zm445.123 309.87l-48.001-39.984c-4.77-3.973-13.122-1.396-13.122 6.143V416H64v-23.998c0-6.841-7.971-10.434-13.122-6.143L2.877 425.843c-3.833 3.193-3.838 9.089 0 12.287l48.001 39.984C55.648 482.087 64 479.51 64 471.971V448h320v23.998c0 6.841 7.971 10.434 13.122 6.143l48.001-39.985c3.834-3.192 3.838-9.088 0-12.286z"] };
var faTh = { prefix: 'fal', iconName: 'th', icon: [512, 512, [], "f00a", "M0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48H48C21.49 32 0 53.49 0 80zm320-16v106.667H192V64h128zm160 245.333H352V202.667h128v106.666zm-160 0H192V202.667h128v106.666zM32 202.667h128v106.667H32V202.667zM160 64v106.667H32V80c0-8.837 7.163-16 16-16h112zM32 432v-90.667h128V448H48c-8.837 0-16-7.163-16-16zm160 16V341.333h128V448H192zm160 0V341.333h128V432c0 8.837-7.163 16-16 16H352zm128-277.333H352V64h112c8.837 0 16 7.163 16 16v90.667z"] };
var faThLarge = { prefix: 'fal', iconName: 'th-large', icon: [512, 512, [], "f009", "M0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48H48C21.49 32 0 53.49 0 80zm240-16v176H32V80c0-8.837 7.163-16 16-16h192zM32 432V272h208v176H48c-8.837 0-16-7.163-16-16zm240 16V272h208v160c0 8.837-7.163 16-16 16H272zm208-208H272V64h192c8.837 0 16 7.163 16 16v160z"] };
var faThList = { prefix: 'fal', iconName: 'th-list', icon: [512, 512, [], "f00b", "M0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48H48C21.49 32 0 53.49 0 80zm480 0v90.667H192V64h272c8.837 0 16 7.163 16 16zm0 229.333H192V202.667h288v106.666zM32 202.667h128v106.667H32V202.667zM160 64v106.667H32V80c0-8.837 7.163-16 16-16h112zM32 432v-90.667h128V448H48c-8.837 0-16-7.163-16-16zm160 16V341.333h288V432c0 8.837-7.163 16-16 16H192z"] };
var faThermometerEmpty = { prefix: 'fal', iconName: 'thermometer-empty', icon: [256, 512, [], "f2cb", "M176 384c0 26.51-21.49 48-48 48s-48-21.49-48-48 21.49-48 48-48 48 21.49 48 48zm48-84.653c19.912 22.564 32 52.195 32 84.653 0 70.696-57.302 128-128 128-.299 0-.61-.001-.909-.003C56.789 511.509-.357 453.636.002 383.333.166 351.135 12.225 321.756 32 299.347V96c0-53.019 42.981-96 96-96s96 42.981 96 96v203.347zM224 384c0-39.894-22.814-62.144-32-72.553V96c0-35.29-28.71-64-64-64S64 60.71 64 96v215.447c-9.467 10.728-31.797 32.582-31.999 72.049-.269 52.706 42.619 96.135 95.312 96.501L128 480c52.935 0 96-43.065 96-96z"] };
var faThermometerFull = { prefix: 'fal', iconName: 'thermometer-full', icon: [256, 512, [], "f2c7", "M224 96c0-53.019-42.981-96-96-96S32 42.981 32 96v203.347C12.225 321.756.166 351.136.002 383.333c-.359 70.303 56.787 128.176 127.089 128.664.299.002.61.003.909.003 70.698 0 128-57.304 128-128 0-32.459-12.088-62.09-32-84.653V96zm-96 384l-.687-.002c-52.693-.366-95.581-43.795-95.312-96.501.202-39.467 22.532-61.321 31.999-72.05V96c0-35.29 28.71-64 64-64s64 28.71 64 64v215.447c9.186 10.409 32 32.659 32 72.553 0 52.935-43.065 96-96 96zm48-96c0 26.51-21.49 48-48 48s-48-21.49-48-48c0-20.898 13.359-38.667 32-45.258V96c0-8.837 7.164-16 16-16 8.837 0 16 7.163 16 16v242.742c18.641 6.591 32 24.36 32 45.258z"] };
var faThermometerHalf = { prefix: 'fal', iconName: 'thermometer-half', icon: [256, 512, [], "f2c9", "M176 384c0 26.51-21.49 48-48 48s-48-21.49-48-48c0-20.898 13.359-38.667 32-45.258V208c0-8.837 7.163-16 16-16s16 7.163 16 16v130.742c18.641 6.591 32 24.36 32 45.258zm48-84.653c19.912 22.564 32 52.195 32 84.653 0 70.696-57.302 128-128 128-.299 0-.61-.001-.909-.003C56.789 511.509-.357 453.636.002 383.333.166 351.135 12.225 321.756 32 299.347V96c0-53.019 42.981-96 96-96s96 42.981 96 96v203.347zM224 384c0-39.894-22.814-62.144-32-72.553V96c0-35.29-28.71-64-64-64S64 60.71 64 96v215.447c-9.467 10.728-31.797 32.582-31.999 72.049-.269 52.706 42.619 96.135 95.312 96.501L128 480c52.935 0 96-43.065 96-96z"] };
var faThermometerQuarter = { prefix: 'fal', iconName: 'thermometer-quarter', icon: [256, 512, [], "f2ca", "M176 384c0 26.51-21.49 48-48 48s-48-21.49-48-48c0-20.898 13.359-38.667 32-45.258V272c0-8.837 7.163-16 16-16s16 7.163 16 16v66.742c18.641 6.591 32 24.36 32 45.258zm48-84.653c19.912 22.564 32 52.195 32 84.653 0 70.696-57.302 128-128 128-.299 0-.61-.001-.909-.003C56.789 511.509-.357 453.636.002 383.333.166 351.135 12.225 321.756 32 299.347V96c0-53.019 42.981-96 96-96s96 42.981 96 96v203.347zM224 384c0-39.894-22.814-62.144-32-72.553V96c0-35.29-28.71-64-64-64S64 60.71 64 96v215.447c-9.467 10.728-31.797 32.582-31.999 72.049-.269 52.706 42.619 96.135 95.312 96.501L128 480c52.935 0 96-43.065 96-96z"] };
var faThermometerThreeQuarters = { prefix: 'fal', iconName: 'thermometer-three-quarters', icon: [256, 512, [], "f2c8", "M176 384c0 26.51-21.49 48-48 48s-48-21.49-48-48c0-20.898 13.359-38.667 32-45.258V144c0-8.837 7.163-16 16-16s16 7.163 16 16v194.742c18.641 6.591 32 24.36 32 45.258zm48-84.653c19.912 22.564 32 52.195 32 84.653 0 70.696-57.302 128-128 128-.299 0-.61-.001-.909-.003C56.789 511.509-.357 453.636.002 383.333.166 351.135 12.225 321.756 32 299.347V96c0-53.019 42.981-96 96-96s96 42.981 96 96v203.347zM224 384c0-39.894-22.814-62.144-32-72.553V96c0-35.29-28.71-64-64-64S64 60.71 64 96v215.447c-9.467 10.728-31.797 32.582-31.999 72.049-.269 52.706 42.619 96.135 95.312 96.501L128 480c52.935 0 96-43.065 96-96z"] };
var faThumbsDown = { prefix: 'fal', iconName: 'thumbs-down', icon: [512, 512, [], "f165", "M496.656 226.317c5.498-22.336 2.828-49.88-9.627-69.405 4.314-23.768-3.099-49.377-18.225-67.105C470.724 35.902 437.75 0 378.468.014c-3.363-.03-35.508-.003-41.013 0C260.593-.007 195.917 40 160 40h-10.845c-5.64-4.975-13.042-8-21.155-8H32C14.327 32 0 46.327 0 64v256c0 17.673 14.327 32 32 32h96c17.673 0 32-14.327 32-32v-12.481c.85.266 1.653.549 2.382.856C184 320 219.986 377.25 243.556 400.82c9.9 9.9 13.118 26.44 16.525 43.951C265.784 474.082 276.915 512 306.91 512c59.608 0 82.909-34.672 82.909-93.08 0-30.906-11.975-52.449-20.695-69.817h70.15c40.654 0 72.726-34.896 72.727-72.571-.001-20.532-5.418-37.341-15.345-50.215zM128 320H32V64h96v256zm311.273-2.898H327.274c0 40.727 30.545 59.628 30.545 101.817 0 25.574 0 61.091-50.909 61.091-20.363-20.364-10.182-71.272-40.727-101.817-28.607-28.607-71.272-101.818-101.818-101.818H160V72.74h4.365c34.701 0 101.818-40.727 173.09-40.727 3.48 0 37.415-.03 40.727 0 38.251.368 65.505 18.434 57.212 70.974 16.367 8.78 28.538 39.235 15.015 61.996C472 176 472 224 456.017 235.648 472 240 480.1 256.012 480 276.375c-.1 20.364-17.997 40.727-40.727 40.727zM104 272c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24z"] };
var faThumbsUp = { prefix: 'fal', iconName: 'thumbs-up', icon: [512, 512, [], "f164", "M496.656 285.683C506.583 272.809 512 256 512 235.468c-.001-37.674-32.073-72.571-72.727-72.571h-70.15c8.72-17.368 20.695-38.911 20.695-69.817C389.819 34.672 366.518 0 306.91 0c-29.995 0-41.126 37.918-46.829 67.228-3.407 17.511-6.626 34.052-16.525 43.951C219.986 134.75 184 192 162.382 203.625c-2.189.922-4.986 1.648-8.032 2.223C148.577 197.484 138.931 192 128 192H32c-17.673 0-32 14.327-32 32v256c0 17.673 14.327 32 32 32h96c17.673 0 32-14.327 32-32v-8.74c32.495 0 100.687 40.747 177.455 40.726 5.505.003 37.65.03 41.013 0 59.282.014 92.255-35.887 90.335-89.793 15.127-17.727 22.539-43.337 18.225-67.105 12.456-19.526 15.126-47.07 9.628-69.405zM32 480V224h96v256H32zm424.017-203.648C472 288 472 336 450.41 347.017c13.522 22.76 1.352 53.216-15.015 61.996 8.293 52.54-18.961 70.606-57.212 70.974-3.312.03-37.247 0-40.727 0-72.929 0-134.742-40.727-177.455-40.727V235.625c37.708 0 72.305-67.939 106.183-101.818 30.545-30.545 20.363-81.454 40.727-101.817 50.909 0 50.909 35.517 50.909 61.091 0 42.189-30.545 61.09-30.545 101.817h111.999c22.73 0 40.627 20.364 40.727 40.727.099 20.363-8.001 36.375-23.984 40.727zM104 432c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24z"] };
var faThumbtack = { prefix: 'fal', iconName: 'thumbtack', icon: [384, 512, [], "f08d", "M300.79 203.91L290.67 128H328c13.25 0 24-10.75 24-24V24c0-13.25-10.75-24-24-24H56C42.75 0 32 10.75 32 24v80c0 13.25 10.75 24 24 24h37.33l-10.12 75.91C34.938 231.494 0 278.443 0 335.24c0 8.84 7.16 16 16 16h160v120.779c0 .654.08 1.306.239 1.94l8 32c2.009 8.037 13.504 8.072 15.522 0l8-32a7.983 7.983 0 0 0 .239-1.94V351.24h160c8.84 0 16-7.16 16-16 0-56.797-34.938-103.746-83.21-131.33zM33.26 319.24c6.793-42.889 39.635-76.395 79.46-94.48L128 96H64V32h256v64h-64l15.28 128.76c40.011 18.17 72.694 51.761 79.46 94.48H33.26z"] };
var faTicket = { prefix: 'fal', iconName: 'ticket', icon: [576, 512, [], "f145", "M544 224h32V112c0-26.51-21.49-48-48-48H48C21.49 64 0 85.49 0 112v112h32c17.673 0 32 14.327 32 32s-14.327 32-32 32H0v112c0 26.51 21.49 48 48 48h480c26.51 0 48-21.49 48-48V288h-32c-17.673 0-32-14.327-32-32s14.327-32 32-32zm0 96v80c0 8.823-7.177 16-16 16H48c-8.823 0-16-7.177-16-16v-80c35.29 0 64-28.71 64-64s-28.71-64-64-64v-80c0-8.823 7.177-16 16-16h480c8.823 0 16 7.177 16 16v80c-35.29 0-64 28.71-64 64s28.71 64 64 64z"] };
var faTicketAlt = { prefix: 'fal', iconName: 'ticket-alt', icon: [576, 512, [], "f3ff", "M424 160H152c-13.255 0-24 10.745-24 24v144c0 13.255 10.745 24 24 24h272c13.255 0 24-10.745 24-24V184c0-13.255-10.745-24-24-24zm-8 160H160V192h256v128zm128-96h32V112c0-26.51-21.49-48-48-48H48C21.49 64 0 85.49 0 112v112h32c17.673 0 32 14.327 32 32s-14.327 32-32 32H0v112c0 26.51 21.49 48 48 48h480c26.51 0 48-21.49 48-48V288h-32c-17.673 0-32-14.327-32-32s14.327-32 32-32zm0 96v80c0 8.823-7.177 16-16 16H48c-8.823 0-16-7.177-16-16v-80c35.29 0 64-28.71 64-64s-28.71-64-64-64v-80c0-8.823 7.177-16 16-16h480c8.823 0 16 7.177 16 16v80c-35.29 0-64 28.71-64 64s28.71 64 64 64z"] };
var faTimes = { prefix: 'fal', iconName: 'times', icon: [384, 512, [], "f00d", "M217.5 256l137.2-137.2c4.7-4.7 4.7-12.3 0-17l-8.5-8.5c-4.7-4.7-12.3-4.7-17 0L192 230.5 54.8 93.4c-4.7-4.7-12.3-4.7-17 0l-8.5 8.5c-4.7 4.7-4.7 12.3 0 17L166.5 256 29.4 393.2c-4.7 4.7-4.7 12.3 0 17l8.5 8.5c4.7 4.7 12.3 4.7 17 0L192 281.5l137.2 137.2c4.7 4.7 12.3 4.7 17 0l8.5-8.5c4.7-4.7 4.7-12.3 0-17L217.5 256z"] };
var faTimesCircle = { prefix: 'fal', iconName: 'times-circle', icon: [512, 512, [], "f057", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 464c-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216zm94.8-285.3L281.5 256l69.3 69.3c4.7 4.7 4.7 12.3 0 17l-8.5 8.5c-4.7 4.7-12.3 4.7-17 0L256 281.5l-69.3 69.3c-4.7 4.7-12.3 4.7-17 0l-8.5-8.5c-4.7-4.7-4.7-12.3 0-17l69.3-69.3-69.3-69.3c-4.7-4.7-4.7-12.3 0-17l8.5-8.5c4.7-4.7 12.3-4.7 17 0l69.3 69.3 69.3-69.3c4.7-4.7 12.3-4.7 17 0l8.5 8.5c4.6 4.7 4.6 12.3 0 17z"] };
var faTimesHexagon = { prefix: 'fal', iconName: 'times-hexagon', icon: [576, 512, [], "f2ee", "M441.5 39.8C432.9 25.1 417.1 16 400 16H176c-17.1 0-32.9 9.1-41.5 23.8l-112 192c-8.7 14.9-8.7 33.4 0 48.4l112 192c8.6 14.7 24.4 23.8 41.5 23.8h224c17.1 0 32.9-9.1 41.5-23.8l112-192c8.7-14.9 8.7-33.4 0-48.4l-112-192zm84.3 224.3l-112 192c-2.9 4.9-8.2 7.9-13.8 7.9H176c-5.7 0-11-3-13.8-7.9l-112-192c-2.9-5-2.9-11.2 0-16.1l112-192c2.8-5 8.1-8 13.8-8h224c5.7 0 11 3 13.8 7.9l112 192c2.9 5 2.9 11.2 0 16.2zm-143 78.2l-8.5 8.5c-4.7 4.7-12.3 4.7-17 0L288 281.5l-69.3 69.3c-4.7 4.7-12.3 4.7-17 0l-8.5-8.5c-4.7-4.7-4.7-12.3 0-17l69.3-69.3-69.3-69.3c-4.7-4.7-4.7-12.3 0-17l8.5-8.5c4.7-4.7 12.3-4.7 17 0l69.3 69.3 69.3-69.3c4.7-4.7 12.3-4.7 17 0l8.5 8.5c4.7 4.7 4.7 12.3 0 17L313.5 256l69.3 69.3c4.6 4.7 4.6 12.3 0 17z"] };
var faTimesOctagon = { prefix: 'fal', iconName: 'times-octagon', icon: [512, 512, [], "f2f0", "M361.5 14.1c-9-9-21.2-14.1-33.9-14.1H184.5c-12.7 0-24.9 5.1-33.9 14.1L14.1 150.5c-9 9-14.1 21.2-14.1 33.9v143.1c0 12.7 5.1 24.9 14.1 33.9l136.5 136.5c9 9 21.2 14.1 33.9 14.1h143.1c12.7 0 24.9-5.1 33.9-14.1L498 361.4c9-9 14.1-21.2 14.1-33.9v-143c0-12.7-5.1-24.9-14.1-33.9L361.5 14.1zM480 327.5c0 4.3-1.7 8.3-4.7 11.3L338.9 475.3c-3 3-7 4.7-11.3 4.7H184.5c-4.3 0-8.3-1.7-11.3-4.7L36.7 338.9c-3-3-4.7-7-4.7-11.3V184.5c0-4.3 1.7-8.3 4.7-11.3L173.1 36.7c3-3 7-4.7 11.3-4.7h143.1c4.3 0 8.3 1.7 11.3 4.7l136.5 136.5c3 3 4.7 7 4.7 11.3v143zm-129.2 14.8l-8.5 8.5c-4.7 4.7-12.3 4.7-17 0L256 281.5l-69.3 69.3c-4.7 4.7-12.3 4.7-17 0l-8.5-8.5c-4.7-4.7-4.7-12.3 0-17l69.3-69.3-69.3-69.3c-4.7-4.7-4.7-12.3 0-17l8.5-8.5c4.7-4.7 12.3-4.7 17 0l69.3 69.3 69.3-69.3c4.7-4.7 12.3-4.7 17 0l8.5 8.5c4.7 4.7 4.7 12.3 0 17L281.5 256l69.3 69.3c4.6 4.7 4.6 12.3 0 17z"] };
var faTimesSquare = { prefix: 'fal', iconName: 'times-square', icon: [448, 512, [], "f2d3", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352zm-97.2-245.3L249.5 256l69.3 69.3c4.7 4.7 4.7 12.3 0 17l-8.5 8.5c-4.7 4.7-12.3 4.7-17 0L224 281.5l-69.3 69.3c-4.7 4.7-12.3 4.7-17 0l-8.5-8.5c-4.7-4.7-4.7-12.3 0-17l69.3-69.3-69.3-69.3c-4.7-4.7-4.7-12.3 0-17l8.5-8.5c4.7-4.7 12.3-4.7 17 0l69.3 69.3 69.3-69.3c4.7-4.7 12.3-4.7 17 0l8.5 8.5c4.6 4.7 4.6 12.3 0 17z"] };
var faTint = { prefix: 'fal', iconName: 'tint', icon: [384, 512, [], "f043", "M192 512C90.815 512 9.043 430.248 9.043 329.044c0-111.709 96.217-151.344 139.914-297.003 13.158-43.525 74.204-41.951 86.123.127 44.453 147.926 139.876 185.631 139.876 296.876C374.956 430.227 293.205 512 192 512zM41.043 329.044C41.043 412.543 108.484 480 192 480c83.498 0 150.956-67.44 150.956-150.956 0-96.298-93.281-136.637-138.564-287.577l-.086-.297c-3.232-11.583-20.791-12.624-24.708.329C134.413 192.118 41.043 232.94 41.043 329.044zm108.435-4.87c-1.509-5.533-9.447-5.532-10.956 0-9.223 29.425-27.913 37.645-27.913 58.435C110.609 401.13 125.478 416 144 416s33.391-14.87 33.391-33.391c0-20.839-18.673-28.956-27.913-58.435z"] };
var faToggleOff = { prefix: 'fal', iconName: 'toggle-off', icon: [576, 512, [], "f204", "M384 96c42.738 0 82.917 16.643 113.137 46.863S544 213.262 544 256s-16.643 82.917-46.863 113.137S426.738 416 384 416H192c-42.738 0-82.917-16.643-113.137-46.863S32 298.738 32 256s16.643-82.917 46.863-113.137S149.262 96 192 96h192m0-32H192C85.961 64 0 149.961 0 256s85.961 192 192 192h192c106.039 0 192-85.961 192-192S490.039 64 384 64zm-192 96c52.935 0 96 43.065 96 96s-43.065 96-96 96-96-43.065-96-96 43.065-96 96-96m0-32c-70.692 0-128 57.307-128 128s57.308 128 128 128 128-57.307 128-128-57.308-128-128-128z"] };
var faToggleOn = { prefix: 'fal', iconName: 'toggle-on', icon: [576, 512, [], "f205", "M384 96c88.426 0 160 71.561 160 160 0 88.426-71.561 160-160 160H192c-88.426 0-160-71.561-160-160 0-88.425 71.561-160 160-160h192m0-32H192C85.961 64 0 149.961 0 256s85.961 192 192 192h192c106.039 0 192-85.961 192-192S490.039 64 384 64zm0 304c61.856 0 112-50.144 112-112s-50.144-112-112-112-112 50.144-112 112c0 28.404 10.574 54.339 27.999 74.082C320.522 353.335 350.548 368 384 368z"] };
var faTrademark = { prefix: 'fal', iconName: 'trademark', icon: [640, 512, [], "f25c", "M121.564 134.98H23.876c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h240.249c6.627 0 12 5.373 12 12v14.98c0 6.627-5.373 12-12 12h-97.688V404c0 6.627-5.373 12-12 12h-20.873c-6.627 0-12-5.373-12-12V134.98zM352.474 96h28.124a12 12 0 0 1 11.048 7.315l70.325 165.83c7.252 17.677 15.864 43.059 15.864 43.059h.907s8.611-25.382 15.863-43.059l70.326-165.83A11.998 11.998 0 0 1 575.978 96h28.123a12 12 0 0 1 11.961 11.034l23.898 296c.564 6.985-4.953 12.966-11.961 12.966h-20.318a12 12 0 0 1-11.963-11.059l-14.994-190.64c-1.36-19.49-.453-47.139-.453-47.139h-.907s-9.518 29.462-17.224 47.139l-60.746 137a12 12 0 0 1-10.97 7.136h-24.252a12 12 0 0 1-10.983-7.165l-60.301-136.971c-7.252-17.225-17.224-48.046-17.224-48.046h-.907s.453 28.555-.907 48.046l-14.564 190.613A11.997 11.997 0 0 1 349.322 416h-20.746c-7.008 0-12.525-5.98-11.961-12.966l23.897-296A12.002 12.002 0 0 1 352.474 96z"] };
var faTrain = { prefix: 'fal', iconName: 'train', icon: [448, 512, [], "f238", "M224 320c8.823 0 16 7.177 16 16s-7.177 16-16 16-16-7.177-16-16 7.177-16 16-16m0-32c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48zM320 0H128C64 0 0 42.981 0 96v256c0 47.169 50.656 86.391 106.9 94.473l-55.285 55.285c-3.78 3.78-1.103 10.243 4.243 10.243h25.798c3.183 0 6.235-1.264 8.485-3.515L150.627 448h146.745l60.486 60.485a12.002 12.002 0 0 0 8.485 3.515h25.798c5.345 0 8.022-6.463 4.243-10.243L341.1 446.472C397.344 438.391 448 399.169 448 352V96c0-53.019-63-96-128-96zM32 128h384v96H32v-96zm96-96h192c58.237 0 96 37.881 96 64H32c0-32.299 47.552-64 96-64zm192 384H128c-48.448 0-96-31.701-96-64v-96h384v96c0 32.299-47.552 64-96 64z"] };
var faTransgender = { prefix: 'fal', iconName: 'transgender', icon: [384, 512, [], "f224", "M160 383.1c72-8 128-69 128-143.1 0-34-11.8-65.2-31.5-89.9L352 54.6V100c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V12c0-6.6-5.4-12-12-12h-88c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h45.4l-95.5 95.5C209.2 107.8 178 96 144 96 64.5 96 0 160.5 0 240c0 74.1 56 135.2 128 143.1V424H76c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h52v44c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-44h52c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12h-52v-40.9zM144 352c-61.9 0-112-50-112-112 0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112z"] };
var faTransgenderAlt = { prefix: 'fal', iconName: 'transgender-alt', icon: [480, 512, [], "f225", "M468 0h-88c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h45.4l-95.5 95.5C305.2 107.8 274 96 240 96s-65.2 11.8-89.9 31.5l-28.9-28.9 31.1-31.1c4.7-4.7 4.7-12.3 0-17l-5.7-5.7c-4.7-4.7-12.3-4.7-17 0L98.6 76l-44-44H100c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12H12C5.4 0 0 5.4 0 12v88c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V54.6l44 44-31.1 31.1c-4.7 4.7-4.7 12.3 0 17l5.7 5.7c4.7 4.7 12.3 4.7 17 0l31.1-31.1 28.9 28.9C107.8 174.8 96 206 96 240c0 74.1 56 135.2 128 143.1V424h-52c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h52v44c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-44h52c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12h-52v-40.9c72-8 128-69 128-143.1 0-34-11.8-65.2-31.5-89.9L448 54.6V100c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12V12c0-6.6-5.4-12-12-12zM240 352c-61.9 0-112-50-112-112 0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112z"] };
var faTrash = { prefix: 'fal', iconName: 'trash', icon: [512, 512, [], "f1f8", "M368 64l-33.6-44.8C325.3 7.1 311.1 0 296 0h-80c-15.1 0-29.3 7.1-38.4 19.2L144 64H40c-13.3 0-24 10.7-24 24v2c0 3.3 2.7 6 6 6h20.9l33.2 372.3C78.3 493 99 512 123.9 512h264.2c24.9 0 45.6-19 47.8-43.7L469.1 96H490c3.3 0 6-2.7 6-6v-2c0-13.3-10.7-24-24-24H368zM216 32h80c5 0 9.8 2.4 12.8 6.4L328 64H184l19.2-25.6c3-4 7.8-6.4 12.8-6.4zm188 433.4c-.7 8.3-7.6 14.6-15.9 14.6H123.9c-8.3 0-15.2-6.3-15.9-14.6L75 96h362l-33 369.4z"] };
var faTrashAlt = { prefix: 'fal', iconName: 'trash-alt', icon: [448, 512, [], "f2ed", "M336 64l-33.6-44.8C293.3 7.1 279.1 0 264 0h-80c-15.1 0-29.3 7.1-38.4 19.2L112 64H24C10.7 64 0 74.7 0 88v2c0 3.3 2.7 6 6 6h26v368c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V96h26c3.3 0 6-2.7 6-6v-2c0-13.3-10.7-24-24-24h-88zM184 32h80c5 0 9.8 2.4 12.8 6.4L296 64H152l19.2-25.6c3-4 7.8-6.4 12.8-6.4zm200 432c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V96h320v368zm-176-44V156c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v264c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12zm-80 0V156c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v264c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12zm160 0V156c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v264c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12z"] };
var faTree = { prefix: 'fal', iconName: 'tree', icon: [384, 512, [], "f1bb", "M376.768 363.786L321.574 296c26.606-.041 41.554-30.774 25.144-51.729l-53.517-68.343c26.446-1.778 39.401-33.244 21.818-53.127L215.971 10.796c-12.729-14.393-35.212-14.395-47.942 0L68.981 122.801c-17.563 19.86-4.664 51.347 21.818 53.127l-53.517 68.343c-16.404 20.948-1.47 51.688 25.144 51.729L7.233 363.786C-9.776 384.661 5.126 416 32.04 416H168c0 36.341-3.919 56.605-29.657 82.343C133.318 503.368 136.879 512 144 512h96c7.106 0 10.692-8.622 5.657-13.657C219.909 472.595 216 452.325 216 416h135.961c26.926 0 41.808-31.349 24.807-52.214zM216 384v-20c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v20H32l97.778-120H62.476l93.968-120H92.952L192 32l99.048 112h-63.492l93.968 120h-67.302L352 384H216z"] };
var faTreeAlt = { prefix: 'fal', iconName: 'tree-alt', icon: [512, 512, [], "f400", "M466.508 187.297c24.834-68.655-36.754-137.605-107.651-120.849C340.861 26.623 300.664 0 256 0s-84.861 26.623-102.856 66.448C82.399 49.726 20.617 118.53 45.492 187.297 17.108 207.473 0 240.103 0 275.6 0 335.372 48.628 384 108.4 384H232c0 56.531 3.718 80.968-29.657 114.343C197.318 503.368 200.88 512 208 512h96c7.106 0 10.692-8.622 5.657-13.657C276.284 464.97 280 440.559 280 384h123.6c59.772 0 108.4-48.628 108.4-108.4 0-35.497-17.108-68.127-45.492-88.303zM403.6 352H280v-20c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v20H108.4C66.273 352 32 317.727 32 275.6c0-50.994 41.986-68.232 56.055-75.528C79.484 185.011 72 174.651 72 156c0-33.084 26.916-60 60-60 15.319 0 23.616 4.839 41.207 12.651C183.858 70.795 202.39 32 256 32c49.743 0 70.852 34.214 82.793 76.651C356.415 100.826 364.697 96 380 96c33.084 0 60 26.916 60 60 0 18.636-7.472 28.991-16.056 44.071C436.339 206.499 480 223.86 480 275.6c0 42.127-34.273 76.4-76.4 76.4z"] };
var faTriangle = { prefix: 'fal', iconName: 'triangle', icon: [576, 512, [], "f2ec", "M329.6 24c-18.4-32-64.7-32-83.2 0L6.5 440c-18.4 31.9 4.6 72 41.6 72H528c36.9 0 60-40 41.6-72l-240-416zM528 480H48c-12.3 0-20-13.3-13.9-24l240-416c6.1-10.6 21.6-10.7 27.7 0l240 416c6.2 10.6-1.5 24-13.8 24z"] };
var faTrophy = { prefix: 'fal', iconName: 'trophy', icon: [576, 512, [], "f091", "M448 64V12c0-6.6-5.4-12-12-12H140c-6.6 0-12 5.4-12 12v52H12C5.4 64 0 69.4 0 76v61.6C0 199.7 68.1 272 160.7 285.7c29.4 60.7 73.7 90.3 111.3 96.9V480h-86c-14.4 0-26 11.7-26 26.1 0 3.3 2.7 5.9 6 5.9h244c3.3 0 6-2.6 6-5.9 0-14.4-11.6-26.1-26-26.1h-86v-97.4c37.7-6.6 81.9-36.2 111.3-96.9C508 272 576 199.6 576 137.6V76c0-6.6-5.4-12-12-12H448zM32 137.6V96h96v24c0 51.8 7 94.9 18.5 130.2C77.9 232.5 32 178 32 137.6zM288 352c-72 0-128-104-128-232V32h256v88c0 128-56 232-128 232zm256-214.4c0 40.4-46 94.9-114.5 112.6C441 214.9 448 171.8 448 120V96h96v41.6z"] };
var faTrophyAlt = { prefix: 'fal', iconName: 'trophy-alt', icon: [576, 512, [], "f2eb", "M370.5 138.9l-50.2-7.3-22.5-45.5c-4-8.1-15.7-8.2-19.7 0l-22.5 45.5-50.2 7.3c-9 1.3-12.6 12.4-6.1 18.8l36.3 35.4-8.6 50c-1.5 8.9 7.9 15.8 16 11.6l44.9-23.6 44.9 23.6c8 4.2 17.5-2.6 16-11.6l-8.6-50 36.3-35.4c6.7-6.4 3-17.5-6-18.8zm-60.3 44.4l5.2 30.6-27.4-14.4-27.5 14.4 5.2-30.6-22.2-21.6 30.7-4.5 13.7-27.8 13.7 27.8 30.7 4.5-22.1 21.6zM448 64V12c0-6.6-5.4-12-12-12H140c-6.6 0-12 5.4-12 12v52H12C5.4 64 0 69.4 0 76v61.6C0 199.7 68.1 272 160.7 285.7c29.4 60.7 73.7 90.3 111.3 96.9V480h-86c-14.4 0-26 11.7-26 26.1 0 3.3 2.7 5.9 6 5.9h244c3.3 0 6-2.6 6-5.9 0-14.4-11.6-26.1-26-26.1h-86v-97.4c37.7-6.6 81.9-36.2 111.3-96.9C508 272 576 199.6 576 137.6V76c0-6.6-5.4-12-12-12H448zM32 137.6V96h96v24c0 51.8 7 94.9 18.5 130.2C77.9 232.5 32 178 32 137.6zM288 352c-72 0-128-104-128-232V32h256v88c0 128-56 232-128 232zm256-214.4c0 40.4-46 94.9-114.5 112.6C441 214.9 448 171.8 448 120V96h96v41.6z"] };
var faTruck = { prefix: 'fal', iconName: 'truck', icon: [640, 512, [], "f0d1", "M592 32H272c-26.51 0-48 21.49-48 48v48h-44.118a48 48 0 0 0-33.941 14.059l-99.882 99.882A48 48 0 0 0 32 275.882V384H20c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h45.604A80.321 80.321 0 0 0 64 432c0 44.183 35.817 80 80 80s80-35.817 80-80c0-5.48-.554-10.83-1.604-16h195.207a80.321 80.321 0 0 0-1.604 16c0 44.183 35.817 80 80 80s80-35.817 80-80c0-5.48-.554-10.83-1.604-16H592c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zM224 384h-15.999c-14.595-19.43-37.829-32-64.001-32s-49.406 12.57-64.001 32H64V275.882c0-4.274 1.664-8.292 4.686-11.314l99.882-99.882A15.895 15.895 0 0 1 179.882 160H224v224zm384-16c0 8.822-7.177 16-16 16h-31.999c-14.595-19.43-37.829-32-64.001-32s-49.406 12.57-64.001 32H256V80c0-8.822 7.177-16 16-16h320c8.823 0 16 7.178 16 16v288zm-501.757-90.243l75.515-75.515c3.78-3.78 10.243-1.103 10.243 4.243V282a6 6 0 0 1-6 6h-75.515c-5.346 0-8.023-6.463-4.243-10.243zM496 384c26.467 0 48 21.533 48 48s-21.533 48-48 48-48-21.533-48-48 21.533-48 48-48m-352 0c26.467 0 48 21.533 48 48s-21.533 48-48 48-48-21.533-48-48 21.533-48 48-48"] };
var faTty = { prefix: 'fal', iconName: 'tty', icon: [512, 512, [], "f1e4", "M167.06 189.135c13.646-5.471 22.148-19.536 20.695-34.19l-4.308-43.183c47.209-14.454 97.895-14.454 145.105.001l-4.308 43.181c-1.463 14.662 7.048 28.717 20.695 34.19l81.008 32.479c14.924 5.984 31.941.41 40.46-13.252l40.508-64.959c8.239-13.213 6.313-30.132-4.676-41.145-136.167-136.485-356.607-136.196-492.48 0-10.996 11.022-12.908 27.943-4.675 41.146l40.507 64.958c8.52 13.662 25.536 19.236 40.46 13.252l81.009-32.478zm-94.338 2.227l-40.506-64.958a1.186 1.186 0 0 1 .167-1.473c123.663-123.95 323.69-123.831 447.234 0 .415.416.435 1.043.168 1.472l-40.507 64.958a1.186 1.186 0 0 1-1.448.475l-81.006-32.479a1.2 1.2 0 0 1-.742-1.224l6.82-68.362c-79.031-28.623-137.77-27.539-213.803 0l6.82 68.363a1.189 1.189 0 0 1-.74 1.223l-81.009 32.48a1.186 1.186 0 0 1-1.448-.475zM136 396v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zM88 492v-24c0-6.627-5.373-12-12-12H52c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm384 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zM88 300v-24c0-6.627-5.373-12-12-12H52c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm96 0v-24c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h24c6.627 0 12-5.373 12-12zm-96 184v-8c0-6.627-5.373-12-12-12H148c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h216c6.627 0 12-5.373 12-12z"] };
var faTv = { prefix: 'fal', iconName: 'tv', icon: [640, 512, [], "f26c", "M592 0H48C21.5 0 0 21.5 0 48v320c0 26.5 21.5 48 48 48h256v64H144c-8.8 0-16 7.2-16 16s7.2 16 16 16h352c8.8 0 16-7.2 16-16s-7.2-16-16-16H336v-64h256c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zm16 368c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h544c8.8 0 16 7.2 16 16v320z"] };
var faTvRetro = { prefix: 'fal', iconName: 'tv-retro', icon: [512, 512, [], "f401", "M416 243v-8c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12zm96-100v288c0 26.5-21.5 48-48 48h-16v33h-16l-11-33H91l-11 33H64v-33H48c-26.5 0-48-21.5-48-48V143c0-26.5 21.5-48 48-48h160.1l-74.8-67.1c-6.6-5.9-7.2-16-1.3-22.6 5.9-6.6 16-7.2 22.6-1.3L256 95h.8L357.3 4.1c6.6-5.9 16.7-5.4 22.6 1.2 5.9 6.6 5.4 16.7-1.2 22.6L304.5 95H464c26.5 0 48 21.5 48 48zm-32 0c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h416c8.8 0 16-7.2 16-16V143zm-256 49c-68.8 0-106.2 2.3-125.3 4.3-1.3 14.4-2.7 41.5-2.7 90.7 0 50.5 1.4 78 2.7 92.8 19.2 1.9 56.5 4.2 125.3 4.2s106.1-2.3 125.3-4.2c1.3-14.7 2.7-42.3 2.7-92.8 0-49.2-1.4-76.3-2.7-90.7-19.1-2-56.5-4.3-125.3-4.3m0-32c128 0 152 8 152 8s8 0 8 119c0 121-8 121-8 121s-24 8-152 8-152-8-152-8-8 0-8-121c0-119 8-119 8-119s24-8 152-8zm204 159h8c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12z"] };
var faUmbrella = { prefix: 'fal', iconName: 'umbrella', icon: [576, 512, [], "f0e9", "M575.226 253.773C545.925 130.834 430.519 54.483 304 48.397V16c0-8.837-7.163-16-16-16-8.836 0-16 7.163-16 16v32.396C146.034 54.429 30.908 129.943.797 253.659c-5.961 23.858 22.769 44.089 44.08 25.07 49.496-46.085 89.855-27.656 125.362 27.652 11.37 17.807 34.796 16.862 45.569.014 15.22-23.517 31.155-45.005 56.191-51.47V432c0 26.467-21.533 48-48 48s-48-21.533-48-48c0-8.837-7.164-16-16-16s-16 7.163-16 16c0 44.112 35.888 80 80 80s80-35.888 80-80V255.154c30.092 8.271 44.631 33.263 56.183 51.229 10.831 16.956 34.251 17.718 45.568.015 36.212-55.948 76.628-73.046 125.367-27.668 21.178 18.903 49.982-.989 44.109-24.957zm-191.973 28.699c-24.275-39.745-57.893-61.529-95.253-61.529-44.455 0-71.65 27.015-94.732 61.49-41.591-67.776-107.539-77.501-156.147-39.305C72.102 138.706 178.755 80 288 80c109.33 0 216.967 59.325 251.164 163.722-58.251-43.941-114.062-21.967-155.911 38.75z"] };
var faUnderline = { prefix: 'fal', iconName: 'underline', icon: [448, 512, [], "f0cd", "M0 500v-8c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H12c-6.627 0-12-5.373-12-12zM291.142 12v8c0 6.627 5.373 12 12 12h42.72v226.509c0 85.451-46.451 128.726-122.145 128.726-74.322 0-121.569-40.289-121.569-127.572V32h42.721c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H26.659c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12H69.38v228.818c0 106.811 63.591 158.094 154.913 158.094 89.287 0 154.337-52.813 154.337-158.094V32h42.721c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12H303.142c-6.628 0-12 5.373-12 12z"] };
var faUndo = { prefix: 'fal', iconName: 'undo', icon: [512, 512, [], "f0e2", "M20 8h10c6.627 0 12 5.373 12 12v110.625C85.196 57.047 165.239 7.715 256.793 8.001 393.18 8.428 504.213 120.009 504 256.396 503.786 393.181 392.834 504 256 504c-63.926 0-122.202-24.187-166.178-63.908-5.113-4.618-5.354-12.561-.482-17.433l7.069-7.069c4.503-4.503 11.749-4.714 16.482-.454C150.782 449.238 200.935 470 256 470c117.744 0 214-95.331 214-214 0-117.744-95.331-214-214-214-82.862 0-154.737 47.077-190.289 116H180c6.627 0 12 5.373 12 12v10c0 6.627-5.373 12-12 12H20c-6.627 0-12-5.373-12-12V20c0-6.627 5.373-12 12-12z"] };
var faUndoAlt = { prefix: 'fal', iconName: 'undo-alt', icon: [512, 512, [], "f2ea", "M54.627 9.387l50.095 50.101C146.632 27.177 199.156 7.96 256.178 8 392.817 8.096 504.251 119.827 504 256.467 503.748 393.219 392.811 504 256 504c-63.926 0-122.202-24.187-166.178-63.908-5.113-4.618-5.354-12.561-.482-17.433l7.079-7.079c4.499-4.499 11.744-4.722 16.472-.464C151.849 450.203 202.318 470 256 470c118.022 0 214-95.585 214-214 0-118.026-95.589-214-214-214-46.514 0-90.671 14.872-127.021 41.749l53.617 53.624c20.099 20.1 5.855 54.627-22.627 54.627H32c-17.673 0-32-14.327-32-32V32.015C0 3.54 34.564-10.676 54.627 9.387zM32 32v128h128L32 32"] };
var faUniversalAccess = { prefix: 'fal', iconName: 'universal-access', icon: [512, 512, [], "f29a", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 464c-118.663 0-216-96.055-216-216 0-118.663 96.055-216 216-216 118.663 0 216 96.055 216 216 0 118.663-96.055 216-216 216zm139.701-299.677c2.03 8.601-3.296 17.218-11.896 19.249-31.006 7.321-59.956 13.775-88.689 17.114.535 114.852 13.167 139.988 27.255 176.036 4.02 10.289-1.063 21.888-11.352 25.906-10.296 4.022-21.89-1.069-25.906-11.352-9.319-23.841-18.551-44.565-24.271-87.277h-9.685c-5.728 42.773-14.986 63.515-24.27 87.276-4.023 10.299-15.633 15.369-25.906 11.353-10.289-4.019-15.371-15.617-11.353-25.906 14.103-36.083 26.72-61.235 27.255-176.036-28.734-3.339-57.683-9.793-88.689-17.114-8.6-2.031-13.926-10.648-11.895-19.249 2.03-8.6 10.647-13.926 19.249-11.896 105.222 24.845 135.48 24.893 240.904 0 8.599-2.022 17.218 3.297 19.249 11.896zm-177.895-42.517c0-21.094 17.1-38.193 38.194-38.193s38.194 17.1 38.194 38.193S277.094 168 256 168s-38.194-17.1-38.194-38.194z"] };
var faUniversity = { prefix: 'fal', iconName: 'university', icon: [512, 512, [], "f19c", "M496 448h-16v-40c0-13.255-10.745-24-24-24h-40V208h-32v176h-64V208h-32v176h-64V208h-32v176h-64V208H96v176H56c-13.255 0-24 10.745-24 24v40H16c-8.837 0-16 7.163-16 16v8a8 8 0 0 0 8 8h496a8 8 0 0 0 8-8v-8c0-8.837-7.163-16-16-16zM64 416h384v32H64v-32zm440.267-280L271.179 34.463a48.004 48.004 0 0 0-30.358 0L7.733 136A11.999 11.999 0 0 0 0 147.216V156c0 6.627 5.373 12 12 12h20v12c0 6.627 5.373 12 12 12h424c6.627 0 12-5.373 12-12v-12h20c6.627 0 12-5.373 12-12v-8.784c0-4.982-3.077-9.445-7.733-11.216zM448 160H64v-13.606l187.943-81.871a16.004 16.004 0 0 1 8.114 0L448 146.394V160z"] };
var faUnlink = { prefix: 'fal', iconName: 'unlink', icon: [512, 512, [], "f127", "M207.889 137.235c-4.686-4.686-4.686-12.284 0-16.971l82.159-82.159c50.81-50.813 133.046-50.803 183.848 0 50.812 50.81 50.802 133.048-.001 183.847l-82.159 82.159c-4.686 4.686-12.284 4.686-16.971 0l-8.485-8.485c-4.686-4.686-4.686-12.284 0-16.971l82.159-82.159c36.739-36.741 36.735-96.2 0-132.936-36.741-36.741-96.199-36.736-132.937-.001l-82.159 82.159c-4.686 4.686-12.284 4.686-16.971 0l-8.483-8.483zm-11.391 311.294c-36.65 36.65-96.286 36.651-132.937-.001-36.736-36.736-36.739-96.194 0-132.936l82.19-82.19c4.686-4.686 4.686-12.284 0-16.971l-8.485-8.485c-4.686-4.686-12.284-4.686-16.971 0l-82.19 82.189c-50.802 50.8-50.813 133.038 0 183.848 50.686 50.688 133.162 50.687 183.847 0l82.19-82.19c4.686-4.686 4.686-12.284 0-16.971l-8.484-8.484c-4.686-4.686-12.284-4.686-16.971 0l-82.189 82.191zM11.999 3.515L3.514 12c-4.686 4.686-4.686 12.284 0 16.971L483.03 508.485c4.686 4.686 12.284 4.686 16.971 0l8.485-8.485c4.686-4.686 4.686-12.284 0-16.971L28.97 3.515c-4.686-4.687-12.284-4.687-16.971 0z"] };
var faUnlock = { prefix: 'fal', iconName: 'unlock', icon: [384, 512, [], "f09c", "M336 256H96v-96c0-70.6 25.4-128 96-128s96 57.4 96 128v20c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-18.5C320 73.1 280.9.3 192.5 0 104-.3 64 71.6 64 160v96H48c-26.5 0-48 21.5-48 48v160c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V304c0-26.5-21.5-48-48-48zm16 208c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V304c0-8.8 7.2-16 16-16h288c8.8 0 16 7.2 16 16v160z"] };
var faUnlockAlt = { prefix: 'fal', iconName: 'unlock-alt', icon: [384, 512, [], "f13e", "M336 256H96v-96c0-70.6 25.4-128 96-128s96 57.4 96 128v20c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-18.5C320 73.1 280.9.3 192.5 0 104-.3 64 71.6 64 160v96H48c-26.5 0-48 21.5-48 48v160c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V304c0-26.5-21.5-48-48-48zm16 208c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V304c0-8.8 7.2-16 16-16h288c8.8 0 16 7.2 16 16v160zm-160-32c-8.8 0-16-7.2-16-16v-64c0-8.8 7.2-16 16-16s16 7.2 16 16v64c0 8.8-7.2 16-16 16z"] };
var faUpload = { prefix: 'fal', iconName: 'upload', icon: [512, 512, [], "f093", "M452 432c0 11-9 20-20 20s-20-9-20-20 9-20 20-20 20 9 20 20zm-84-20c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm144-48v104c0 24.3-19.7 44-44 44H44c-24.3 0-44-19.7-44-44V364c0-24.3 19.7-44 44-44h124v-99.3h-52.7c-35.6 0-53.4-43.1-28.3-68.3L227.7 11.7c15.6-15.6 40.9-15.6 56.6 0L425 152.4c25.2 25.2 7.3 68.3-28.3 68.3H344V320h124c24.3 0 44 19.7 44 44zM200 188.7V376c0 4.4 3.6 8 8 8h96c4.4 0 8-3.6 8-8V188.7h84.7c7.1 0 10.7-8.6 5.7-13.7L261.7 34.3c-3.1-3.1-8.2-3.1-11.3 0L109.7 175c-5 5-1.5 13.7 5.7 13.7H200zM480 364c0-6.6-5.4-12-12-12H344v24c0 22.1-17.9 40-40 40h-96c-22.1 0-40-17.9-40-40v-24H44c-6.6 0-12 5.4-12 12v104c0 6.6 5.4 12 12 12h424c6.6 0 12-5.4 12-12V364z"] };
var faUsdCircle = { prefix: 'fal', iconName: 'usd-circle', icon: [512, 512, [], "f2e8", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm216 248c0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216 0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216zm-159.3 6.5c-13-10.2-29.5-16.8-45.5-23.2-30.3-12.1-48.7-20.8-48.7-40.6 0-8 3.7-15.4 10.5-20.9 7.8-6.2 18.7-9.5 31.6-9.5 26.5 0 46 17.6 46.2 17.8 1.6 1.5 3.9 2.2 6.1 1.9 2.2-.3 4.2-1.6 5.3-3.6l11-18.4c1.7-2.9 1.3-6.6-1-9.1-.8-.9-19.5-19.9-53.5-24.1v-29.3c0-4.1-3.3-7.5-7.4-7.5h-18.6c-4.1 0-7.4 3.4-7.4 7.5V134c-16.8 3.2-31.3 10.4-42.2 21-12.3 11.9-19 27.7-19 44.4 0 20.1 7.9 36.1 24 49 13.4 10.7 30.4 17.5 46.8 24.2 29.3 11.8 47 20.3 47 38.1 0 22.9-20.5 33.4-39.5 33.4-32.5 0-55.6-23.2-55.9-23.6-1.5-1.5-3.6-2.3-5.7-2.2-2.1.1-4.1 1.1-5.5 2.8l-13.6 17.1c-2.3 2.8-2.2 6.9.2 9.7 1 1.1 23 25.7 63.4 31.3v29.5c0 4.1 3.3 7.5 7.4 7.5h18.6c4.1 0 7.4-3.4 7.4-7.5v-29.6c17.3-2.9 32-10.5 42.9-22.1 11.8-12.5 18.3-29.3 18.3-47.2.1-19.6-7.5-35-23.2-47.3z"] };
var faUsdSquare = { prefix: 'fal', iconName: 'usd-square', icon: [448, 512, [], "f2e9", "M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h352c8.8 0 16 7.2 16 16v352zM280.7 262.5c-13-10.2-29.5-16.8-45.5-23.2-30.3-12.1-48.7-20.8-48.7-40.6 0-8 3.7-15.4 10.5-20.9 7.8-6.2 18.7-9.5 31.6-9.5 26.5 0 46 17.6 46.2 17.8 1.6 1.5 3.9 2.2 6.1 1.9 2.2-.3 4.2-1.6 5.3-3.6l11-18.4c1.7-2.9 1.3-6.6-1-9.1-.8-.9-19.5-19.9-53.5-24.1v-29.3c0-4.1-3.3-7.5-7.4-7.5h-18.6c-4.1 0-7.4 3.4-7.4 7.5V134c-16.8 3.2-31.3 10.4-42.2 21-12.3 11.9-19 27.7-19 44.4 0 20.1 7.9 36.1 24 49 13.4 10.7 30.4 17.5 46.8 24.2 29.3 11.8 47 20.3 47 38.1 0 22.9-20.5 33.4-39.5 33.4-32.5 0-55.6-23.2-55.9-23.6-1.5-1.5-3.6-2.3-5.7-2.2-2.1.1-4.1 1.1-5.5 2.8l-13.6 17.1c-2.3 2.8-2.2 6.9.2 9.7 1 1.1 23 25.7 63.4 31.3v29.5c0 4.1 3.3 7.5 7.4 7.5h18.6c4.1 0 7.4-3.4 7.4-7.5v-29.6c17.3-2.9 32-10.5 42.9-22.1 11.8-12.5 18.3-29.3 18.3-47.2.1-19.6-7.5-35-23.2-47.3z"] };
var faUser = { prefix: 'fal', iconName: 'user', icon: [512, 512, [], "f007", "M430.769 312.653l-48.658-13.902C427.833 251.806 432 197.605 432 176 432 78.845 353.262 0 256 0 158.859 0 80 78.724 80 176c0 21.609 4.167 75.806 49.889 122.751l-48.658 13.902C19.49 330.294 0 386.442 0 420.344V448c0 35.29 28.71 64 64 64h384c35.29 0 64-28.71 64-64v-27.656c0-33.198-18.981-89.905-81.231-107.691zM256 32c79.529 0 144 64.471 144 144s-64.471 144-144 144-144-64.471-144-144S176.471 32 256 32zm224 416c0 17.673-14.327 32-32 32H64c-17.673 0-32-14.327-32-32v-27.656c0-35.718 23.678-67.109 58.022-76.922l69.862-19.961C176.969 334.613 210.109 352 256 352c45.897 0 79.038-17.392 96.116-28.538l69.862 19.961C456.322 353.235 480 384.626 480 420.344V448z"] };
var faUserAlt = { prefix: 'fal', iconName: 'user-alt', icon: [448, 512, [], "f406", "M366.769 241.796l-29.779-8.508C357.087 207.959 368 176.82 368 144 368 64.475 303.662 0 224 0 144.475 0 80 64.338 80 144c0 32.82 10.913 63.959 31.01 89.288l-29.779 8.508C19.49 259.437 0 315.585 0 349.487v103.084C0 485.34 26.659 512 59.428 512h329.143c32.77 0 59.429-26.66 59.429-59.429V349.487c0-33.198-18.981-89.905-81.231-107.691zM224 32c61.856 0 112 50.144 112 112s-50.144 112-112 112-112-50.144-112-112S162.144 32 224 32zm192 420.571C416 467.72 403.72 480 388.572 480H59.428C44.28 480 32 467.72 32 452.571V349.487c0-35.718 23.678-67.109 58.022-76.922l47.337-13.525C162.196 277.827 192.314 288 224 288s61.804-10.173 86.641-28.96l47.337 13.525C392.322 282.378 416 313.769 416 349.487v103.084z"] };
var faUserCircle = { prefix: 'fal', iconName: 'user-circle', icon: [512, 512, [], "f2bd", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 32c119.293 0 216 96.707 216 216 0 41.286-11.59 79.862-31.684 112.665-12.599-27.799-38.139-43.609-56.969-48.989L350.53 310.3C372.154 286.662 384 256.243 384 224c0-70.689-57.189-128-128-128-70.691 0-128 57.192-128 128 0 32.243 11.846 62.662 33.471 86.299l-32.817 9.376c-18.483 5.281-44.287 20.974-56.979 48.973C51.586 335.849 40 297.279 40 256c0-119.293 96.707-216 216-216zm0 280c-53.02 0-96-42.981-96-96s42.98-96 96-96 96 42.981 96 96-42.98 96-96 96zm0 152c-63.352 0-120.333-27.274-159.844-70.72 1.705-23.783 18.083-44.206 41.288-50.836l54.501-15.572C211.204 346.041 233.143 352 256 352s44.796-5.959 64.054-17.127l54.501 15.572c23.205 6.63 39.583 27.053 41.288 50.836C376.333 444.726 319.352 472 256 472z"] };
var faUserMd = { prefix: 'fal', iconName: 'user-md', icon: [448, 512, [], "f0f0", "M366.769 241.796l-29.779-8.508C357.087 207.959 368 176.82 368 144 368 64.475 303.662 0 224 0 144.475 0 80 64.338 80 144c0 32.82 10.913 63.959 31.01 89.288l-29.779 8.508C19.49 259.437 0 315.585 0 349.487v103.084C0 485.34 26.659 512 59.428 512h329.143c32.77 0 59.429-26.66 59.429-59.429V349.487c0-33.198-18.981-89.905-81.231-107.691zM224 32c61.856 0 112 50.144 112 112s-50.144 112-112 112-112-50.144-112-112S162.144 32 224 32zm-96 320c17.645 0 32 14.355 32 32s-14.355 32-32 32-32-14.355-32-32 14.355-32 32-32zm288 100.571C416 467.72 403.72 480 388.571 480H59.428C44.28 480 32 467.72 32 452.572V349.487c0-35.718 23.678-67.109 58.022-76.922L112 266.286v55.74c-28.495 7.361-49.358 33.905-47.931 64.976 1.505 32.778 28.096 59.393 60.873 60.927C161.616 449.645 192 420.304 192 384c0-29.767-20.427-54.852-48-61.975v-58.242C167.481 279.536 195.089 288 224 288c22.577 0 44.357-5.167 64-14.93v16.54c-36.471 7.433-64 39.756-64 78.39v59.28a12 12 0 0 0 9.647 11.767l31.449 6.29c6.499 1.3 12.821-2.915 14.12-9.414l1.569-7.845c1.3-6.499-2.915-12.82-9.414-14.12L256 410.883v-42.077c0-26.283 20.793-48.297 47.071-48.797C329.961 319.498 352 341.224 352 368v42.883l-15.371 3.074c-6.499 1.3-10.713 7.622-9.414 14.12l1.569 7.845c1.3 6.499 7.622 10.713 14.12 9.414l31.449-6.29A11.999 11.999 0 0 0 384 427.28V368c0-38.634-27.529-70.957-64-78.39v-27.896l37.978 10.851C392.322 282.378 416 313.769 416 349.487v103.084z"] };
var faUserPlus = { prefix: 'fal', iconName: 'user-plus', icon: [640, 512, [], "f234", "M640 252v8c0 6.627-5.373 12-12 12h-68v68c0 6.627-5.373 12-12 12h-8c-6.627 0-12-5.373-12-12v-68h-68c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h68v-68c0-6.627 5.373-12 12-12h8c6.627 0 12 5.373 12 12v68h68c6.627 0 12 5.373 12 12zm-264.942 32.165l-43.497-12.428C355.115 245.342 368 211.663 368 176c0-79.525-64.339-144-144-144-79.525 0-144 64.339-144 144 0 35.663 12.885 69.342 36.439 95.737l-43.497 12.428C17.501 300.005 0 350.424 0 380.866v39.705C0 453.34 26.66 480 59.429 480h329.143C421.34 480 448 453.34 448 420.571v-39.705c0-57.659-43.675-88.339-72.942-96.701zM224 64c61.856 0 112 50.144 112 112s-50.144 112-112 112-112-50.144-112-112S162.144 64 224 64zm192 356.571C416 435.72 403.72 448 388.571 448H59.429C44.28 448 32 435.72 32 420.571v-39.705c0-30.616 20.296-57.522 49.733-65.933l63.712-18.203C168.611 311.87 195.679 320 224 320s55.389-8.13 78.555-23.27l63.712 18.203C395.704 323.344 416 350.251 416 380.866v39.705z"] };
var faUserSecret = { prefix: 'fal', iconName: 'user-secret', icon: [448, 512, [], "f21b", "M391.445 302.635l23.757-62.363c2.992-7.854-2.809-16.272-11.214-16.272H366.79a144.925 144.925 0 0 0-.172-33.471C392.266 182.006 416 167.148 416 140c0-32.907-34.224-47.388-65.583-55.194C335.543 44.808 313.42 0 270.783 0 253.776 0 244.485 6.276 224 16.646 203.489 6.262 194.214.001 177.218 0c-42.621-.002-64.748 44.771-79.636 84.807C66.065 92.652 32 107.105 32 140c0 27.143 23.725 42.003 49.381 50.529A144.924 144.924 0 0 0 81.209 224H44.013c-8.615 0-14.423 8.809-11.029 16.727l25.962 60.58C24.449 319.911 0 356.592 0 400v68c0 24.262 19.738 44 44 44h360c24.262 0 44-19.738 44-44v-68c0-42.292-23.228-78.317-56.555-97.365zM112.402 198.477c18.438 3.637 20.363 2.14 21.946 7.007 3.861 11.864 7.026 24.572 16.514 33.359 7.977 7.387 47.033 25.138 63.996-25.029 2.797-8.279 15.487-8.279 18.285 0 16.039 47.434 53.924 34.357 63.996 25.029 9.488-8.786 12.653-21.495 16.514-33.359 1.582-4.866 3.512-3.371 21.946-7.007C341.137 264.186 289.333 320 224 320c-65.387 0-117.133-55.871-111.598-121.523zM64 140c0-11.19 22.693-21.188 58.289-27.791 7.654-27.68 22.648-55.516 33.928-69.905 7.885-10.058 21.572-13.186 32.893-7.454 38.526 19.504 31.239 19.512 69.78 0 11.332-5.737 25.017-2.593 32.893 7.454 11.28 14.389 26.274 42.225 33.928 69.905C361.307 118.812 384 128.81 384 140c0 47.382-320 47.709-320 0zM44 480c-6.627 0-12-5.373-12-12v-68c0-44.183 35.817-80 80-80 29.431 0 16.825-2.352 34.426 8.983L168 480H44zm148 0l16-96-22.508-37.514c24.457 6.76 51.39 7.083 77.017 0L240 384l16 96h-64zm224-12c0 6.627-5.373 12-12 12H280l21.574-151.017C319.138 317.671 306.592 320 336 320c44.183 0 80 35.817 80 80v68z"] };
var faUserTimes = { prefix: 'fal', iconName: 'user-times', icon: [640, 512, [], "f235", "M625.054 185.289l5.657 5.657c4.686 4.686 4.686 12.284 0 16.971L582.627 256l48.083 48.083c4.686 4.686 4.686 12.284 0 16.971l-5.657 5.657c-4.686 4.686-12.284 4.686-16.971 0L560 278.627l-48.083 48.083c-4.686 4.686-12.284 4.686-16.971 0l-5.657-5.657c-4.686-4.686-4.686-12.284 0-16.971L537.373 256l-48.083-48.083c-4.686-4.686-4.686-12.284 0-16.971l5.657-5.657c4.686-4.686 12.284-4.686 16.971 0L560 233.373l48.083-48.083c4.687-4.687 12.284-4.687 16.971-.001zm-249.996 98.876l-43.497-12.428C355.115 245.342 368 211.663 368 176c0-79.525-64.339-144-144-144-79.525 0-144 64.339-144 144 0 35.663 12.885 69.342 36.439 95.737l-43.497 12.428C17.501 300.005 0 350.424 0 380.866v39.705C0 453.34 26.66 480 59.429 480h329.143C421.34 480 448 453.34 448 420.571v-39.705c0-57.659-43.675-88.339-72.942-96.701zM224 64c61.856 0 112 50.144 112 112s-50.144 112-112 112-112-50.144-112-112S162.144 64 224 64zm192 356.571C416 435.72 403.72 448 388.571 448H59.429C44.28 448 32 435.72 32 420.571v-39.705c0-30.616 20.296-57.522 49.733-65.933l63.712-18.203C168.611 311.87 195.679 320 224 320s55.389-8.13 78.555-23.27l63.712 18.203C395.704 323.344 416 350.251 416 380.866v39.705z"] };
var faUsers = { prefix: 'fal', iconName: 'users', icon: [640, 512, [], "f0c0", "M408.795 244.28C423.843 224.794 432 201.025 432 176c0-61.855-50.043-112-112-112-61.853 0-112 50.041-112 112 0 25.025 8.157 48.794 23.205 68.28-12.93 3.695-71.205 25.768-71.205 92.757v60.677C160 425.442 182.558 448 210.286 448h219.429C457.442 448 480 425.442 480 397.714v-60.677c0-66.985-58.234-89.051-71.205-92.757zM320 96c44.183 0 80 35.817 80 80s-35.817 80-80 80-80-35.817-80-80 35.817-80 80-80zm128 301.714c0 10.099-8.187 18.286-18.286 18.286H210.286C200.187 416 192 407.813 192 397.714v-60.677c0-28.575 18.943-53.688 46.418-61.538l20.213-5.775C276.708 281.614 297.862 288 320 288s43.292-6.386 61.369-18.275l20.213 5.775C429.057 283.35 448 308.462 448 337.037v60.677zm-304 0V384H45.714C38.14 384 32 377.86 32 370.286v-45.508c0-21.431 14.207-40.266 34.813-46.153l12.895-3.684C93.904 283.237 110.405 288 128 288a95.582 95.582 0 0 0 29.234-4.564c5.801-10.547 13.46-20.108 22.904-28.483 9.299-8.247 18.915-14.143 27.098-18.247C197.22 218.209 192 197.557 192 176c0-16.214 2.993-31.962 8.708-46.618C183.09 108.954 157.03 96 128 96c-52.935 0-96 43.065-96 96 0 21.776 7.293 41.878 19.558 58.003C25.677 259.796 0 286.423 0 324.778v45.508C0 395.493 20.507 416 45.714 416h100.871A66.078 66.078 0 0 1 144 397.714zM128 128c35.346 0 64 28.654 64 64s-28.654 64-64 64-64-28.654-64-64 28.654-64 64-64zm460.442 122.003C600.707 233.878 608 213.776 608 192c0-52.935-43.065-96-96-96-29.031 0-55.091 12.955-72.71 33.385C445.006 144.041 448 159.788 448 176c0 21.557-5.219 42.207-15.235 60.704 8.19 4.106 17.812 10.004 27.115 18.256 9.439 8.373 17.094 17.933 22.892 28.478A95.573 95.573 0 0 0 512 288c17.595 0 34.096-4.763 48.292-13.06l12.895 3.684C593.793 284.512 608 303.347 608 324.778v45.508c0 7.574-6.14 13.714-13.714 13.714H496v13.714c0 6.343-.914 12.473-2.585 18.286h100.871C619.493 416 640 395.493 640 370.286v-45.508c0-38.369-25.689-64.987-51.558-74.775zM512 256c-35.346 0-64-28.654-64-64s28.654-64 64-64 64 28.654 64 64-28.654 64-64 64z"] };
var faUtensilFork = { prefix: 'fal', iconName: 'utensil-fork', icon: [512, 512, [], "f2e3", "M458.5 107.1c.4-27.4-27.3-54-53.6-53.6.4-34.4-43.8-68.7-75.3-46.5-8.8 6.1-80.1 55.7-105.2 80.7-42.1 42.1-51.5 97.7-32 145.8L13 395c-16.8 15.1-17.5 41.2-1.5 57.2l48.3 48.3c16.2 16.2 42.3 15 57.2-1.5l161.4-179.2c49 19.8 104.3 9.4 145.8-32 25.1-25.1 74.5-96.4 80.6-105.2 22-31.3-10.2-76-46.3-75.5zm20.2 57s-53.2 77-77.2 101c-38.1 38.1-89.2 41.9-130.4 14.8l-178 197.6c-2.8 3.2-7.7 3.3-10.7.3l-48.3-48.3c-3-3-2.9-7.9.3-10.7l197.6-178c-27.1-41.3-23.2-92.4 14.8-130.4 23.9-23.9 101-77.2 101-77.2 9.2-6.7 30.6 15 23.6 24l-98.6 98.6c-8.5 10 13.3 32.2 23.6 24l105-93.1c9.1-6.5 30.3 14.7 23.8 23.8l-93.1 105c-8.2 10.3 14 32.1 24 23.6l98.6-98.6c9.1-7 30.7 14.4 24 23.6z"] };
var faUtensilKnife = { prefix: 'fal', iconName: 'utensil-knife', icon: [512, 512, [], "f2e4", "M72.9 498.4l-48.3-48.3C7 432.5 6.2 404.5 23.3 387.4l375-375C415.2-4.5 443.4-4 461 13.7c20.8 20.6 40 60.8 40 122.3 0 102.8-67.6 225.8-231.9 205.2L138.1 497c-16.6 19.7-46.7 19.9-65.2 1.4zM421 35L46 410c-4.6 4.6-3.7 12.5 1.3 17.5l48.3 48.3c5.4 5.4 13.8 5.7 18 .7L256.1 307c82.8 12.7 153.2-4 191.3-79.3 14.7-29 21.7-61.4 21.7-91.7 0-48-11.3-80.4-30.6-99.7-5.2-5.2-13-5.8-17.5-1.3z"] };
var faUtensilSpoon = { prefix: 'fal', iconName: 'utensil-spoon', icon: [512, 512, [], "f2e5", "M60.3 499.8l-48.1-48.1C-4.6 435-4 407.4 13.8 391.5L206 219c-22.3-53.2-10.6-111.8 35.2-157.7C303.3-.8 416.7-26 477.3 34.6c60.7 60.7 35.3 174.2-26.7 236.1-45.8 45.9-104.4 57.7-157.6 35.3L120.5 498.2c-15.9 17.7-43.4 18.5-60.2 1.6zM263.8 83.9c-45.7 45.7-44.5 92.6-18.4 142.7L35.2 415.3c-4.1 3.6-4.2 9.9-.4 13.8l48.1 48.1c3.9 3.9 10.2 3.6 13.8-.4l188.7-210.3c49.5 25.8 96.7 27.7 142.7-18.4 49.3-49.4 74-143.7 26.7-191-45.4-45.3-139-25.2-191 26.8z"] };
var faUtensils = { prefix: 'fal', iconName: 'utensils', icon: [480, 512, [], "f2e7", "M344.1 470.3l14.2-164.8c-42.1-33.1-70.4-77-70.4-129.5C288 81.7 376.1 0 440 0c22.1 0 40 17.3 40 38.5v435c0 21.2-17.9 38.5-40 38.5h-56c-22.8 0-41.8-18.7-39.9-41.7zM320 176c0 51 32.2 85.5 71.8 114.5L376 473.1c-.3 3.7 3.4 6.9 8 6.9h56c4.3 0 8-3 8-6.5v-435c0-3.5-3.7-6.5-8-6.5-44.6 0-120 65.8-120 144zM240.7 33.8C237.4 14.3 219.5 0 194.6 0c-11.9 0-24.1 3.4-33.3 11.2C152.9 4.1 141.3 0 128 0s-24.9 4.1-33.3 11.2C85.5 3.4 73.3 0 61.4 0 36.2 0 18.6 14.5 15.3 33.8 13.5 43.2 0 118.4 0 149.9c0 50.9 26.7 91.6 71 110.7L59.6 471.4C58.4 493.4 75.9 512 98 512h60c22 0 39.6-18.5 38.4-40.6L185 260.6c44.2-19.1 71-59.8 71-110.7 0-31.5-13.5-106.7-15.3-116.1zM152.3 240l12.2 233.1c.2 3.7-2.7 6.9-6.5 6.9H98c-3.7 0-6.7-3.1-6.5-6.9L103.7 240C61.3 231.2 32 197 32 149.9c0-29.7 14.8-110.6 14.8-110.6 1.6-9.9 28.3-9.7 29.5.2V162c.9 11.5 28.2 11.7 29.5.2l7.4-122.9c1.6-9.7 27.9-9.7 29.5 0l7.4 122.9c1.3 11.4 28.6 11.2 29.5-.2V39.6c1.2-9.9 27.9-10.1 29.5-.2 0 0 14.8 80.9 14.8 110.6.1 46.8-29 81.2-71.6 90z"] };
var faUtensilsAlt = { prefix: 'fal', iconName: 'utensils-alt', icon: [576, 512, [], "f2e6", "M0 60c0 142.9 69.8 215.8 188.6 226.5L84.2 379.1c-25.8 22.9-27 63-2.6 87.3l28 28c24.6 24.6 64.6 23.1 87.3-2.6L290 386.7c96.3 113.5 89.4 105.4 90.3 106.3 22.9 24.4 61.9 25.7 86.2 1.4l28-28c24.1-24.1 23.2-63.3-1.6-86.4L384.8 279.7l7.2-7.7c38.8 12.1 77.1 7 110.3-26.1 20.9-20.9 61.7-79.7 66.8-87.1 20.1-28.5-7.3-66.8-37.4-70.6-2.8-22.1-23.6-41.5-43.9-44-3.9-31-42.6-57.1-70.6-37.4-7.4 5.1-66.2 46-87.1 66.9C298 105.8 291.4 144 304 184l-11.2 10.3-192-178.2C62.6-19.4 0 7.7 0 60zm379.7 177.2l-18.4 20.7-44.9-41.7 22.5-19.9c-18.8-33-15.4-70.7 13.9-100C372.3 76.7 435.6 33 435.6 33c7.6-5.5 25.1 12.3 19.4 19.7l-81 80.9c-7 8.2 10.9 26.4 19.4 19.7l86.1-76.4c7.4-5.4 24.9 12 19.5 19.5l-76.4 86.1C416 191 434.1 209 442.4 202l80.9-80.9c7.4-5.8 25.2 11.8 19.7 19.4 0 0-43.7 63.2-63.3 82.9-29.6 29.4-67.3 32.4-100 13.8zm-161 65.5l50.4 59.3L173 470.6c-10.7 12-29.3 12.7-40.8 1.2l-28-28c-11.4-11.4-10.8-30.1 1.2-40.8l113.3-100.3zM32 60c0-24.4 29.1-37.2 47.1-20.5l392 364c11.6 10.8 12 29.1.7 40.3l-28 28c-11.2 11.2-29.4 10.9-40.2-.6L221 256C81 256 32 177.2 32 60z"] };
var faVenus = { prefix: 'fal', iconName: 'venus', icon: [288, 512, [], "f221", "M288 176c0-79.5-64.5-144-144-144S0 96.5 0 176c0 74.1 56 135.2 128 143.1V384H76c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h52v52c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-52h52c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12h-52v-64.9c72-7.9 128-69 128-143.1zm-256 0c0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112-61.9 0-112-50-112-112z"] };
var faVenusDouble = { prefix: 'fal', iconName: 'venus-double', icon: [512, 512, [], "f226", "M288 176c0-79.5-64.5-144-144-144S0 96.5 0 176c0 74.1 56 135.2 128 143.1V384H76c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h52v52c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-52h52c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12h-52v-64.9c72-7.9 128-69 128-143.1zm-256 0c0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112-61.9 0-112-50-112-112zm352 143.1V384h52c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12h-52v52c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12v-52h-52c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h52v-64.9c-27.4-3-52.6-13.8-73.2-30 6.9-8.2 13-17 18.3-26.3 19.9 16.3 44.7 25.2 70.8 25.2 62 0 112-50.1 112-112 0-62-50.1-112-112-112-26.1 0-50.9 8.9-70.8 25.2-5.3-9.3-11.4-18.2-18.3-26.3C303.4 43.6 334.3 32 368 32c79.5 0 144 64.5 144 144 0 74.1-56 135.2-128 143.1z"] };
var faVenusMars = { prefix: 'fal', iconName: 'venus-mars', icon: [576, 512, [], "f228", "M288 208c0-79.5-64.5-144-144-144S0 128.5 0 208c0 74.1 56 135.2 128 143.1V416H76c-6.6 0-12 5.4-12 12v8c0 6.6 5.4 12 12 12h52v52c0 6.6 5.4 12 12 12h8c6.6 0 12-5.4 12-12v-52h52c6.6 0 12-5.4 12-12v-8c0-6.6-5.4-12-12-12h-52v-64.9c72-7.9 128-69 128-143.1zm-256 0c0-61.9 50-112 112-112 61.9 0 112 50 112 112 0 61.9-50 112-112 112-61.9 0-112-50-112-112zM576 12v88c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12V54.6l-63.5 63.5C500.2 142.8 512 174 512 208c0 79.5-64.5 144-144 144-33.7 0-64.6-11.6-89.2-30.9 6.9-8.2 13-17 18.3-26.3 19.9 16.3 44.7 25.2 70.8 25.2 62 0 112-50.1 112-112 0-62-50.1-112-112-112-26.1 0-50.9 8.9-70.8 25.2-5.3-9.3-11.4-18.2-18.3-26.3C303.4 75.6 334.3 64 368 64c34 0 65.2 11.8 89.9 31.5L521.4 32H476c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h88c6.6 0 12 5.4 12 12z"] };
var faVideo = { prefix: 'fal', iconName: 'video', icon: [576, 512, [], "f03d", "M528 64h-12.118a48 48 0 0 0-33.941 14.059L384 176v-64c0-26.51-21.49-48-48-48H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48v-64l97.941 97.941A48 48 0 0 0 515.882 448H528c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zM352 400c0 8.823-7.178 16-16 16H48c-8.822 0-16-7.177-16-16V112c0-8.823 7.178-16 16-16h288c8.822 0 16 7.177 16 16v288zm192 0c0 8.823-7.178 16-16 16h-12.118a15.895 15.895 0 0 1-11.314-4.686L384 290.745v-69.49l120.568-120.569A15.895 15.895 0 0 1 515.882 96H528c8.822 0 16 7.177 16 16v288z"] };
var faVolleyballBall = { prefix: 'fal', iconName: 'volleyball-ball', icon: [496, 512, [], "f45f", "M248 8C111.2 8 0 119.2 0 256s111.2 248 248 248 248-111.2 248-248S384.8 8 248 8zm172 378.1c-85.6 22.4-176.5 4.8-247.7-46.9 21.3-25.6 47.1-47.5 76.5-64.8 84.3 47.1 159.8 45.1 207.5 37.9-7.3 27-19.8 52-36.3 73.8zm42.8-107.2c-24.4 4.6-48.9 6.4-73.2 4.9 8.7-81.6-13.6-162.9-61.8-228.3 59.2 23.6 148.2 98.2 135 223.4zM274.4 41.8c62.3 62.9 92.6 150.4 83.4 238.1-32.8-5.6-64.5-17-94.2-33.7-1-72.8-25.7-142.2-70.9-198.9 40.2-10.5 69.3-7 81.7-5.5zM160.5 58.7c16.1 18.8 30 39.1 40.8 60.8C126.4 152.7 67.1 212.7 34.5 287 14 145.8 123.2 75.3 160.5 58.7zM49.2 340.4c23.3-85.5 84-155.6 164.6-191.5 11.5 31.2 17.5 64.4 17.9 98.4-62.6 37.2-110.3 93.5-136.8 160.9-19.2-19.4-34.9-42.3-45.7-67.8zm71.7 89.9c8.1-23.2 18.8-45.2 32.1-65.3 47.5 34.6 125.7 71.9 228.5 60.5-52.5 41.4-160.7 77.9-260.6 4.8z"] };
var faVolumeDown = { prefix: 'fal', iconName: 'volume-down', icon: [384, 512, [], "f027", "M341.86 180.883c-7.538-4.615-17.388-2.239-21.998 5.297-4.612 7.537-2.241 17.387 5.297 21.998C341.966 218.462 352 236.34 352 256s-10.034 37.538-26.841 47.822c-7.538 4.611-9.909 14.461-5.297 21.998 4.611 7.538 14.463 9.909 21.998 5.297C368.247 314.972 384 286.891 384 256s-15.753-58.972-42.14-75.117zM256 88.017v335.964c0 21.436-25.942 31.999-40.971 16.971L126.059 352H24c-13.255 0-24-10.745-24-24V184c0-13.255 10.745-24 24-24h102.059l88.971-88.954C230.037 56.038 256 66.551 256 88.017zm-32 19.311l-77.659 77.644A24.001 24.001 0 0 1 129.372 192H32v128h97.372a24.001 24.001 0 0 1 16.969 7.028L224 404.67V107.328z"] };
var faVolumeMute = { prefix: 'fal', iconName: 'volume-mute', icon: [640, 512, [], "f2e2", "M615.554 509.393L4.534 27.657c-5.188-4.124-6.051-11.673-1.927-16.861l4.978-6.263c4.124-5.188 11.673-6.051 16.861-1.927l611.021 481.736c5.188 4.124 6.051 11.673 1.927 16.861l-4.978 6.263c-4.125 5.189-11.674 6.051-16.862 1.927zM407.172 126.221C450.902 152.963 480 201.134 480 256c0 19.945-3.861 38.996-10.856 56.463l26.002 20.5C505.972 309.488 512 283.404 512 256c0-66.099-34.976-124.573-88.133-157.079-7.538-4.611-17.388-2.235-21.997 5.302-4.61 7.539-2.236 17.387 5.302 21.998zm-171.913 1.844L256 107.328v37.089l32 25.229v-81.63c0-21.466-25.963-31.979-40.97-16.971l-37.075 37.068 25.304 19.952zm221.925-83.804C528.548 87.899 576 166.532 576 256c0 42.442-10.685 82.442-29.529 117.428l25.467 20.078C594.94 352.775 608 305.811 608 256c0-100.587-53.23-189.576-134.123-239.04-7.541-4.61-17.389-2.235-21.997 5.304-4.609 7.539-2.235 17.387 5.304 21.997zM357.159 208.178c13.422 8.213 22.517 21.271 25.639 36.209l32.141 25.341a89.491 89.491 0 0 0 1.06-13.728c0-30.891-15.753-58.972-42.14-75.117-7.538-4.615-17.388-2.239-21.998 5.297-4.611 7.537-2.24 17.386 5.298 21.998zm128.318 239.41a248.52 248.52 0 0 1-28.293 20.151c-7.539 4.609-9.913 14.458-5.304 21.997 4.612 7.544 14.465 9.91 21.997 5.304a280.708 280.708 0 0 0 37.246-27.233l-25.646-20.219zM256 266.666V404.67l-77.659-77.643a24 24 0 0 0-16.969-7.028H64V192h97.296l-40.588-32H56c-13.255 0-24 10.745-24 24v144c0 13.255 10.745 24 24 24h102.059l88.971 88.952c15.029 15.028 40.97 4.465 40.97-16.971V291.895l-32-25.229zm151.123 119.147c-7.498 4.624-9.853 14.443-5.253 21.965 4.611 7.541 14.462 9.911 21.997 5.302a184.087 184.087 0 0 0 9.738-6.387l-26.482-20.88z"] };
var faVolumeOff = { prefix: 'fal', iconName: 'volume-off', icon: [256, 512, [], "f026", "M256 88.017v335.964c0 21.436-25.942 31.999-40.971 16.971L126.059 352H24c-13.255 0-24-10.745-24-24V184c0-13.255 10.745-24 24-24h102.059l88.971-88.954C230.037 56.038 256 66.551 256 88.017zm-32 19.311l-77.659 77.644A24.001 24.001 0 0 1 129.372 192H32v128h97.372a24.001 24.001 0 0 1 16.969 7.028L224 404.67V107.328z"] };
var faVolumeUp = { prefix: 'fal', iconName: 'volume-up', icon: [576, 512, [], "f028", "M576 256c0 100.586-53.229 189.576-134.123 239.04-7.532 4.606-17.385 2.241-21.997-5.304-4.609-7.539-2.235-17.388 5.304-21.997C496.549 424.101 544 345.467 544 256c0-89.468-47.452-168.101-118.816-211.739-7.539-4.609-9.913-14.458-5.304-21.997 4.608-7.539 14.456-9.914 21.997-5.304C522.77 66.424 576 155.413 576 256zm-96 0c0-66.099-34.976-124.572-88.133-157.079-7.538-4.611-17.388-2.235-21.997 5.302-4.61 7.539-2.236 17.388 5.302 21.998C418.902 152.963 448 201.134 448 256c0 54.872-29.103 103.04-72.828 129.779-7.538 4.61-9.912 14.459-5.302 21.998 4.611 7.541 14.462 9.911 21.997 5.302C445.024 380.572 480 322.099 480 256zm-138.14-75.117c-7.538-4.615-17.388-2.239-21.998 5.297-4.612 7.537-2.241 17.387 5.297 21.998C341.966 218.462 352 236.34 352 256s-10.034 37.538-26.841 47.822c-7.538 4.611-9.909 14.461-5.297 21.998 4.611 7.538 14.463 9.909 21.998 5.297C368.247 314.972 384 286.891 384 256s-15.753-58.972-42.14-75.117zM256 88.017v335.964c0 21.436-25.942 31.999-40.971 16.971L126.059 352H24c-13.255 0-24-10.745-24-24V184c0-13.255 10.745-24 24-24h102.059l88.971-88.954C230.037 56.038 256 66.551 256 88.017zm-32 19.311l-77.659 77.644A24.001 24.001 0 0 1 129.372 192H32v128h97.372a24.001 24.001 0 0 1 16.969 7.028L224 404.67V107.328z"] };
var faWatch = { prefix: 'fal', iconName: 'watch', icon: [384, 512, [], "f2e1", "M320 112.9V24c0-13.2-10.8-24-24-24H88C74.8 0 64 10.8 64 24v88.9C24.7 148.1 0 199.1 0 256s24.7 107.9 64 143.1V488c0 13.2 10.8 24 24 24h208c13.2 0 24-10.8 24-24v-88.9c39.3-35.2 64-86.2 64-143.1s-24.7-107.9-64-143.1zM96 32h192v57.7C259.8 73.3 227 64 192 64s-67.8 9.3-96 25.7V32zm192 448H96v-57.7c28.2 16.3 61 25.7 96 25.7s67.8-9.4 96-25.7V480zm-96-64c-88.6 0-160-71.8-160-160S103.5 96 192 96c88.4 0 160 71.6 160 160s-71.6 160-160 160zm49-92.2l-60.1-43.7c-3.1-2.3-4.9-5.9-4.9-9.7V150.3c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v109.9l51.8 37.7c5.4 3.9 6.5 11.4 2.6 16.8l-4.7 6.5c-3.8 5.3-11.3 6.5-16.7 2.6z"] };
var faWheelchair = { prefix: 'fal', iconName: 'wheelchair', icon: [448, 512, [], "f193", "M443.875 396.323l3.151 7.353c2.611 6.092-.211 13.146-6.303 15.757l-42.421 19.273c-7.658 3.284-17.345.3-21.175-8.797L317.376 288H176a16 16 0 0 1-15.839-13.737C125.779 33.586 128.211 51.165 128 48c0-27.13 22.508-49.003 49.87-47.964 24.878.945 45.15 21.216 46.095 46.094C225.004 73.491 203.131 96 176 96c-3.115 0-6.156-.307-9.105-.874L176.162 160H308c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12H180.734l9.143 64H328a16 16 0 0 1 14.746 9.791l57.752 137.159 27.621-12.929c6.091-2.611 13.146.211 15.756 6.302zm-127.488-28.211C301.755 432.107 244.366 480 176 480c-79.401 0-144-64.599-144-144 0-58.714 35.326-109.325 85.836-131.717l-4.671-32.679C47.059 196.957 0 261.081 0 336c0 97.047 78.953 176 176 176 69.906 0 130.418-40.969 158.801-100.155l-18.414-43.733z"] };
var faWhistle = { prefix: 'fal', iconName: 'whistle', icon: [640, 512, [], "f460", "M208 192c-35.3 0-64 28.7-64 64s28.7 72 64 72 70.1-36.7 70.1-72-34.8-64-70.1-64zm0 104c-17.6 0-32-22.4-32-40s14.4-32 32-32 32 14.4 32 32-14.4 40-32 40zm257.7-94.9l-27.4 16.2c-2.9 1.7-6.5 1.4-9.1-.6L404 196.5c-2.6-2.1-3.7-5.7-2.6-8.9l10.2-29.5c2.2-6.4.1-13.5-5.1-17.7l-53.7-43c-41.1-37-94.1-53.3-144.8-53.3-32.7 0-65.3 7.7-95 23.1C100.9 52.8 83.3 44 64.3 44c-35.2 0-64 28.7-64 64 0 19.3 8.8 37.2 23.1 49.1-69 134.6 21.3 310.9 185 310.9 50.7 0 130-19.3 178.9-93L536 461c7 4 19.2 2.2 24-4.3l77-104.3c5.2-6.9 3.5-16.7-3.3-22.1l-149.9-128c-5.2-4.1-12.4-4.6-18.1-1.2zM32 108c0-17.7 14.3-32 32-32 8 0 15.6 3 21.4 8.2-25 18.3-36.9 33.3-45.4 44.9-5.2-5.7-8-13-8-21.1zm513.7 312.6c-2.4 3.2-6.9 4.1-10.4 2.1l-158-90.3c-15 22.6-56.5 103.1-168.6 103.6-44.7.2-88-16.7-120.7-47.2-73-68.2-74.5-191.2-4.4-261.3C116.8 94.3 160.9 76 207.9 76c80 0 113 36.8 170 82.3l-12 34.9c-2.2 6.4-.1 13.5 5.1 17.7l51.4 41.1c5.2 4.2 12.4 4.7 18.2 1.3l32.2-19.1L596 340.7c3.4 2.7 4 7.6 1.4 11l-51.7 68.9z"] };
var faWifi = { prefix: 'fal', iconName: 'wifi', icon: [640, 512, [], "f1eb", "M320 320c-44.18 0-80 35.82-80 80 0 44.185 35.835 80 80 80 44.192 0 80-35.841 80-80 0-44.18-35.82-80-80-80zm0 128c-26.47 0-48-21.53-48-48s21.53-48 48-48 48 21.53 48 48-21.53 48-48 48zm206.658-160.441l-5.526 5.789c-4.464 4.677-11.822 4.963-16.655.669-104.965-93.258-263.794-93.432-368.954 0-4.833 4.294-12.191 4.008-16.655-.669l-5.526-5.789c-4.672-4.894-4.401-12.708.651-17.209 117.175-104.395 294.679-104.539 412.016 0 5.05 4.501 5.321 12.315.649 17.209zm102.397-107.372c-4.585 4.585-11.998 4.714-16.703.253-163.419-154.951-420.626-155.576-584.704 0-4.705 4.461-12.118 4.332-16.703-.253l-5.659-5.659c-4.788-4.788-4.651-12.57.262-17.231 176.175-167.143 452.9-166.983 628.905 0 4.913 4.661 5.05 12.442.262 17.231l-5.66 5.659z"] };
var faWindow = { prefix: 'fal', iconName: 'window', icon: [512, 512, [], "f40e", "M96 160c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm128-32c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.3 32-32zm96 0c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.3 32-32zm192-48v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h416c26.5 0 48 21.5 48 48zm-32 144H32v208c0 8.8 7.2 16 16 16h416c8.8 0 16-7.2 16-16V224zm0-32V80c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v112h448z"] };
var faWindowAlt = { prefix: 'fal', iconName: 'window-alt', icon: [512, 512, [], "f40f", "M224 160c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm128-32c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.3 32-32zm96 0c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.3 32-32zm64-48v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h416c26.5 0 48 21.5 48 48zm-32 144H32v208c0 8.8 7.2 16 16 16h416c8.8 0 16-7.2 16-16V224zm0-32V80c0-8.8-7.2-16-16-16H48c-8.8 0-16 7.2-16 16v112h448z"] };
var faWindowClose = { prefix: 'fal', iconName: 'window-close', icon: [512, 512, [], "f410", "M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h416c8.8 0 16 7.2 16 16v352zM348.6 188.3L280.9 256l67.7 67.7c4.6 4.6 4.6 12 0 16.6l-8.3 8.3c-4.6 4.6-12 4.6-16.6 0L256 280.9l-67.7 67.7c-4.6 4.6-12 4.6-16.6 0l-8.3-8.3c-4.6-4.6-4.6-12 0-16.6l67.7-67.7-67.7-67.7c-4.6-4.6-4.6-12 0-16.6l8.3-8.3c4.6-4.6 12-4.6 16.6 0l67.7 67.7 67.7-67.7c4.6-4.6 12-4.6 16.6 0l8.3 8.3c4.5 4.6 4.5 12 0 16.6z"] };
var faWindowMaximize = { prefix: 'fal', iconName: 'window-maximize', icon: [512, 512, [], "f2d0", "M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm16 400c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V192h448v240zM32 160V80c0-8.8 7.2-16 16-16h416c8.8 0 16 7.2 16 16v80H32z"] };
var faWindowMinimize = { prefix: 'fal', iconName: 'window-minimize', icon: [512, 512, [], "f2d1", "M496 480H16c-8.8 0-16-7.2-16-16s7.2-16 16-16h480c8.8 0 16 7.2 16 16s-7.2 16-16 16z"] };
var faWindowRestore = { prefix: 'fal', iconName: 'window-restore', icon: [512, 512, [], "f2d2", "M464 0H144c-26.5 0-48 21.5-48 48v48H48c-26.5 0-48 21.5-48 48v320c0 26.5 21.5 48 48 48h320c26.5 0 48-21.5 48-48v-48h48c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM32 144c0-8.8 7.2-16 16-16h320c8.8 0 16 7.2 16 16v80H32v-80zm352 320c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V256h352v208zm96-96c0 8.8-7.2 16-16 16h-48V144c0-26.5-21.5-48-48-48H128V48c0-8.8 7.2-16 16-16h320c8.8 0 16 7.2 16 16v320z"] };
var faWonSign = { prefix: 'fal', iconName: 'won-sign', icon: [576, 512, [], "f159", "M564 160c6.627 0 12-5.373 12-12v-16c0-6.627-5.373-12-12-12h-53.813l17.23-72.328c1.797-7.541-3.921-14.781-11.673-14.781h-16.275a11.999 11.999 0 0 0-11.691 9.296L469.781 120H327.096l-18.92-77.94a12 12 0 0 0-11.662-9.169h-18.723a12.001 12.001 0 0 0-11.662 9.169L247.209 120H106.656L89.318 42.278a12 12 0 0 0-11.712-9.387H61.313c-7.722 0-13.434 7.188-11.69 14.71L66.41 120H12c-6.627 0-12 5.373-12 12v16c0 6.627 5.373 12 12 12h63.685l12.984 56H12c-6.627 0-12 5.373-12 12v16c0 6.627 5.373 12 12 12h85.943l49.783 214.71a12 12 0 0 0 11.69 9.29h28.302c5.539 0 10.357-3.79 11.662-9.173L251.463 256h71.378l52.084 214.827A12 12 0 0 0 386.587 480h28.361a12 12 0 0 0 11.673-9.219L477.788 256H564c6.627 0 12-5.373 12-12v-16c0-6.627-5.373-12-12-12h-76.683l13.341-56H564zM286.582 98.399h1.14s1.484 9.036 3.793 21.601h-8.726a1280.842 1280.842 0 0 0 3.793-21.601zM115.579 160h121.919l-13.595 56H128.07l-12.491-56zm68.477 220.147c-5.696 22.896-8.544 47.7-9.114 47.7h-1.139s-3.987-24.804-9.113-47.7L136.995 256h77.199l-30.138 124.147zM261.161 216l12.321-50.82c.405-1.696.808-3.427 1.208-5.18h24.926c.4 1.753.803 3.484 1.208 5.18l12.32 50.82h-51.983zm148.454 164.147c-5.127 22.896-9.113 47.7-9.113 47.7h-1.14c-.569 0-3.418-24.804-9.113-47.7L360.111 256h78.216l-28.712 124.147zM447.579 216h-97.178l-13.595-56H460.53l-12.951 56z"] };
var faWrench = { prefix: 'fal', iconName: 'wrench', icon: [512, 512, [], "f0ad", "M120 416c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24zm370.571-175.976C462.837 287.965 411.014 320 352 320c-14.137 0-28.001-1.828-41.435-5.428L136.568 488.551c-31.267 31.269-81.876 31.263-113.137 0-31.191-31.192-31.191-81.945 0-113.137l173.997-173.979C193.828 188.001 192 174.137 192 160 192 71.614 263.647 0 352 0c58.995 0 110.827 32.019 138.571 79.976C502.908 101.303 487.468 128 462.872 128H353.736l-20 32 20 32h109.136c24.638 0 40.015 26.733 27.699 48.024zm-212.572 61.86c-28.995-15.12-52.791-38.943-67.883-67.883L46.059 398.059c-18.714 18.716-18.714 49.167.001 67.883 18.761 18.761 49.123 18.757 67.882 0l164.057-164.058zM462.872 224H336l-40-64 40-64h126.872C440.74 57.742 399.377 32 352 32c-70.692 0-128 57.308-128 128s57.308 128 128 128c47.377 0 88.74-25.742 110.872-64z"] };
var faYenSign = { prefix: 'fal', iconName: 'yen-sign', icon: [320, 512, [], "f157", "M307.982 32h-22.525a12 12 0 0 0-10.398 6.01l-87.337 153.306c-13.382 25.492-27.402 56.718-27.402 56.718h-1.274s-14.02-31.226-27.403-56.718L45.038 38.042A12 12 0 0 0 34.621 32H12.018c-9.237 0-15.01 9.998-10.394 17.998L100.974 224H44c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h75.442l18.573 32.182V320H44c-6.627 0-12 5.373-12 12v8c0 6.627 5.373 12 12 12h94.014v116c0 6.627 5.373 12 12 12h20.608c6.627 0 12-5.373 12-12V352H276c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-93.377v-31.818l17.7-32.182H276c6.627 0 12-5.373 12-12v-8c0-6.627-5.373-12-12-12h-58.062L318.35 50.042c4.662-8-1.109-18.042-10.368-18.042z"] };
var icons$1 = {
  faAddressBook: faAddressBook,
  faAddressCard: faAddressCard,
  faAdjust: faAdjust,
  faAlarmClock: faAlarmClock,
  faAlignCenter: faAlignCenter,
  faAlignJustify: faAlignJustify,
  faAlignLeft: faAlignLeft,
  faAlignRight: faAlignRight,
  faAmbulance: faAmbulance,
  faAmericanSignLanguageInterpreting: faAmericanSignLanguageInterpreting,
  faAnchor: faAnchor,
  faAngleDoubleDown: faAngleDoubleDown,
  faAngleDoubleLeft: faAngleDoubleLeft,
  faAngleDoubleRight: faAngleDoubleRight,
  faAngleDoubleUp: faAngleDoubleUp,
  faAngleDown: faAngleDown,
  faAngleLeft: faAngleLeft,
  faAngleRight: faAngleRight,
  faAngleUp: faAngleUp,
  faArchive: faArchive,
  faArrowAltCircleDown: faArrowAltCircleDown,
  faArrowAltCircleLeft: faArrowAltCircleLeft,
  faArrowAltCircleRight: faArrowAltCircleRight,
  faArrowAltCircleUp: faArrowAltCircleUp,
  faArrowAltDown: faArrowAltDown,
  faArrowAltFromBottom: faArrowAltFromBottom,
  faArrowAltFromLeft: faArrowAltFromLeft,
  faArrowAltFromRight: faArrowAltFromRight,
  faArrowAltFromTop: faArrowAltFromTop,
  faArrowAltLeft: faArrowAltLeft,
  faArrowAltRight: faArrowAltRight,
  faArrowAltSquareDown: faArrowAltSquareDown,
  faArrowAltSquareLeft: faArrowAltSquareLeft,
  faArrowAltSquareRight: faArrowAltSquareRight,
  faArrowAltSquareUp: faArrowAltSquareUp,
  faArrowAltToBottom: faArrowAltToBottom,
  faArrowAltToLeft: faArrowAltToLeft,
  faArrowAltToRight: faArrowAltToRight,
  faArrowAltToTop: faArrowAltToTop,
  faArrowAltUp: faArrowAltUp,
  faArrowCircleDown: faArrowCircleDown,
  faArrowCircleLeft: faArrowCircleLeft,
  faArrowCircleRight: faArrowCircleRight,
  faArrowCircleUp: faArrowCircleUp,
  faArrowDown: faArrowDown,
  faArrowFromBottom: faArrowFromBottom,
  faArrowFromLeft: faArrowFromLeft,
  faArrowFromRight: faArrowFromRight,
  faArrowFromTop: faArrowFromTop,
  faArrowLeft: faArrowLeft,
  faArrowRight: faArrowRight,
  faArrowSquareDown: faArrowSquareDown,
  faArrowSquareLeft: faArrowSquareLeft,
  faArrowSquareRight: faArrowSquareRight,
  faArrowSquareUp: faArrowSquareUp,
  faArrowToBottom: faArrowToBottom,
  faArrowToLeft: faArrowToLeft,
  faArrowToRight: faArrowToRight,
  faArrowToTop: faArrowToTop,
  faArrowUp: faArrowUp,
  faArrows: faArrows,
  faArrowsAlt: faArrowsAlt,
  faArrowsAltH: faArrowsAltH,
  faArrowsAltV: faArrowsAltV,
  faArrowsH: faArrowsH,
  faArrowsV: faArrowsV,
  faAssistiveListeningSystems: faAssistiveListeningSystems,
  faAsterisk: faAsterisk,
  faAt: faAt,
  faAudioDescription: faAudioDescription,
  faBackward: faBackward,
  faBadge: faBadge,
  faBadgeCheck: faBadgeCheck,
  faBalanceScale: faBalanceScale,
  faBan: faBan,
  faBarcode: faBarcode,
  faBars: faBars,
  faBaseball: faBaseball,
  faBaseballBall: faBaseballBall,
  faBasketballBall: faBasketballBall,
  faBasketballHoop: faBasketballHoop,
  faBath: faBath,
  faBatteryBolt: faBatteryBolt,
  faBatteryEmpty: faBatteryEmpty,
  faBatteryFull: faBatteryFull,
  faBatteryHalf: faBatteryHalf,
  faBatteryQuarter: faBatteryQuarter,
  faBatterySlash: faBatterySlash,
  faBatteryThreeQuarters: faBatteryThreeQuarters,
  faBed: faBed,
  faBeer: faBeer,
  faBell: faBell,
  faBellSlash: faBellSlash,
  faBicycle: faBicycle,
  faBinoculars: faBinoculars,
  faBirthdayCake: faBirthdayCake,
  faBlind: faBlind,
  faBold: faBold,
  faBolt: faBolt,
  faBomb: faBomb,
  faBook: faBook,
  faBookmark: faBookmark,
  faBowlingBall: faBowlingBall,
  faBowlingPins: faBowlingPins,
  faBoxingGlove: faBoxingGlove,
  faBraille: faBraille,
  faBriefcase: faBriefcase,
  faBrowser: faBrowser,
  faBug: faBug,
  faBuilding: faBuilding,
  faBullhorn: faBullhorn,
  faBullseye: faBullseye,
  faBus: faBus,
  faCalculator: faCalculator,
  faCalendar: faCalendar,
  faCalendarAlt: faCalendarAlt,
  faCalendarCheck: faCalendarCheck,
  faCalendarEdit: faCalendarEdit,
  faCalendarExclamation: faCalendarExclamation,
  faCalendarMinus: faCalendarMinus,
  faCalendarPlus: faCalendarPlus,
  faCalendarTimes: faCalendarTimes,
  faCamera: faCamera,
  faCameraAlt: faCameraAlt,
  faCameraRetro: faCameraRetro,
  faCar: faCar,
  faCaretCircleDown: faCaretCircleDown,
  faCaretCircleLeft: faCaretCircleLeft,
  faCaretCircleRight: faCaretCircleRight,
  faCaretCircleUp: faCaretCircleUp,
  faCaretDown: faCaretDown,
  faCaretLeft: faCaretLeft,
  faCaretRight: faCaretRight,
  faCaretSquareDown: faCaretSquareDown,
  faCaretSquareLeft: faCaretSquareLeft,
  faCaretSquareRight: faCaretSquareRight,
  faCaretSquareUp: faCaretSquareUp,
  faCaretUp: faCaretUp,
  faCartArrowDown: faCartArrowDown,
  faCartPlus: faCartPlus,
  faCertificate: faCertificate,
  faChartArea: faChartArea,
  faChartBar: faChartBar,
  faChartLine: faChartLine,
  faChartPie: faChartPie,
  faCheck: faCheck,
  faCheckCircle: faCheckCircle,
  faCheckSquare: faCheckSquare,
  faChess: faChess,
  faChessBishop: faChessBishop,
  faChessBishopAlt: faChessBishopAlt,
  faChessBoard: faChessBoard,
  faChessClock: faChessClock,
  faChessClockAlt: faChessClockAlt,
  faChessKing: faChessKing,
  faChessKingAlt: faChessKingAlt,
  faChessKnight: faChessKnight,
  faChessKnightAlt: faChessKnightAlt,
  faChessPawn: faChessPawn,
  faChessPawnAlt: faChessPawnAlt,
  faChessQueen: faChessQueen,
  faChessQueenAlt: faChessQueenAlt,
  faChessRook: faChessRook,
  faChessRookAlt: faChessRookAlt,
  faChevronCircleDown: faChevronCircleDown,
  faChevronCircleLeft: faChevronCircleLeft,
  faChevronCircleRight: faChevronCircleRight,
  faChevronCircleUp: faChevronCircleUp,
  faChevronDoubleDown: faChevronDoubleDown,
  faChevronDoubleLeft: faChevronDoubleLeft,
  faChevronDoubleRight: faChevronDoubleRight,
  faChevronDoubleUp: faChevronDoubleUp,
  faChevronDown: faChevronDown,
  faChevronLeft: faChevronLeft,
  faChevronRight: faChevronRight,
  faChevronSquareDown: faChevronSquareDown,
  faChevronSquareLeft: faChevronSquareLeft,
  faChevronSquareRight: faChevronSquareRight,
  faChevronSquareUp: faChevronSquareUp,
  faChevronUp: faChevronUp,
  faChild: faChild,
  faCircle: faCircle,
  faCircleNotch: faCircleNotch,
  faClipboard: faClipboard,
  faClock: faClock,
  faClone: faClone,
  faClosedCaptioning: faClosedCaptioning,
  faCloud: faCloud,
  faCloudDownload: faCloudDownload,
  faCloudDownloadAlt: faCloudDownloadAlt,
  faCloudUpload: faCloudUpload,
  faCloudUploadAlt: faCloudUploadAlt,
  faClub: faClub,
  faCode: faCode,
  faCodeBranch: faCodeBranch,
  faCodeCommit: faCodeCommit,
  faCodeMerge: faCodeMerge,
  faCoffee: faCoffee,
  faCog: faCog,
  faCogs: faCogs,
  faColumns: faColumns,
  faComment: faComment,
  faCommentAlt: faCommentAlt,
  faComments: faComments,
  faCompass: faCompass,
  faCompress: faCompress,
  faCompressAlt: faCompressAlt,
  faCompressWide: faCompressWide,
  faCopy: faCopy,
  faCopyright: faCopyright,
  faCreditCard: faCreditCard,
  faCreditCardBlank: faCreditCardBlank,
  faCreditCardFront: faCreditCardFront,
  faCricket: faCricket,
  faCrop: faCrop,
  faCrosshairs: faCrosshairs,
  faCube: faCube,
  faCubes: faCubes,
  faCurling: faCurling,
  faCut: faCut,
  faDatabase: faDatabase,
  faDeaf: faDeaf,
  faDesktop: faDesktop,
  faDesktopAlt: faDesktopAlt,
  faDiamond: faDiamond,
  faDollarSign: faDollarSign,
  faDotCircle: faDotCircle,
  faDownload: faDownload,
  faDumbbell: faDumbbell,
  faEdit: faEdit,
  faEject: faEject,
  faEllipsisH: faEllipsisH,
  faEllipsisHAlt: faEllipsisHAlt,
  faEllipsisV: faEllipsisV,
  faEllipsisVAlt: faEllipsisVAlt,
  faEnvelope: faEnvelope,
  faEnvelopeOpen: faEnvelopeOpen,
  faEnvelopeSquare: faEnvelopeSquare,
  faEraser: faEraser,
  faEuroSign: faEuroSign,
  faExchange: faExchange,
  faExchangeAlt: faExchangeAlt,
  faExclamation: faExclamation,
  faExclamationCircle: faExclamationCircle,
  faExclamationSquare: faExclamationSquare,
  faExclamationTriangle: faExclamationTriangle,
  faExpand: faExpand,
  faExpandAlt: faExpandAlt,
  faExpandArrows: faExpandArrows,
  faExpandArrowsAlt: faExpandArrowsAlt,
  faExpandWide: faExpandWide,
  faExternalLink: faExternalLink,
  faExternalLinkAlt: faExternalLinkAlt,
  faExternalLinkSquare: faExternalLinkSquare,
  faExternalLinkSquareAlt: faExternalLinkSquareAlt,
  faEye: faEye,
  faEyeDropper: faEyeDropper,
  faEyeSlash: faEyeSlash,
  faFastBackward: faFastBackward,
  faFastForward: faFastForward,
  faFax: faFax,
  faFemale: faFemale,
  faFieldHockey: faFieldHockey,
  faFighterJet: faFighterJet,
  faFile: faFile,
  faFileAlt: faFileAlt,
  faFileArchive: faFileArchive,
  faFileAudio: faFileAudio,
  faFileCheck: faFileCheck,
  faFileCode: faFileCode,
  faFileEdit: faFileEdit,
  faFileExcel: faFileExcel,
  faFileExclamation: faFileExclamation,
  faFileImage: faFileImage,
  faFileMinus: faFileMinus,
  faFilePdf: faFilePdf,
  faFilePlus: faFilePlus,
  faFilePowerpoint: faFilePowerpoint,
  faFileTimes: faFileTimes,
  faFileVideo: faFileVideo,
  faFileWord: faFileWord,
  faFilm: faFilm,
  faFilmAlt: faFilmAlt,
  faFilter: faFilter,
  faFire: faFire,
  faFireExtinguisher: faFireExtinguisher,
  faFlag: faFlag,
  faFlagCheckered: faFlagCheckered,
  faFlask: faFlask,
  faFolder: faFolder,
  faFolderOpen: faFolderOpen,
  faFont: faFont,
  faFootballBall: faFootballBall,
  faFootballHelmet: faFootballHelmet,
  faForward: faForward,
  faFrown: faFrown,
  faFutbol: faFutbol,
  faGamepad: faGamepad,
  faGavel: faGavel,
  faGem: faGem,
  faGenderless: faGenderless,
  faGift: faGift,
  faGlassMartini: faGlassMartini,
  faGlobe: faGlobe,
  faGolfBall: faGolfBall,
  faGolfClub: faGolfClub,
  faGraduationCap: faGraduationCap,
  faHSquare: faHSquare,
  faH1: faH1,
  faH2: faH2,
  faH3: faH3,
  faHandLizard: faHandLizard,
  faHandPaper: faHandPaper,
  faHandPeace: faHandPeace,
  faHandPointDown: faHandPointDown,
  faHandPointLeft: faHandPointLeft,
  faHandPointRight: faHandPointRight,
  faHandPointUp: faHandPointUp,
  faHandPointer: faHandPointer,
  faHandRock: faHandRock,
  faHandScissors: faHandScissors,
  faHandSpock: faHandSpock,
  faHandshake: faHandshake,
  faHashtag: faHashtag,
  faHdd: faHdd,
  faHeading: faHeading,
  faHeadphones: faHeadphones,
  faHeart: faHeart,
  faHeartbeat: faHeartbeat,
  faHexagon: faHexagon,
  faHistory: faHistory,
  faHockeyPuck: faHockeyPuck,
  faHockeySticks: faHockeySticks,
  faHome: faHome,
  faHospital: faHospital,
  faHourglass: faHourglass,
  faHourglassEnd: faHourglassEnd,
  faHourglassHalf: faHourglassHalf,
  faHourglassStart: faHourglassStart,
  faICursor: faICursor,
  faIdBadge: faIdBadge,
  faIdCard: faIdCard,
  faImage: faImage,
  faImages: faImages,
  faInbox: faInbox,
  faInboxIn: faInboxIn,
  faInboxOut: faInboxOut,
  faIndent: faIndent,
  faIndustry: faIndustry,
  faIndustryAlt: faIndustryAlt,
  faInfo: faInfo,
  faInfoCircle: faInfoCircle,
  faInfoSquare: faInfoSquare,
  faItalic: faItalic,
  faJackOLantern: faJackOLantern,
  faKey: faKey,
  faKeyboard: faKeyboard,
  faLanguage: faLanguage,
  faLaptop: faLaptop,
  faLeaf: faLeaf,
  faLemon: faLemon,
  faLevelDown: faLevelDown,
  faLevelDownAlt: faLevelDownAlt,
  faLevelUp: faLevelUp,
  faLevelUpAlt: faLevelUpAlt,
  faLifeRing: faLifeRing,
  faLightbulb: faLightbulb,
  faLink: faLink,
  faLiraSign: faLiraSign,
  faList: faList,
  faListAlt: faListAlt,
  faListOl: faListOl,
  faListUl: faListUl,
  faLocationArrow: faLocationArrow,
  faLock: faLock,
  faLockAlt: faLockAlt,
  faLockOpen: faLockOpen,
  faLockOpenAlt: faLockOpenAlt,
  faLongArrowAltDown: faLongArrowAltDown,
  faLongArrowAltLeft: faLongArrowAltLeft,
  faLongArrowAltRight: faLongArrowAltRight,
  faLongArrowAltUp: faLongArrowAltUp,
  faLongArrowDown: faLongArrowDown,
  faLongArrowLeft: faLongArrowLeft,
  faLongArrowRight: faLongArrowRight,
  faLongArrowUp: faLongArrowUp,
  faLowVision: faLowVision,
  faLuchador: faLuchador,
  faMagic: faMagic,
  faMagnet: faMagnet,
  faMale: faMale,
  faMap: faMap,
  faMapMarker: faMapMarker,
  faMapMarkerAlt: faMapMarkerAlt,
  faMapPin: faMapPin,
  faMapSigns: faMapSigns,
  faMars: faMars,
  faMarsDouble: faMarsDouble,
  faMarsStroke: faMarsStroke,
  faMarsStrokeH: faMarsStrokeH,
  faMarsStrokeV: faMarsStrokeV,
  faMedkit: faMedkit,
  faMeh: faMeh,
  faMercury: faMercury,
  faMicrochip: faMicrochip,
  faMicrophone: faMicrophone,
  faMicrophoneAlt: faMicrophoneAlt,
  faMicrophoneSlash: faMicrophoneSlash,
  faMinus: faMinus,
  faMinusCircle: faMinusCircle,
  faMinusHexagon: faMinusHexagon,
  faMinusOctagon: faMinusOctagon,
  faMinusSquare: faMinusSquare,
  faMobile: faMobile,
  faMobileAlt: faMobileAlt,
  faMobileAndroid: faMobileAndroid,
  faMobileAndroidAlt: faMobileAndroidAlt,
  faMoneyBill: faMoneyBill,
  faMoneyBillAlt: faMoneyBillAlt,
  faMoon: faMoon,
  faMotorcycle: faMotorcycle,
  faMousePointer: faMousePointer,
  faMusic: faMusic,
  faNeuter: faNeuter,
  faNewspaper: faNewspaper,
  faObjectGroup: faObjectGroup,
  faObjectUngroup: faObjectUngroup,
  faOctagon: faOctagon,
  faOutdent: faOutdent,
  faPaintBrush: faPaintBrush,
  faPaperPlane: faPaperPlane,
  faPaperclip: faPaperclip,
  faParagraph: faParagraph,
  faPaste: faPaste,
  faPause: faPause,
  faPauseCircle: faPauseCircle,
  faPaw: faPaw,
  faPen: faPen,
  faPenAlt: faPenAlt,
  faPenSquare: faPenSquare,
  faPencil: faPencil,
  faPencilAlt: faPencilAlt,
  faPennant: faPennant,
  faPercent: faPercent,
  faPhone: faPhone,
  faPhoneSlash: faPhoneSlash,
  faPhoneSquare: faPhoneSquare,
  faPhoneVolume: faPhoneVolume,
  faPlane: faPlane,
  faPlaneAlt: faPlaneAlt,
  faPlay: faPlay,
  faPlayCircle: faPlayCircle,
  faPlug: faPlug,
  faPlus: faPlus,
  faPlusCircle: faPlusCircle,
  faPlusHexagon: faPlusHexagon,
  faPlusOctagon: faPlusOctagon,
  faPlusSquare: faPlusSquare,
  faPodcast: faPodcast,
  faPoo: faPoo,
  faPortrait: faPortrait,
  faPoundSign: faPoundSign,
  faPowerOff: faPowerOff,
  faPrint: faPrint,
  faPuzzlePiece: faPuzzlePiece,
  faQrcode: faQrcode,
  faQuestion: faQuestion,
  faQuestionCircle: faQuestionCircle,
  faQuestionSquare: faQuestionSquare,
  faQuidditch: faQuidditch,
  faQuoteLeft: faQuoteLeft,
  faQuoteRight: faQuoteRight,
  faRacquet: faRacquet,
  faRandom: faRandom,
  faRectangleLandscape: faRectangleLandscape,
  faRectanglePortrait: faRectanglePortrait,
  faRectangleWide: faRectangleWide,
  faRecycle: faRecycle,
  faRedo: faRedo,
  faRedoAlt: faRedoAlt,
  faRegistered: faRegistered,
  faRepeat: faRepeat,
  faRepeat1: faRepeat1,
  faRepeat1Alt: faRepeat1Alt,
  faRepeatAlt: faRepeatAlt,
  faReply: faReply,
  faReplyAll: faReplyAll,
  faRetweet: faRetweet,
  faRetweetAlt: faRetweetAlt,
  faRoad: faRoad,
  faRocket: faRocket,
  faRss: faRss,
  faRssSquare: faRssSquare,
  faRubleSign: faRubleSign,
  faRupeeSign: faRupeeSign,
  faSave: faSave,
  faScrubber: faScrubber,
  faSearch: faSearch,
  faSearchMinus: faSearchMinus,
  faSearchPlus: faSearchPlus,
  faServer: faServer,
  faShare: faShare,
  faShareAll: faShareAll,
  faShareAlt: faShareAlt,
  faShareAltSquare: faShareAltSquare,
  faShareSquare: faShareSquare,
  faShekelSign: faShekelSign,
  faShield: faShield,
  faShieldAlt: faShieldAlt,
  faShieldCheck: faShieldCheck,
  faShip: faShip,
  faShoppingBag: faShoppingBag,
  faShoppingBasket: faShoppingBasket,
  faShoppingCart: faShoppingCart,
  faShower: faShower,
  faShuttlecock: faShuttlecock,
  faSignIn: faSignIn,
  faSignInAlt: faSignInAlt,
  faSignLanguage: faSignLanguage,
  faSignOut: faSignOut,
  faSignOutAlt: faSignOutAlt,
  faSignal: faSignal,
  faSitemap: faSitemap,
  faSlidersH: faSlidersH,
  faSlidersHSquare: faSlidersHSquare,
  faSlidersV: faSlidersV,
  faSlidersVSquare: faSlidersVSquare,
  faSmile: faSmile,
  faSnowflake: faSnowflake,
  faSort: faSort,
  faSortAlphaDown: faSortAlphaDown,
  faSortAlphaUp: faSortAlphaUp,
  faSortAmountDown: faSortAmountDown,
  faSortAmountUp: faSortAmountUp,
  faSortDown: faSortDown,
  faSortNumericDown: faSortNumericDown,
  faSortNumericUp: faSortNumericUp,
  faSortUp: faSortUp,
  faSpaceShuttle: faSpaceShuttle,
  faSpade: faSpade,
  faSpinner: faSpinner,
  faSpinnerThird: faSpinnerThird,
  faSquare: faSquare,
  faSquareFull: faSquareFull,
  faStar: faStar,
  faStarExclamation: faStarExclamation,
  faStarHalf: faStarHalf,
  faStepBackward: faStepBackward,
  faStepForward: faStepForward,
  faStethoscope: faStethoscope,
  faStickyNote: faStickyNote,
  faStop: faStop,
  faStopCircle: faStopCircle,
  faStopwatch: faStopwatch,
  faStreetView: faStreetView,
  faStrikethrough: faStrikethrough,
  faSubscript: faSubscript,
  faSubway: faSubway,
  faSuitcase: faSuitcase,
  faSun: faSun,
  faSuperscript: faSuperscript,
  faSync: faSync,
  faSyncAlt: faSyncAlt,
  faTable: faTable,
  faTableTennis: faTableTennis,
  faTablet: faTablet,
  faTabletAlt: faTabletAlt,
  faTabletAndroid: faTabletAndroid,
  faTabletAndroidAlt: faTabletAndroidAlt,
  faTachometer: faTachometer,
  faTachometerAlt: faTachometerAlt,
  faTag: faTag,
  faTags: faTags,
  faTasks: faTasks,
  faTaxi: faTaxi,
  faTennisBall: faTennisBall,
  faTerminal: faTerminal,
  faTextHeight: faTextHeight,
  faTextWidth: faTextWidth,
  faTh: faTh,
  faThLarge: faThLarge,
  faThList: faThList,
  faThermometerEmpty: faThermometerEmpty,
  faThermometerFull: faThermometerFull,
  faThermometerHalf: faThermometerHalf,
  faThermometerQuarter: faThermometerQuarter,
  faThermometerThreeQuarters: faThermometerThreeQuarters,
  faThumbsDown: faThumbsDown,
  faThumbsUp: faThumbsUp,
  faThumbtack: faThumbtack,
  faTicket: faTicket,
  faTicketAlt: faTicketAlt,
  faTimes: faTimes,
  faTimesCircle: faTimesCircle,
  faTimesHexagon: faTimesHexagon,
  faTimesOctagon: faTimesOctagon,
  faTimesSquare: faTimesSquare,
  faTint: faTint,
  faToggleOff: faToggleOff,
  faToggleOn: faToggleOn,
  faTrademark: faTrademark,
  faTrain: faTrain,
  faTransgender: faTransgender,
  faTransgenderAlt: faTransgenderAlt,
  faTrash: faTrash,
  faTrashAlt: faTrashAlt,
  faTree: faTree,
  faTreeAlt: faTreeAlt,
  faTriangle: faTriangle,
  faTrophy: faTrophy,
  faTrophyAlt: faTrophyAlt,
  faTruck: faTruck,
  faTty: faTty,
  faTv: faTv,
  faTvRetro: faTvRetro,
  faUmbrella: faUmbrella,
  faUnderline: faUnderline,
  faUndo: faUndo,
  faUndoAlt: faUndoAlt,
  faUniversalAccess: faUniversalAccess,
  faUniversity: faUniversity,
  faUnlink: faUnlink,
  faUnlock: faUnlock,
  faUnlockAlt: faUnlockAlt,
  faUpload: faUpload,
  faUsdCircle: faUsdCircle,
  faUsdSquare: faUsdSquare,
  faUser: faUser,
  faUserAlt: faUserAlt,
  faUserCircle: faUserCircle,
  faUserMd: faUserMd,
  faUserPlus: faUserPlus,
  faUserSecret: faUserSecret,
  faUserTimes: faUserTimes,
  faUsers: faUsers,
  faUtensilFork: faUtensilFork,
  faUtensilKnife: faUtensilKnife,
  faUtensilSpoon: faUtensilSpoon,
  faUtensils: faUtensils,
  faUtensilsAlt: faUtensilsAlt,
  faVenus: faVenus,
  faVenusDouble: faVenusDouble,
  faVenusMars: faVenusMars,
  faVideo: faVideo,
  faVolleyballBall: faVolleyballBall,
  faVolumeDown: faVolumeDown,
  faVolumeMute: faVolumeMute,
  faVolumeOff: faVolumeOff,
  faVolumeUp: faVolumeUp,
  faWatch: faWatch,
  faWheelchair: faWheelchair,
  faWhistle: faWhistle,
  faWifi: faWifi,
  faWindow: faWindow,
  faWindowAlt: faWindowAlt,
  faWindowClose: faWindowClose,
  faWindowMaximize: faWindowMaximize,
  faWindowMinimize: faWindowMinimize,
  faWindowRestore: faWindowRestore,
  faWonSign: faWonSign,
  faWrench: faWrench,
  faYenSign: faYenSign
};

bunker(function () {
  define('fal', icons$1);
});

exports['default'] = icons$1;
exports.prefix = prefix;
exports.faAddressBook = faAddressBook;
exports.faAddressCard = faAddressCard;
exports.faAdjust = faAdjust;
exports.faAlarmClock = faAlarmClock;
exports.faAlignCenter = faAlignCenter;
exports.faAlignJustify = faAlignJustify;
exports.faAlignLeft = faAlignLeft;
exports.faAlignRight = faAlignRight;
exports.faAmbulance = faAmbulance;
exports.faAmericanSignLanguageInterpreting = faAmericanSignLanguageInterpreting;
exports.faAnchor = faAnchor;
exports.faAngleDoubleDown = faAngleDoubleDown;
exports.faAngleDoubleLeft = faAngleDoubleLeft;
exports.faAngleDoubleRight = faAngleDoubleRight;
exports.faAngleDoubleUp = faAngleDoubleUp;
exports.faAngleDown = faAngleDown;
exports.faAngleLeft = faAngleLeft;
exports.faAngleRight = faAngleRight;
exports.faAngleUp = faAngleUp;
exports.faArchive = faArchive;
exports.faArrowAltCircleDown = faArrowAltCircleDown;
exports.faArrowAltCircleLeft = faArrowAltCircleLeft;
exports.faArrowAltCircleRight = faArrowAltCircleRight;
exports.faArrowAltCircleUp = faArrowAltCircleUp;
exports.faArrowAltDown = faArrowAltDown;
exports.faArrowAltFromBottom = faArrowAltFromBottom;
exports.faArrowAltFromLeft = faArrowAltFromLeft;
exports.faArrowAltFromRight = faArrowAltFromRight;
exports.faArrowAltFromTop = faArrowAltFromTop;
exports.faArrowAltLeft = faArrowAltLeft;
exports.faArrowAltRight = faArrowAltRight;
exports.faArrowAltSquareDown = faArrowAltSquareDown;
exports.faArrowAltSquareLeft = faArrowAltSquareLeft;
exports.faArrowAltSquareRight = faArrowAltSquareRight;
exports.faArrowAltSquareUp = faArrowAltSquareUp;
exports.faArrowAltToBottom = faArrowAltToBottom;
exports.faArrowAltToLeft = faArrowAltToLeft;
exports.faArrowAltToRight = faArrowAltToRight;
exports.faArrowAltToTop = faArrowAltToTop;
exports.faArrowAltUp = faArrowAltUp;
exports.faArrowCircleDown = faArrowCircleDown;
exports.faArrowCircleLeft = faArrowCircleLeft;
exports.faArrowCircleRight = faArrowCircleRight;
exports.faArrowCircleUp = faArrowCircleUp;
exports.faArrowDown = faArrowDown;
exports.faArrowFromBottom = faArrowFromBottom;
exports.faArrowFromLeft = faArrowFromLeft;
exports.faArrowFromRight = faArrowFromRight;
exports.faArrowFromTop = faArrowFromTop;
exports.faArrowLeft = faArrowLeft;
exports.faArrowRight = faArrowRight;
exports.faArrowSquareDown = faArrowSquareDown;
exports.faArrowSquareLeft = faArrowSquareLeft;
exports.faArrowSquareRight = faArrowSquareRight;
exports.faArrowSquareUp = faArrowSquareUp;
exports.faArrowToBottom = faArrowToBottom;
exports.faArrowToLeft = faArrowToLeft;
exports.faArrowToRight = faArrowToRight;
exports.faArrowToTop = faArrowToTop;
exports.faArrowUp = faArrowUp;
exports.faArrows = faArrows;
exports.faArrowsAlt = faArrowsAlt;
exports.faArrowsAltH = faArrowsAltH;
exports.faArrowsAltV = faArrowsAltV;
exports.faArrowsH = faArrowsH;
exports.faArrowsV = faArrowsV;
exports.faAssistiveListeningSystems = faAssistiveListeningSystems;
exports.faAsterisk = faAsterisk;
exports.faAt = faAt;
exports.faAudioDescription = faAudioDescription;
exports.faBackward = faBackward;
exports.faBadge = faBadge;
exports.faBadgeCheck = faBadgeCheck;
exports.faBalanceScale = faBalanceScale;
exports.faBan = faBan;
exports.faBarcode = faBarcode;
exports.faBars = faBars;
exports.faBaseball = faBaseball;
exports.faBaseballBall = faBaseballBall;
exports.faBasketballBall = faBasketballBall;
exports.faBasketballHoop = faBasketballHoop;
exports.faBath = faBath;
exports.faBatteryBolt = faBatteryBolt;
exports.faBatteryEmpty = faBatteryEmpty;
exports.faBatteryFull = faBatteryFull;
exports.faBatteryHalf = faBatteryHalf;
exports.faBatteryQuarter = faBatteryQuarter;
exports.faBatterySlash = faBatterySlash;
exports.faBatteryThreeQuarters = faBatteryThreeQuarters;
exports.faBed = faBed;
exports.faBeer = faBeer;
exports.faBell = faBell;
exports.faBellSlash = faBellSlash;
exports.faBicycle = faBicycle;
exports.faBinoculars = faBinoculars;
exports.faBirthdayCake = faBirthdayCake;
exports.faBlind = faBlind;
exports.faBold = faBold;
exports.faBolt = faBolt;
exports.faBomb = faBomb;
exports.faBook = faBook;
exports.faBookmark = faBookmark;
exports.faBowlingBall = faBowlingBall;
exports.faBowlingPins = faBowlingPins;
exports.faBoxingGlove = faBoxingGlove;
exports.faBraille = faBraille;
exports.faBriefcase = faBriefcase;
exports.faBrowser = faBrowser;
exports.faBug = faBug;
exports.faBuilding = faBuilding;
exports.faBullhorn = faBullhorn;
exports.faBullseye = faBullseye;
exports.faBus = faBus;
exports.faCalculator = faCalculator;
exports.faCalendar = faCalendar;
exports.faCalendarAlt = faCalendarAlt;
exports.faCalendarCheck = faCalendarCheck;
exports.faCalendarEdit = faCalendarEdit;
exports.faCalendarExclamation = faCalendarExclamation;
exports.faCalendarMinus = faCalendarMinus;
exports.faCalendarPlus = faCalendarPlus;
exports.faCalendarTimes = faCalendarTimes;
exports.faCamera = faCamera;
exports.faCameraAlt = faCameraAlt;
exports.faCameraRetro = faCameraRetro;
exports.faCar = faCar;
exports.faCaretCircleDown = faCaretCircleDown;
exports.faCaretCircleLeft = faCaretCircleLeft;
exports.faCaretCircleRight = faCaretCircleRight;
exports.faCaretCircleUp = faCaretCircleUp;
exports.faCaretDown = faCaretDown;
exports.faCaretLeft = faCaretLeft;
exports.faCaretRight = faCaretRight;
exports.faCaretSquareDown = faCaretSquareDown;
exports.faCaretSquareLeft = faCaretSquareLeft;
exports.faCaretSquareRight = faCaretSquareRight;
exports.faCaretSquareUp = faCaretSquareUp;
exports.faCaretUp = faCaretUp;
exports.faCartArrowDown = faCartArrowDown;
exports.faCartPlus = faCartPlus;
exports.faCertificate = faCertificate;
exports.faChartArea = faChartArea;
exports.faChartBar = faChartBar;
exports.faChartLine = faChartLine;
exports.faChartPie = faChartPie;
exports.faCheck = faCheck;
exports.faCheckCircle = faCheckCircle;
exports.faCheckSquare = faCheckSquare;
exports.faChess = faChess;
exports.faChessBishop = faChessBishop;
exports.faChessBishopAlt = faChessBishopAlt;
exports.faChessBoard = faChessBoard;
exports.faChessClock = faChessClock;
exports.faChessClockAlt = faChessClockAlt;
exports.faChessKing = faChessKing;
exports.faChessKingAlt = faChessKingAlt;
exports.faChessKnight = faChessKnight;
exports.faChessKnightAlt = faChessKnightAlt;
exports.faChessPawn = faChessPawn;
exports.faChessPawnAlt = faChessPawnAlt;
exports.faChessQueen = faChessQueen;
exports.faChessQueenAlt = faChessQueenAlt;
exports.faChessRook = faChessRook;
exports.faChessRookAlt = faChessRookAlt;
exports.faChevronCircleDown = faChevronCircleDown;
exports.faChevronCircleLeft = faChevronCircleLeft;
exports.faChevronCircleRight = faChevronCircleRight;
exports.faChevronCircleUp = faChevronCircleUp;
exports.faChevronDoubleDown = faChevronDoubleDown;
exports.faChevronDoubleLeft = faChevronDoubleLeft;
exports.faChevronDoubleRight = faChevronDoubleRight;
exports.faChevronDoubleUp = faChevronDoubleUp;
exports.faChevronDown = faChevronDown;
exports.faChevronLeft = faChevronLeft;
exports.faChevronRight = faChevronRight;
exports.faChevronSquareDown = faChevronSquareDown;
exports.faChevronSquareLeft = faChevronSquareLeft;
exports.faChevronSquareRight = faChevronSquareRight;
exports.faChevronSquareUp = faChevronSquareUp;
exports.faChevronUp = faChevronUp;
exports.faChild = faChild;
exports.faCircle = faCircle;
exports.faCircleNotch = faCircleNotch;
exports.faClipboard = faClipboard;
exports.faClock = faClock;
exports.faClone = faClone;
exports.faClosedCaptioning = faClosedCaptioning;
exports.faCloud = faCloud;
exports.faCloudDownload = faCloudDownload;
exports.faCloudDownloadAlt = faCloudDownloadAlt;
exports.faCloudUpload = faCloudUpload;
exports.faCloudUploadAlt = faCloudUploadAlt;
exports.faClub = faClub;
exports.faCode = faCode;
exports.faCodeBranch = faCodeBranch;
exports.faCodeCommit = faCodeCommit;
exports.faCodeMerge = faCodeMerge;
exports.faCoffee = faCoffee;
exports.faCog = faCog;
exports.faCogs = faCogs;
exports.faColumns = faColumns;
exports.faComment = faComment;
exports.faCommentAlt = faCommentAlt;
exports.faComments = faComments;
exports.faCompass = faCompass;
exports.faCompress = faCompress;
exports.faCompressAlt = faCompressAlt;
exports.faCompressWide = faCompressWide;
exports.faCopy = faCopy;
exports.faCopyright = faCopyright;
exports.faCreditCard = faCreditCard;
exports.faCreditCardBlank = faCreditCardBlank;
exports.faCreditCardFront = faCreditCardFront;
exports.faCricket = faCricket;
exports.faCrop = faCrop;
exports.faCrosshairs = faCrosshairs;
exports.faCube = faCube;
exports.faCubes = faCubes;
exports.faCurling = faCurling;
exports.faCut = faCut;
exports.faDatabase = faDatabase;
exports.faDeaf = faDeaf;
exports.faDesktop = faDesktop;
exports.faDesktopAlt = faDesktopAlt;
exports.faDiamond = faDiamond;
exports.faDollarSign = faDollarSign;
exports.faDotCircle = faDotCircle;
exports.faDownload = faDownload;
exports.faDumbbell = faDumbbell;
exports.faEdit = faEdit;
exports.faEject = faEject;
exports.faEllipsisH = faEllipsisH;
exports.faEllipsisHAlt = faEllipsisHAlt;
exports.faEllipsisV = faEllipsisV;
exports.faEllipsisVAlt = faEllipsisVAlt;
exports.faEnvelope = faEnvelope;
exports.faEnvelopeOpen = faEnvelopeOpen;
exports.faEnvelopeSquare = faEnvelopeSquare;
exports.faEraser = faEraser;
exports.faEuroSign = faEuroSign;
exports.faExchange = faExchange;
exports.faExchangeAlt = faExchangeAlt;
exports.faExclamation = faExclamation;
exports.faExclamationCircle = faExclamationCircle;
exports.faExclamationSquare = faExclamationSquare;
exports.faExclamationTriangle = faExclamationTriangle;
exports.faExpand = faExpand;
exports.faExpandAlt = faExpandAlt;
exports.faExpandArrows = faExpandArrows;
exports.faExpandArrowsAlt = faExpandArrowsAlt;
exports.faExpandWide = faExpandWide;
exports.faExternalLink = faExternalLink;
exports.faExternalLinkAlt = faExternalLinkAlt;
exports.faExternalLinkSquare = faExternalLinkSquare;
exports.faExternalLinkSquareAlt = faExternalLinkSquareAlt;
exports.faEye = faEye;
exports.faEyeDropper = faEyeDropper;
exports.faEyeSlash = faEyeSlash;
exports.faFastBackward = faFastBackward;
exports.faFastForward = faFastForward;
exports.faFax = faFax;
exports.faFemale = faFemale;
exports.faFieldHockey = faFieldHockey;
exports.faFighterJet = faFighterJet;
exports.faFile = faFile;
exports.faFileAlt = faFileAlt;
exports.faFileArchive = faFileArchive;
exports.faFileAudio = faFileAudio;
exports.faFileCheck = faFileCheck;
exports.faFileCode = faFileCode;
exports.faFileEdit = faFileEdit;
exports.faFileExcel = faFileExcel;
exports.faFileExclamation = faFileExclamation;
exports.faFileImage = faFileImage;
exports.faFileMinus = faFileMinus;
exports.faFilePdf = faFilePdf;
exports.faFilePlus = faFilePlus;
exports.faFilePowerpoint = faFilePowerpoint;
exports.faFileTimes = faFileTimes;
exports.faFileVideo = faFileVideo;
exports.faFileWord = faFileWord;
exports.faFilm = faFilm;
exports.faFilmAlt = faFilmAlt;
exports.faFilter = faFilter;
exports.faFire = faFire;
exports.faFireExtinguisher = faFireExtinguisher;
exports.faFlag = faFlag;
exports.faFlagCheckered = faFlagCheckered;
exports.faFlask = faFlask;
exports.faFolder = faFolder;
exports.faFolderOpen = faFolderOpen;
exports.faFont = faFont;
exports.faFootballBall = faFootballBall;
exports.faFootballHelmet = faFootballHelmet;
exports.faForward = faForward;
exports.faFrown = faFrown;
exports.faFutbol = faFutbol;
exports.faGamepad = faGamepad;
exports.faGavel = faGavel;
exports.faGem = faGem;
exports.faGenderless = faGenderless;
exports.faGift = faGift;
exports.faGlassMartini = faGlassMartini;
exports.faGlobe = faGlobe;
exports.faGolfBall = faGolfBall;
exports.faGolfClub = faGolfClub;
exports.faGraduationCap = faGraduationCap;
exports.faHSquare = faHSquare;
exports.faH1 = faH1;
exports.faH2 = faH2;
exports.faH3 = faH3;
exports.faHandLizard = faHandLizard;
exports.faHandPaper = faHandPaper;
exports.faHandPeace = faHandPeace;
exports.faHandPointDown = faHandPointDown;
exports.faHandPointLeft = faHandPointLeft;
exports.faHandPointRight = faHandPointRight;
exports.faHandPointUp = faHandPointUp;
exports.faHandPointer = faHandPointer;
exports.faHandRock = faHandRock;
exports.faHandScissors = faHandScissors;
exports.faHandSpock = faHandSpock;
exports.faHandshake = faHandshake;
exports.faHashtag = faHashtag;
exports.faHdd = faHdd;
exports.faHeading = faHeading;
exports.faHeadphones = faHeadphones;
exports.faHeart = faHeart;
exports.faHeartbeat = faHeartbeat;
exports.faHexagon = faHexagon;
exports.faHistory = faHistory;
exports.faHockeyPuck = faHockeyPuck;
exports.faHockeySticks = faHockeySticks;
exports.faHome = faHome;
exports.faHospital = faHospital;
exports.faHourglass = faHourglass;
exports.faHourglassEnd = faHourglassEnd;
exports.faHourglassHalf = faHourglassHalf;
exports.faHourglassStart = faHourglassStart;
exports.faICursor = faICursor;
exports.faIdBadge = faIdBadge;
exports.faIdCard = faIdCard;
exports.faImage = faImage;
exports.faImages = faImages;
exports.faInbox = faInbox;
exports.faInboxIn = faInboxIn;
exports.faInboxOut = faInboxOut;
exports.faIndent = faIndent;
exports.faIndustry = faIndustry;
exports.faIndustryAlt = faIndustryAlt;
exports.faInfo = faInfo;
exports.faInfoCircle = faInfoCircle;
exports.faInfoSquare = faInfoSquare;
exports.faItalic = faItalic;
exports.faJackOLantern = faJackOLantern;
exports.faKey = faKey;
exports.faKeyboard = faKeyboard;
exports.faLanguage = faLanguage;
exports.faLaptop = faLaptop;
exports.faLeaf = faLeaf;
exports.faLemon = faLemon;
exports.faLevelDown = faLevelDown;
exports.faLevelDownAlt = faLevelDownAlt;
exports.faLevelUp = faLevelUp;
exports.faLevelUpAlt = faLevelUpAlt;
exports.faLifeRing = faLifeRing;
exports.faLightbulb = faLightbulb;
exports.faLink = faLink;
exports.faLiraSign = faLiraSign;
exports.faList = faList;
exports.faListAlt = faListAlt;
exports.faListOl = faListOl;
exports.faListUl = faListUl;
exports.faLocationArrow = faLocationArrow;
exports.faLock = faLock;
exports.faLockAlt = faLockAlt;
exports.faLockOpen = faLockOpen;
exports.faLockOpenAlt = faLockOpenAlt;
exports.faLongArrowAltDown = faLongArrowAltDown;
exports.faLongArrowAltLeft = faLongArrowAltLeft;
exports.faLongArrowAltRight = faLongArrowAltRight;
exports.faLongArrowAltUp = faLongArrowAltUp;
exports.faLongArrowDown = faLongArrowDown;
exports.faLongArrowLeft = faLongArrowLeft;
exports.faLongArrowRight = faLongArrowRight;
exports.faLongArrowUp = faLongArrowUp;
exports.faLowVision = faLowVision;
exports.faLuchador = faLuchador;
exports.faMagic = faMagic;
exports.faMagnet = faMagnet;
exports.faMale = faMale;
exports.faMap = faMap;
exports.faMapMarker = faMapMarker;
exports.faMapMarkerAlt = faMapMarkerAlt;
exports.faMapPin = faMapPin;
exports.faMapSigns = faMapSigns;
exports.faMars = faMars;
exports.faMarsDouble = faMarsDouble;
exports.faMarsStroke = faMarsStroke;
exports.faMarsStrokeH = faMarsStrokeH;
exports.faMarsStrokeV = faMarsStrokeV;
exports.faMedkit = faMedkit;
exports.faMeh = faMeh;
exports.faMercury = faMercury;
exports.faMicrochip = faMicrochip;
exports.faMicrophone = faMicrophone;
exports.faMicrophoneAlt = faMicrophoneAlt;
exports.faMicrophoneSlash = faMicrophoneSlash;
exports.faMinus = faMinus;
exports.faMinusCircle = faMinusCircle;
exports.faMinusHexagon = faMinusHexagon;
exports.faMinusOctagon = faMinusOctagon;
exports.faMinusSquare = faMinusSquare;
exports.faMobile = faMobile;
exports.faMobileAlt = faMobileAlt;
exports.faMobileAndroid = faMobileAndroid;
exports.faMobileAndroidAlt = faMobileAndroidAlt;
exports.faMoneyBill = faMoneyBill;
exports.faMoneyBillAlt = faMoneyBillAlt;
exports.faMoon = faMoon;
exports.faMotorcycle = faMotorcycle;
exports.faMousePointer = faMousePointer;
exports.faMusic = faMusic;
exports.faNeuter = faNeuter;
exports.faNewspaper = faNewspaper;
exports.faObjectGroup = faObjectGroup;
exports.faObjectUngroup = faObjectUngroup;
exports.faOctagon = faOctagon;
exports.faOutdent = faOutdent;
exports.faPaintBrush = faPaintBrush;
exports.faPaperPlane = faPaperPlane;
exports.faPaperclip = faPaperclip;
exports.faParagraph = faParagraph;
exports.faPaste = faPaste;
exports.faPause = faPause;
exports.faPauseCircle = faPauseCircle;
exports.faPaw = faPaw;
exports.faPen = faPen;
exports.faPenAlt = faPenAlt;
exports.faPenSquare = faPenSquare;
exports.faPencil = faPencil;
exports.faPencilAlt = faPencilAlt;
exports.faPennant = faPennant;
exports.faPercent = faPercent;
exports.faPhone = faPhone;
exports.faPhoneSlash = faPhoneSlash;
exports.faPhoneSquare = faPhoneSquare;
exports.faPhoneVolume = faPhoneVolume;
exports.faPlane = faPlane;
exports.faPlaneAlt = faPlaneAlt;
exports.faPlay = faPlay;
exports.faPlayCircle = faPlayCircle;
exports.faPlug = faPlug;
exports.faPlus = faPlus;
exports.faPlusCircle = faPlusCircle;
exports.faPlusHexagon = faPlusHexagon;
exports.faPlusOctagon = faPlusOctagon;
exports.faPlusSquare = faPlusSquare;
exports.faPodcast = faPodcast;
exports.faPoo = faPoo;
exports.faPortrait = faPortrait;
exports.faPoundSign = faPoundSign;
exports.faPowerOff = faPowerOff;
exports.faPrint = faPrint;
exports.faPuzzlePiece = faPuzzlePiece;
exports.faQrcode = faQrcode;
exports.faQuestion = faQuestion;
exports.faQuestionCircle = faQuestionCircle;
exports.faQuestionSquare = faQuestionSquare;
exports.faQuidditch = faQuidditch;
exports.faQuoteLeft = faQuoteLeft;
exports.faQuoteRight = faQuoteRight;
exports.faRacquet = faRacquet;
exports.faRandom = faRandom;
exports.faRectangleLandscape = faRectangleLandscape;
exports.faRectanglePortrait = faRectanglePortrait;
exports.faRectangleWide = faRectangleWide;
exports.faRecycle = faRecycle;
exports.faRedo = faRedo;
exports.faRedoAlt = faRedoAlt;
exports.faRegistered = faRegistered;
exports.faRepeat = faRepeat;
exports.faRepeat1 = faRepeat1;
exports.faRepeat1Alt = faRepeat1Alt;
exports.faRepeatAlt = faRepeatAlt;
exports.faReply = faReply;
exports.faReplyAll = faReplyAll;
exports.faRetweet = faRetweet;
exports.faRetweetAlt = faRetweetAlt;
exports.faRoad = faRoad;
exports.faRocket = faRocket;
exports.faRss = faRss;
exports.faRssSquare = faRssSquare;
exports.faRubleSign = faRubleSign;
exports.faRupeeSign = faRupeeSign;
exports.faSave = faSave;
exports.faScrubber = faScrubber;
exports.faSearch = faSearch;
exports.faSearchMinus = faSearchMinus;
exports.faSearchPlus = faSearchPlus;
exports.faServer = faServer;
exports.faShare = faShare;
exports.faShareAll = faShareAll;
exports.faShareAlt = faShareAlt;
exports.faShareAltSquare = faShareAltSquare;
exports.faShareSquare = faShareSquare;
exports.faShekelSign = faShekelSign;
exports.faShield = faShield;
exports.faShieldAlt = faShieldAlt;
exports.faShieldCheck = faShieldCheck;
exports.faShip = faShip;
exports.faShoppingBag = faShoppingBag;
exports.faShoppingBasket = faShoppingBasket;
exports.faShoppingCart = faShoppingCart;
exports.faShower = faShower;
exports.faShuttlecock = faShuttlecock;
exports.faSignIn = faSignIn;
exports.faSignInAlt = faSignInAlt;
exports.faSignLanguage = faSignLanguage;
exports.faSignOut = faSignOut;
exports.faSignOutAlt = faSignOutAlt;
exports.faSignal = faSignal;
exports.faSitemap = faSitemap;
exports.faSlidersH = faSlidersH;
exports.faSlidersHSquare = faSlidersHSquare;
exports.faSlidersV = faSlidersV;
exports.faSlidersVSquare = faSlidersVSquare;
exports.faSmile = faSmile;
exports.faSnowflake = faSnowflake;
exports.faSort = faSort;
exports.faSortAlphaDown = faSortAlphaDown;
exports.faSortAlphaUp = faSortAlphaUp;
exports.faSortAmountDown = faSortAmountDown;
exports.faSortAmountUp = faSortAmountUp;
exports.faSortDown = faSortDown;
exports.faSortNumericDown = faSortNumericDown;
exports.faSortNumericUp = faSortNumericUp;
exports.faSortUp = faSortUp;
exports.faSpaceShuttle = faSpaceShuttle;
exports.faSpade = faSpade;
exports.faSpinner = faSpinner;
exports.faSpinnerThird = faSpinnerThird;
exports.faSquare = faSquare;
exports.faSquareFull = faSquareFull;
exports.faStar = faStar;
exports.faStarExclamation = faStarExclamation;
exports.faStarHalf = faStarHalf;
exports.faStepBackward = faStepBackward;
exports.faStepForward = faStepForward;
exports.faStethoscope = faStethoscope;
exports.faStickyNote = faStickyNote;
exports.faStop = faStop;
exports.faStopCircle = faStopCircle;
exports.faStopwatch = faStopwatch;
exports.faStreetView = faStreetView;
exports.faStrikethrough = faStrikethrough;
exports.faSubscript = faSubscript;
exports.faSubway = faSubway;
exports.faSuitcase = faSuitcase;
exports.faSun = faSun;
exports.faSuperscript = faSuperscript;
exports.faSync = faSync;
exports.faSyncAlt = faSyncAlt;
exports.faTable = faTable;
exports.faTableTennis = faTableTennis;
exports.faTablet = faTablet;
exports.faTabletAlt = faTabletAlt;
exports.faTabletAndroid = faTabletAndroid;
exports.faTabletAndroidAlt = faTabletAndroidAlt;
exports.faTachometer = faTachometer;
exports.faTachometerAlt = faTachometerAlt;
exports.faTag = faTag;
exports.faTags = faTags;
exports.faTasks = faTasks;
exports.faTaxi = faTaxi;
exports.faTennisBall = faTennisBall;
exports.faTerminal = faTerminal;
exports.faTextHeight = faTextHeight;
exports.faTextWidth = faTextWidth;
exports.faTh = faTh;
exports.faThLarge = faThLarge;
exports.faThList = faThList;
exports.faThermometerEmpty = faThermometerEmpty;
exports.faThermometerFull = faThermometerFull;
exports.faThermometerHalf = faThermometerHalf;
exports.faThermometerQuarter = faThermometerQuarter;
exports.faThermometerThreeQuarters = faThermometerThreeQuarters;
exports.faThumbsDown = faThumbsDown;
exports.faThumbsUp = faThumbsUp;
exports.faThumbtack = faThumbtack;
exports.faTicket = faTicket;
exports.faTicketAlt = faTicketAlt;
exports.faTimes = faTimes;
exports.faTimesCircle = faTimesCircle;
exports.faTimesHexagon = faTimesHexagon;
exports.faTimesOctagon = faTimesOctagon;
exports.faTimesSquare = faTimesSquare;
exports.faTint = faTint;
exports.faToggleOff = faToggleOff;
exports.faToggleOn = faToggleOn;
exports.faTrademark = faTrademark;
exports.faTrain = faTrain;
exports.faTransgender = faTransgender;
exports.faTransgenderAlt = faTransgenderAlt;
exports.faTrash = faTrash;
exports.faTrashAlt = faTrashAlt;
exports.faTree = faTree;
exports.faTreeAlt = faTreeAlt;
exports.faTriangle = faTriangle;
exports.faTrophy = faTrophy;
exports.faTrophyAlt = faTrophyAlt;
exports.faTruck = faTruck;
exports.faTty = faTty;
exports.faTv = faTv;
exports.faTvRetro = faTvRetro;
exports.faUmbrella = faUmbrella;
exports.faUnderline = faUnderline;
exports.faUndo = faUndo;
exports.faUndoAlt = faUndoAlt;
exports.faUniversalAccess = faUniversalAccess;
exports.faUniversity = faUniversity;
exports.faUnlink = faUnlink;
exports.faUnlock = faUnlock;
exports.faUnlockAlt = faUnlockAlt;
exports.faUpload = faUpload;
exports.faUsdCircle = faUsdCircle;
exports.faUsdSquare = faUsdSquare;
exports.faUser = faUser;
exports.faUserAlt = faUserAlt;
exports.faUserCircle = faUserCircle;
exports.faUserMd = faUserMd;
exports.faUserPlus = faUserPlus;
exports.faUserSecret = faUserSecret;
exports.faUserTimes = faUserTimes;
exports.faUsers = faUsers;
exports.faUtensilFork = faUtensilFork;
exports.faUtensilKnife = faUtensilKnife;
exports.faUtensilSpoon = faUtensilSpoon;
exports.faUtensils = faUtensils;
exports.faUtensilsAlt = faUtensilsAlt;
exports.faVenus = faVenus;
exports.faVenusDouble = faVenusDouble;
exports.faVenusMars = faVenusMars;
exports.faVideo = faVideo;
exports.faVolleyballBall = faVolleyballBall;
exports.faVolumeDown = faVolumeDown;
exports.faVolumeMute = faVolumeMute;
exports.faVolumeOff = faVolumeOff;
exports.faVolumeUp = faVolumeUp;
exports.faWatch = faWatch;
exports.faWheelchair = faWheelchair;
exports.faWhistle = faWhistle;
exports.faWifi = faWifi;
exports.faWindow = faWindow;
exports.faWindowAlt = faWindowAlt;
exports.faWindowClose = faWindowClose;
exports.faWindowMaximize = faWindowMaximize;
exports.faWindowMinimize = faWindowMinimize;
exports.faWindowRestore = faWindowRestore;
exports.faWonSign = faWonSign;
exports.faWrench = faWrench;
exports.faYenSign = faYenSign;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],14:[function(require,module,exports){
/*!
 * Font Awesome Free 5.0.5 by @fontawesome - http://fontawesome.com
 * License - http://fontawesome.com/license (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.fontawesome = {})));
}(this, (function (exports) { 'use strict';

var noop = function noop() {};

var _WINDOW = {};
var _DOCUMENT = {};
var _MUTATION_OBSERVER$1 = null;
var _PERFORMANCE = { mark: noop, measure: noop };

try {
  if (typeof window !== 'undefined') _WINDOW = window;
  if (typeof document !== 'undefined') _DOCUMENT = document;
  if (typeof MutationObserver !== 'undefined') _MUTATION_OBSERVER$1 = MutationObserver;
  if (typeof performance !== 'undefined') _PERFORMANCE = performance;
} catch (e) {}

var _ref = _WINDOW.navigator || {};
var _ref$userAgent = _ref.userAgent;
var userAgent = _ref$userAgent === undefined ? '' : _ref$userAgent;

var WINDOW = _WINDOW;
var DOCUMENT = _DOCUMENT;
var MUTATION_OBSERVER = _MUTATION_OBSERVER$1;
var PERFORMANCE = _PERFORMANCE;
var IS_BROWSER = !!WINDOW.document;
var IS_DOM = !!DOCUMENT.documentElement && !!DOCUMENT.head && typeof DOCUMENT.addEventListener === 'function' && typeof DOCUMENT.createElement === 'function';
var IS_IE = ~userAgent.indexOf('MSIE') || ~userAgent.indexOf('Trident/');

var NAMESPACE_IDENTIFIER = '___FONT_AWESOME___';
var UNITS_IN_GRID = 16;
var DEFAULT_FAMILY_PREFIX = 'fa';
var DEFAULT_REPLACEMENT_CLASS = 'svg-inline--fa';
var DATA_FA_I2SVG = 'data-fa-i2svg';
var DATA_FA_PSEUDO_ELEMENT = 'data-fa-pseudo-element';
var HTML_CLASS_I2SVG_BASE_CLASS = 'fontawesome-i2svg';

var PRODUCTION = function () {
  try {
    return "development" === 'production';
  } catch (e) {
    return false;
  }
}();

var oneToTen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
var oneToTwenty = oneToTen.concat([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

var ATTRIBUTES_WATCHED_FOR_MUTATION = ['class', 'data-prefix', 'data-icon', 'data-fa-transform', 'data-fa-mask'];

var RESERVED_CLASSES = ['xs', 'sm', 'lg', 'fw', 'ul', 'li', 'border', 'pull-left', 'pull-right', 'spin', 'pulse', 'rotate-90', 'rotate-180', 'rotate-270', 'flip-horizontal', 'flip-vertical', 'stack', 'stack-1x', 'stack-2x', 'inverse', 'layers', 'layers-text', 'layers-counter'].concat(oneToTen.map(function (n) {
  return n + 'x';
})).concat(oneToTwenty.map(function (n) {
  return 'w-' + n;
}));

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();



var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};



var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var initial = WINDOW.FontAwesomeConfig || {};
var initialKeys = Object.keys(initial);

var _default = _extends({
  familyPrefix: DEFAULT_FAMILY_PREFIX,
  replacementClass: DEFAULT_REPLACEMENT_CLASS,
  autoReplaceSvg: true,
  autoAddCss: true,
  autoA11y: true,
  searchPseudoElements: false,
  observeMutations: true,
  keepOriginalSource: true,
  measurePerformance: false,
  showMissingIcons: true
}, initial);

if (!_default.autoReplaceSvg) _default.observeMutations = false;

var config$1 = _extends({}, _default);

WINDOW.FontAwesomeConfig = config$1;

function update(newConfig) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _params$asNewDefault = params.asNewDefault,
      asNewDefault = _params$asNewDefault === undefined ? false : _params$asNewDefault;

  var validKeys = Object.keys(config$1);
  var ok = asNewDefault ? function (k) {
    return ~validKeys.indexOf(k) && !~initialKeys.indexOf(k);
  } : function (k) {
    return ~validKeys.indexOf(k);
  };

  Object.keys(newConfig).forEach(function (configKey) {
    if (ok(configKey)) config$1[configKey] = newConfig[configKey];
  });
}

function auto(value) {
  update({
    autoReplaceSvg: value,
    observeMutations: value
  });
}

var w = WINDOW || {};

if (!w[NAMESPACE_IDENTIFIER]) w[NAMESPACE_IDENTIFIER] = {};
if (!w[NAMESPACE_IDENTIFIER].styles) w[NAMESPACE_IDENTIFIER].styles = {};
if (!w[NAMESPACE_IDENTIFIER].hooks) w[NAMESPACE_IDENTIFIER].hooks = {};
if (!w[NAMESPACE_IDENTIFIER].shims) w[NAMESPACE_IDENTIFIER].shims = [];

var namespace = w[NAMESPACE_IDENTIFIER];

var functions = [];
var listener = function listener() {
  DOCUMENT.removeEventListener('DOMContentLoaded', listener);
  loaded = 1;
  functions.map(function (fn) {
    return fn();
  });
};

var loaded = false;

if (IS_DOM) {
  loaded = (DOCUMENT.documentElement.doScroll ? /^loaded|^c/ : /^loaded|^i|^c/).test(DOCUMENT.readyState);

  if (!loaded) DOCUMENT.addEventListener('DOMContentLoaded', listener);
}

var domready = function (fn) {
  if (!IS_DOM) return;
  loaded ? setTimeout(fn, 0) : functions.push(fn);
};

var d = UNITS_IN_GRID;

var meaninglessTransform = {
  size: 16,
  x: 0,
  y: 0,
  rotate: 0,
  flipX: false,
  flipY: false
};

function isReserved(name) {
  return ~RESERVED_CLASSES.indexOf(name);
}

function bunker(fn) {
  try {
    fn();
  } catch (e) {
    if (!PRODUCTION) {
      throw e;
    }
  }
}

function insertCss(css) {
  if (!css || !IS_DOM) {
    return;
  }

  var style = DOCUMENT.createElement('style');
  style.setAttribute('type', 'text/css');
  style.innerHTML = css;

  var headChildren = DOCUMENT.head.childNodes;
  var beforeChild = null;

  for (var i = headChildren.length - 1; i > -1; i--) {
    var child = headChildren[i];
    var tagName = (child.tagName || '').toUpperCase();
    if (['STYLE', 'LINK'].indexOf(tagName) > -1) {
      beforeChild = child;
    }
  }

  DOCUMENT.head.insertBefore(style, beforeChild);

  return css;
}

var _uniqueId = 0;

function nextUniqueId() {
  _uniqueId++;

  return _uniqueId;
}

function toArray(obj) {
  var array = [];

  for (var i = (obj || []).length >>> 0; i--;) {
    array[i] = obj[i];
  }

  return array;
}

function classArray(node) {
  if (node.classList) {
    return toArray(node.classList);
  } else {
    return (node.getAttribute('class') || '').split(' ').filter(function (i) {
      return i;
    });
  }
}

function getIconName(familyPrefix, cls) {
  var parts = cls.split('-');
  var prefix = parts[0];
  var iconName = parts.slice(1).join('-');

  if (prefix === familyPrefix && iconName !== '' && !isReserved(iconName)) {
    return iconName;
  } else {
    return null;
  }
}

function htmlEscape(str) {
  return ('' + str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function joinAttributes(attributes) {
  return Object.keys(attributes || {}).reduce(function (acc, attributeName) {
    return acc + (attributeName + '="' + htmlEscape(attributes[attributeName]) + '" ');
  }, '').trim();
}

function joinStyles(styles) {
  return Object.keys(styles || {}).reduce(function (acc, styleName) {
    return acc + (styleName + ': ' + styles[styleName] + ';');
  }, '');
}

function transformIsMeaningful(transform) {
  return transform.size !== meaninglessTransform.size || transform.x !== meaninglessTransform.x || transform.y !== meaninglessTransform.y || transform.rotate !== meaninglessTransform.rotate || transform.flipX || transform.flipY;
}

function transformForSvg(_ref) {
  var transform = _ref.transform,
      containerWidth = _ref.containerWidth,
      iconWidth = _ref.iconWidth;

  var outer = {
    transform: 'translate(' + containerWidth / 2 + ' 256)'
  };
  var innerTranslate = 'translate(' + transform.x * 32 + ', ' + transform.y * 32 + ') ';
  var innerScale = 'scale(' + transform.size / 16 * (transform.flipX ? -1 : 1) + ', ' + transform.size / 16 * (transform.flipY ? -1 : 1) + ') ';
  var innerRotate = 'rotate(' + transform.rotate + ' 0 0)';
  var inner = {
    transform: innerTranslate + ' ' + innerScale + ' ' + innerRotate
  };
  var path = {
    transform: 'translate(' + iconWidth / 2 * -1 + ' -256)'
  };
  return {
    outer: outer,
    inner: inner,
    path: path
  };
}

function transformForCss(_ref2) {
  var transform = _ref2.transform,
      _ref2$width = _ref2.width,
      width = _ref2$width === undefined ? UNITS_IN_GRID : _ref2$width,
      _ref2$height = _ref2.height,
      height = _ref2$height === undefined ? UNITS_IN_GRID : _ref2$height,
      _ref2$startCentered = _ref2.startCentered,
      startCentered = _ref2$startCentered === undefined ? false : _ref2$startCentered;

  var val = '';

  if (startCentered && IS_IE) {
    val += 'translate(' + (transform.x / d - width / 2) + 'em, ' + (transform.y / d - height / 2) + 'em) ';
  } else if (startCentered) {
    val += 'translate(calc(-50% + ' + transform.x / d + 'em), calc(-50% + ' + transform.y / d + 'em)) ';
  } else {
    val += 'translate(' + transform.x / d + 'em, ' + transform.y / d + 'em) ';
  }

  val += 'scale(' + transform.size / d * (transform.flipX ? -1 : 1) + ', ' + transform.size / d * (transform.flipY ? -1 : 1) + ') ';
  val += 'rotate(' + transform.rotate + 'deg) ';

  return val;
}

var ALL_SPACE = {
  x: 0,
  y: 0,
  width: '100%',
  height: '100%'
};

var makeIconMasking = function (_ref) {
  var children = _ref.children,
      attributes = _ref.attributes,
      main = _ref.main,
      mask = _ref.mask,
      transform = _ref.transform;
  var mainWidth = main.width,
      mainPath = main.icon;
  var maskWidth = mask.width,
      maskPath = mask.icon;


  var trans = transformForSvg({ transform: transform, containerWidth: maskWidth, iconWidth: mainWidth });

  var maskRect = {
    tag: 'rect',
    attributes: _extends({}, ALL_SPACE, {
      fill: 'white'
    })
  };
  var maskInnerGroup = {
    tag: 'g',
    attributes: _extends({}, trans.inner),
    children: [{ tag: 'path', attributes: _extends({}, mainPath.attributes, trans.path, { fill: 'black' }) }]
  };
  var maskOuterGroup = {
    tag: 'g',
    attributes: _extends({}, trans.outer),
    children: [maskInnerGroup]
  };
  var maskId = 'mask-' + nextUniqueId();
  var clipId = 'clip-' + nextUniqueId();
  var maskTag = {
    tag: 'mask',
    attributes: _extends({}, ALL_SPACE, {
      id: maskId,
      maskUnits: 'userSpaceOnUse',
      maskContentUnits: 'userSpaceOnUse'
    }),
    children: [maskRect, maskOuterGroup]
  };
  var defs = {
    tag: 'defs',
    children: [{ tag: 'clipPath', attributes: { id: clipId }, children: [maskPath] }, maskTag]
  };

  children.push(defs, { tag: 'rect', attributes: _extends({ fill: 'currentColor', 'clip-path': 'url(#' + clipId + ')', mask: 'url(#' + maskId + ')' }, ALL_SPACE) });

  return {
    children: children,
    attributes: attributes
  };
};

var makeIconStandard = function (_ref) {
  var children = _ref.children,
      attributes = _ref.attributes,
      main = _ref.main,
      transform = _ref.transform,
      styles = _ref.styles;

  var styleString = joinStyles(styles);

  if (styleString.length > 0) {
    attributes['style'] = styleString;
  }

  if (transformIsMeaningful(transform)) {
    var trans = transformForSvg({ transform: transform, containerWidth: main.width, iconWidth: main.width });
    children.push({
      tag: 'g',
      attributes: _extends({}, trans.outer),
      children: [{
        tag: 'g',
        attributes: _extends({}, trans.inner),
        children: [{
          tag: main.icon.tag,
          children: main.icon.children,
          attributes: _extends({}, main.icon.attributes, trans.path)
        }]
      }]
    });
  } else {
    children.push(main.icon);
  }

  return {
    children: children,
    attributes: attributes
  };
};

var asIcon = function (_ref) {
  var children = _ref.children,
      main = _ref.main,
      mask = _ref.mask,
      attributes = _ref.attributes,
      styles = _ref.styles,
      transform = _ref.transform;

  if (transformIsMeaningful(transform) && main.found && !mask.found) {
    var width = main.width,
        height = main.height;

    var offset = {
      x: width / height / 2,
      y: 0.5
    };
    attributes['style'] = joinStyles(_extends({}, styles, {
      'transform-origin': offset.x + transform.x / 16 + 'em ' + (offset.y + transform.y / 16) + 'em'
    }));
  }

  return [{
    tag: 'svg',
    attributes: attributes,
    children: children
  }];
};

var asSymbol = function (_ref) {
  var prefix = _ref.prefix,
      iconName = _ref.iconName,
      children = _ref.children,
      attributes = _ref.attributes,
      symbol = _ref.symbol;

  var id = symbol === true ? prefix + '-' + config$1.familyPrefix + '-' + iconName : symbol;

  return [{
    tag: 'svg',
    attributes: {
      style: 'display: none;'
    },
    children: [{
      tag: 'symbol',
      attributes: _extends({}, attributes, { id: id }),
      children: children
    }]
  }];
};

function makeInlineSvgAbstract(params) {
  var _params$icons = params.icons,
      main = _params$icons.main,
      mask = _params$icons.mask,
      prefix = params.prefix,
      iconName = params.iconName,
      transform = params.transform,
      symbol = params.symbol,
      title = params.title,
      extra = params.extra,
      _params$watchable = params.watchable,
      watchable = _params$watchable === undefined ? false : _params$watchable;

  var _ref = mask.found ? mask : main,
      width = _ref.width,
      height = _ref.height;

  var widthClass = 'fa-w-' + Math.ceil(width / height * 16);
  var attrClass = [config$1.replacementClass, iconName ? config$1.familyPrefix + '-' + iconName : '', widthClass].concat(extra.classes).join(' ');

  var content = {
    children: [],
    attributes: _extends({}, extra.attributes, {
      'data-prefix': prefix,
      'data-icon': iconName,
      'class': attrClass,
      'role': 'img',
      'xmlns': 'http://www.w3.org/2000/svg',
      'viewBox': '0 0 ' + width + ' ' + height
    })
  };

  if (watchable) {
    content.attributes[DATA_FA_I2SVG] = '';
  }

  if (title) content.children.push({ tag: 'title', attributes: { id: content.attributes['aria-labelledby'] || 'title-' + nextUniqueId() }, children: [title] });

  var args = _extends({}, content, {
    prefix: prefix,
    iconName: iconName,
    main: main,
    mask: mask,
    transform: transform,
    symbol: symbol,
    styles: extra.styles
  });

  var _ref2 = mask.found && main.found ? makeIconMasking(args) : makeIconStandard(args),
      children = _ref2.children,
      attributes = _ref2.attributes;

  args.children = children;
  args.attributes = attributes;

  if (symbol) {
    return asSymbol(args);
  } else {
    return asIcon(args);
  }
}

function makeLayersTextAbstract(params) {
  var content = params.content,
      width = params.width,
      height = params.height,
      transform = params.transform,
      title = params.title,
      extra = params.extra,
      _params$watchable2 = params.watchable,
      watchable = _params$watchable2 === undefined ? false : _params$watchable2;


  var attributes = _extends({}, extra.attributes, title ? { 'title': title } : {}, {
    'class': extra.classes.join(' ')
  });

  if (watchable) {
    attributes[DATA_FA_I2SVG] = '';
  }

  var styles = _extends({}, extra.styles);

  if (transformIsMeaningful(transform)) {
    styles['transform'] = transformForCss({ transform: transform, startCentered: true, width: width, height: height });
    styles['-webkit-transform'] = styles['transform'];
  }

  var styleString = joinStyles(styles);

  if (styleString.length > 0) {
    attributes['style'] = styleString;
  }

  var val = [];

  val.push({
    tag: 'span',
    attributes: attributes,
    children: [content]
  });

  if (title) {
    val.push({ tag: 'span', attributes: { class: 'sr-only' }, children: [title] });
  }

  return val;
}

var noop$2 = function noop() {};
var p = config$1.measurePerformance && PERFORMANCE && PERFORMANCE.mark && PERFORMANCE.measure ? PERFORMANCE : { mark: noop$2, measure: noop$2 };
var preamble = 'FA "5.0.5"';

var begin = function begin(name) {
  p.mark(preamble + ' ' + name + ' begins');
  return function () {
    return end(name);
  };
};

var end = function end(name) {
  p.mark(preamble + ' ' + name + ' ends');
  p.measure(preamble + ' ' + name, preamble + ' ' + name + ' begins', preamble + ' ' + name + ' ends');
};

var perf = { begin: begin, end: end };

'use strict';

/**
 * Internal helper to bind a function known to have 4 arguments
 * to a given context.
 */
var bindInternal4 = function bindInternal4 (func, thisContext) {
  return function (a, b, c, d) {
    return func.call(thisContext, a, b, c, d);
  };
};

'use strict';



/**
 * # Reduce
 *
 * A fast object `.reduce()` implementation.
 *
 * @param  {Object}   subject      The object to reduce over.
 * @param  {Function} fn           The reducer function.
 * @param  {mixed}    initialValue The initial value for the reducer, defaults to subject[0].
 * @param  {Object}   thisContext  The context for the reducer.
 * @return {mixed}                 The final result.
 */
var reduce = function fastReduceObject (subject, fn, initialValue, thisContext) {
  var keys = Object.keys(subject),
      length = keys.length,
      iterator = thisContext !== undefined ? bindInternal4(fn, thisContext) : fn,
      i, key, result;

  if (initialValue === undefined) {
    i = 1;
    result = subject[keys[0]];
  }
  else {
    i = 0;
    result = initialValue;
  }

  for (; i < length; i++) {
    key = keys[i];
    result = iterator(result, subject[key], key, subject);
  }

  return result;
};

var styles$2 = namespace.styles;
var shims = namespace.shims;


var _byUnicode = {};
var _byLigature = {};
var _byOldName = {};

var build = function build() {
  var lookup = function lookup(reducer) {
    return reduce(styles$2, function (o, style, prefix) {
      o[prefix] = reduce(style, reducer, {});
      return o;
    }, {});
  };

  _byUnicode = lookup(function (acc, icon, iconName) {
    acc[icon[3]] = iconName;

    return acc;
  });

  _byLigature = lookup(function (acc, icon, iconName) {
    var ligatures = icon[2];

    acc[iconName] = iconName;

    ligatures.forEach(function (ligature) {
      acc[ligature] = iconName;
    });

    return acc;
  });

  var hasRegular = 'far' in styles$2;

  _byOldName = reduce(shims, function (acc, shim) {
    var oldName = shim[0];
    var prefix = shim[1];
    var iconName = shim[2];

    if (prefix === 'far' && !hasRegular) {
      prefix = 'fas';
    }

    acc[oldName] = { prefix: prefix, iconName: iconName };

    return acc;
  }, {});
};

build();

function byUnicode(prefix, unicode) {
  return _byUnicode[prefix][unicode];
}

function byLigature(prefix, ligature) {
  return _byLigature[prefix][ligature];
}

function byOldName(name) {
  return _byOldName[name] || { prefix: null, iconName: null };
}

var styles$1 = namespace.styles;


var emptyCanonicalIcon = function emptyCanonicalIcon() {
  return { prefix: null, iconName: null, rest: [] };
};

function getCanonicalIcon(values) {
  return values.reduce(function (acc, cls) {
    var iconName = getIconName(config$1.familyPrefix, cls);

    if (styles$1[cls]) {
      acc.prefix = cls;
    } else if (iconName) {
      var shim = acc.prefix === 'fa' ? byOldName(iconName) : {};

      acc.iconName = shim.iconName || iconName;
      acc.prefix = shim.prefix || acc.prefix;
    } else if (cls !== config$1.replacementClass && cls.indexOf('fa-w-') !== 0) {
      acc.rest.push(cls);
    }

    return acc;
  }, emptyCanonicalIcon());
}

function iconFromMapping(mapping, prefix, iconName) {
  if (mapping && mapping[prefix] && mapping[prefix][iconName]) {
    return {
      prefix: prefix,
      iconName: iconName,
      icon: mapping[prefix][iconName]
    };
  }
}

function toHtml(abstractNodes) {
  var tag = abstractNodes.tag,
      _abstractNodes$attrib = abstractNodes.attributes,
      attributes = _abstractNodes$attrib === undefined ? {} : _abstractNodes$attrib,
      _abstractNodes$childr = abstractNodes.children,
      children = _abstractNodes$childr === undefined ? [] : _abstractNodes$childr;


  if (typeof abstractNodes === 'string') {
    return htmlEscape(abstractNodes);
  } else {
    return '<' + tag + ' ' + joinAttributes(attributes) + '>' + children.map(toHtml).join('') + '</' + tag + '>';
  }
}

var noop$1 = function noop() {};

function isWatched(node) {
  var i2svg = node.getAttribute ? node.getAttribute(DATA_FA_I2SVG) : null;

  return typeof i2svg === 'string';
}

function getMutator() {
  if (config$1.autoReplaceSvg === true) {
    return mutators.replace;
  }

  var mutator = mutators[config$1.autoReplaceSvg];

  return mutator || mutators.replace;
}

var mutators = {
  replace: function replace(mutation) {
    var node = mutation[0];
    var abstract = mutation[1];
    var newOuterHTML = abstract.map(function (a) {
      return toHtml(a);
    }).join('\n');

    if (node.parentNode && node.outerHTML) {
      node.outerHTML = newOuterHTML + (config$1.keepOriginalSource && node.tagName.toLowerCase() !== 'svg' ? '<!-- ' + node.outerHTML + ' -->' : '');
    } else if (node.parentNode) {
      var newNode = document.createElement('span');
      node.parentNode.replaceChild(newNode, node);
      newNode.outerHTML = newOuterHTML;
    }
  },
  nest: function nest(mutation) {
    var node = mutation[0];
    var abstract = mutation[1];

    // If we already have a replaced node we do not want to continue nesting within it.
    // Short-circuit to the standard replacement
    if (~classArray(node).indexOf(config$1.replacementClass)) {
      return mutators.replace(mutation);
    }

    var forSvg = new RegExp(config$1.familyPrefix + '-.*');

    delete abstract[0].attributes.style;

    var splitClasses = abstract[0].attributes.class.split(' ').reduce(function (acc, cls) {
      if (cls === config$1.replacementClass || cls.match(forSvg)) {
        acc.toSvg.push(cls);
      } else {
        acc.toNode.push(cls);
      }

      return acc;
    }, { toNode: [], toSvg: [] });

    abstract[0].attributes.class = splitClasses.toSvg.join(' ');

    var newInnerHTML = abstract.map(function (a) {
      return toHtml(a);
    }).join('\n');
    node.setAttribute('class', splitClasses.toNode.join(' '));
    node.setAttribute(DATA_FA_I2SVG, '');
    node.innerHTML = newInnerHTML;
  }
};

function perform(mutations, callback) {
  var callbackFunction = typeof callback === 'function' ? callback : noop$1;

  if (mutations.length === 0) {
    callbackFunction();
  } else {
    var frame = WINDOW.requestAnimationFrame || function (op) {
      return op();
    };

    frame(function () {
      var mutator = getMutator();
      var mark = perf.begin('mutate');

      mutations.map(mutator);

      mark();

      callbackFunction();
    });
  }
}

var disabled = false;

function disableObservation(operation) {
  disabled = true;
  operation();
  disabled = false;
}

function observe(options) {
  if (!MUTATION_OBSERVER) return;

  var treeCallback = options.treeCallback,
      nodeCallback = options.nodeCallback,
      pseudoElementsCallback = options.pseudoElementsCallback;


  var mo = new MUTATION_OBSERVER(function (objects) {
    if (disabled) return;

    toArray(objects).forEach(function (mutationRecord) {
      if (mutationRecord.type === 'childList' && mutationRecord.addedNodes.length > 0 && !isWatched(mutationRecord.addedNodes[0])) {
        if (config$1.searchPseudoElements) {
          pseudoElementsCallback(mutationRecord.target);
        }

        treeCallback(mutationRecord.target);
      }

      if (mutationRecord.type === 'attributes' && mutationRecord.target.parentNode && config$1.searchPseudoElements) {
        pseudoElementsCallback(mutationRecord.target.parentNode);
      }

      if (mutationRecord.type === 'attributes' && isWatched(mutationRecord.target) && ~ATTRIBUTES_WATCHED_FOR_MUTATION.indexOf(mutationRecord.attributeName)) {
        if (mutationRecord.attributeName === 'class') {
          var _getCanonicalIcon = getCanonicalIcon(classArray(mutationRecord.target)),
              prefix = _getCanonicalIcon.prefix,
              iconName = _getCanonicalIcon.iconName;

          if (prefix) mutationRecord.target.setAttribute('data-prefix', prefix);
          if (iconName) mutationRecord.target.setAttribute('data-icon', iconName);
        } else {
          nodeCallback(mutationRecord.target);
        }
      }
    });
  });

  if (!IS_DOM) return;

  mo.observe(DOCUMENT.getElementsByTagName('body')[0], {
    childList: true, attributes: true, characterData: true, subtree: true
  });
}

var styleParser = function (node) {
  var style = node.getAttribute('style');

  var val = [];

  if (style) {
    val = style.split(';').reduce(function (acc, style) {
      var styles = style.split(':');
      var prop = styles[0];
      var value = styles.slice(1);

      if (prop && value.length > 0) {
        acc[prop] = value.join(':').trim();
      }

      return acc;
    }, {});
  }

  return val;
};

function toHex(unicode) {
  var result = '';

  for (var i = 0; i < unicode.length; i++) {
    var hex = unicode.charCodeAt(i).toString(16);
    result += ('000' + hex).slice(-4);
  }

  return result;
}

var classParser = function (node) {
  var existingPrefix = node.getAttribute('data-prefix');
  var existingIconName = node.getAttribute('data-icon');
  var innerText = node.innerText !== undefined ? node.innerText.trim() : '';

  var val = getCanonicalIcon(classArray(node));

  if (existingPrefix && existingIconName) {
    val.prefix = existingPrefix;
    val.iconName = existingIconName;
  }

  if (val.prefix && innerText.length > 1) {
    val.iconName = byLigature(val.prefix, node.innerText);
  } else if (val.prefix && innerText.length === 1) {
    val.iconName = byUnicode(val.prefix, toHex(node.innerText));
  }

  return val;
};

var parseTransformString = function parseTransformString(transformString) {
  var transform = {
    size: 16,
    x: 0,
    y: 0,
    flipX: false,
    flipY: false,
    rotate: 0
  };

  if (!transformString) {
    return transform;
  } else {
    return transformString.toLowerCase().split(' ').reduce(function (acc, n) {
      var parts = n.toLowerCase().split('-');
      var first = parts[0];
      var rest = parts.slice(1).join('-');

      if (first && rest === 'h') {
        acc.flipX = true;
        return acc;
      }

      if (first && rest === 'v') {
        acc.flipY = true;
        return acc;
      }

      rest = parseFloat(rest);

      if (isNaN(rest)) {
        return acc;
      }

      switch (first) {
        case 'grow':
          acc.size = acc.size + rest;
          break;
        case 'shrink':
          acc.size = acc.size - rest;
          break;
        case 'left':
          acc.x = acc.x - rest;
          break;
        case 'right':
          acc.x = acc.x + rest;
          break;
        case 'up':
          acc.y = acc.y - rest;
          break;
        case 'down':
          acc.y = acc.y + rest;
          break;
        case 'rotate':
          acc.rotate = acc.rotate + rest;
          break;
      }

      return acc;
    }, transform);
  }
};

var transformParser = function (node) {
  return parseTransformString(node.getAttribute('data-fa-transform'));
};

var symbolParser = function (node) {
  var symbol = node.getAttribute('data-fa-symbol');

  return symbol === null ? false : symbol === '' ? true : symbol;
};

var attributesParser = function (node) {
  var extraAttributes = toArray(node.attributes).reduce(function (acc, attr) {
    if (acc.name !== 'class' && acc.name !== 'style') {
      acc[attr.name] = attr.value;
    }
    return acc;
  }, {});

  var title = node.getAttribute('title');

  if (config$1.autoA11y) {
    if (title) {
      extraAttributes['aria-labelledby'] = config$1.replacementClass + '-title-' + nextUniqueId();
    } else {
      extraAttributes['aria-hidden'] = 'true';
    }
  }

  return extraAttributes;
};

var maskParser = function (node) {
  var mask = node.getAttribute('data-fa-mask');

  if (!mask) {
    return emptyCanonicalIcon();
  } else {
    return getCanonicalIcon(mask.split(' ').map(function (i) {
      return i.trim();
    }));
  }
};

function parseMeta(node) {
  var _classParser = classParser(node),
      iconName = _classParser.iconName,
      prefix = _classParser.prefix,
      extraClasses = _classParser.rest;

  var extraStyles = styleParser(node);
  var transform = transformParser(node);
  var symbol = symbolParser(node);
  var extraAttributes = attributesParser(node);
  var mask = maskParser(node);

  return {
    iconName: iconName,
    title: node.getAttribute('title'),
    prefix: prefix,
    transform: transform,
    symbol: symbol,
    mask: mask,
    extra: {
      classes: extraClasses,
      styles: extraStyles,
      attributes: extraAttributes
    }
  };
}

function MissingIcon(error) {
  this.name = 'MissingIcon';
  this.message = error || 'Icon unavailable';
  this.stack = new Error().stack;
}

MissingIcon.prototype = Object.create(Error.prototype);
MissingIcon.prototype.constructor = MissingIcon;

var FILL = { fill: 'currentColor' };
var ANIMATION_BASE = {
  attributeType: 'XML',
  repeatCount: 'indefinite',
  dur: '2s'
};
var RING = {
  tag: 'path',
  attributes: _extends({}, FILL, {
    d: 'M156.5,447.7l-12.6,29.5c-18.7-9.5-35.9-21.2-51.5-34.9l22.7-22.7C127.6,430.5,141.5,440,156.5,447.7z M40.6,272H8.5 c1.4,21.2,5.4,41.7,11.7,61.1L50,321.2C45.1,305.5,41.8,289,40.6,272z M40.6,240c1.4-18.8,5.2-37,11.1-54.1l-29.5-12.6 C14.7,194.3,10,216.7,8.5,240H40.6z M64.3,156.5c7.8-14.9,17.2-28.8,28.1-41.5L69.7,92.3c-13.7,15.6-25.5,32.8-34.9,51.5 L64.3,156.5z M397,419.6c-13.9,12-29.4,22.3-46.1,30.4l11.9,29.8c20.7-9.9,39.8-22.6,56.9-37.6L397,419.6z M115,92.4 c13.9-12,29.4-22.3,46.1-30.4l-11.9-29.8c-20.7,9.9-39.8,22.6-56.8,37.6L115,92.4z M447.7,355.5c-7.8,14.9-17.2,28.8-28.1,41.5 l22.7,22.7c13.7-15.6,25.5-32.9,34.9-51.5L447.7,355.5z M471.4,272c-1.4,18.8-5.2,37-11.1,54.1l29.5,12.6 c7.5-21.1,12.2-43.5,13.6-66.8H471.4z M321.2,462c-15.7,5-32.2,8.2-49.2,9.4v32.1c21.2-1.4,41.7-5.4,61.1-11.7L321.2,462z M240,471.4c-18.8-1.4-37-5.2-54.1-11.1l-12.6,29.5c21.1,7.5,43.5,12.2,66.8,13.6V471.4z M462,190.8c5,15.7,8.2,32.2,9.4,49.2h32.1 c-1.4-21.2-5.4-41.7-11.7-61.1L462,190.8z M92.4,397c-12-13.9-22.3-29.4-30.4-46.1l-29.8,11.9c9.9,20.7,22.6,39.8,37.6,56.9 L92.4,397z M272,40.6c18.8,1.4,36.9,5.2,54.1,11.1l12.6-29.5C317.7,14.7,295.3,10,272,8.5V40.6z M190.8,50 c15.7-5,32.2-8.2,49.2-9.4V8.5c-21.2,1.4-41.7,5.4-61.1,11.7L190.8,50z M442.3,92.3L419.6,115c12,13.9,22.3,29.4,30.5,46.1 l29.8-11.9C470,128.5,457.3,109.4,442.3,92.3z M397,92.4l22.7-22.7c-15.6-13.7-32.8-25.5-51.5-34.9l-12.6,29.5 C370.4,72.1,384.4,81.5,397,92.4z'
  })
};
var OPACITY_ANIMATE = _extends({}, ANIMATION_BASE, {
  attributeName: 'opacity'
});
var DOT = {
  tag: 'circle',
  attributes: _extends({}, FILL, {
    cx: '256',
    cy: '364',
    r: '28'
  }),
  children: [{ tag: 'animate', attributes: _extends({}, ANIMATION_BASE, { attributeName: 'r', values: '28;14;28;28;14;28;' }) }, { tag: 'animate', attributes: _extends({}, OPACITY_ANIMATE, { values: '1;0;1;1;0;1;' }) }]
};
var QUESTION = {
  tag: 'path',
  attributes: _extends({}, FILL, {
    opacity: '1',
    d: 'M263.7,312h-16c-6.6,0-12-5.4-12-12c0-71,77.4-63.9,77.4-107.8c0-20-17.8-40.2-57.4-40.2c-29.1,0-44.3,9.6-59.2,28.7 c-3.9,5-11.1,6-16.2,2.4l-13.1-9.2c-5.6-3.9-6.9-11.8-2.6-17.2c21.2-27.2,46.4-44.7,91.2-44.7c52.3,0,97.4,29.8,97.4,80.2 c0,67.6-77.4,63.5-77.4,107.8C275.7,306.6,270.3,312,263.7,312z'
  }),
  children: [{ tag: 'animate', attributes: _extends({}, OPACITY_ANIMATE, { values: '1;0;0;0;0;1;' }) }]
};
var EXCLAMATION = {
  tag: 'path',
  attributes: _extends({}, FILL, {
    opacity: '0',
    d: 'M232.5,134.5l7,168c0.3,6.4,5.6,11.5,12,11.5h9c6.4,0,11.7-5.1,12-11.5l7-168c0.3-6.8-5.2-12.5-12-12.5h-23 C237.7,122,232.2,127.7,232.5,134.5z'
  }),
  children: [{ tag: 'animate', attributes: _extends({}, OPACITY_ANIMATE, { values: '0;0;1;1;0;0;' }) }]
};

var missing = { tag: 'g', children: [RING, DOT, QUESTION, EXCLAMATION] };

var styles = namespace.styles;

var LAYERS_TEXT_CLASSNAME = 'fa-layers-text';
var FONT_FAMILY_PATTERN = /Font Awesome 5 (Solid|Regular|Light|Brands)/;
var STYLE_TO_PREFIX = {
  'Solid': 'fas',
  'Regular': 'far',
  'Light': 'fal',
  'Brands': 'fab'
};

function findIcon(iconName, prefix) {
  var val = {
    found: false,
    width: 512,
    height: 512,
    icon: missing
  };

  if (iconName && prefix && styles[prefix] && styles[prefix][iconName]) {
    var icon = styles[prefix][iconName];
    var width = icon[0];
    var height = icon[1];
    var vectorData = icon.slice(4);

    val = {
      found: true,
      width: width,
      height: height,
      icon: { tag: 'path', attributes: { fill: 'currentColor', d: vectorData[0] } }
    };
  } else if (iconName && prefix && !config$1.showMissingIcons) {
    throw new MissingIcon('Icon is missing for prefix ' + prefix + ' with icon name ' + iconName);
  }

  return val;
}

function generateSvgReplacementMutation(node, nodeMeta) {
  var iconName = nodeMeta.iconName,
      title = nodeMeta.title,
      prefix = nodeMeta.prefix,
      transform = nodeMeta.transform,
      symbol = nodeMeta.symbol,
      mask = nodeMeta.mask,
      extra = nodeMeta.extra;


  return [node, makeInlineSvgAbstract({
    icons: {
      main: findIcon(iconName, prefix),
      mask: findIcon(mask.iconName, mask.prefix)
    },
    prefix: prefix,
    iconName: iconName,
    transform: transform,
    symbol: symbol,
    mask: mask,
    title: title,
    extra: extra,
    watchable: true
  })];
}

function generateLayersText(node, nodeMeta) {
  var title = nodeMeta.title,
      transform = nodeMeta.transform,
      extra = nodeMeta.extra;


  var width = null;
  var height = null;

  if (IS_IE) {
    var computedFontSize = parseInt(getComputedStyle(node).fontSize, 10);
    var boundingClientRect = node.getBoundingClientRect();
    width = boundingClientRect.width / computedFontSize;
    height = boundingClientRect.height / computedFontSize;
  }

  if (config$1.autoA11y && !title) {
    extra.attributes['aria-hidden'] = 'true';
  }

  return [node, makeLayersTextAbstract({
    content: node.innerHTML,
    width: width,
    height: height,
    transform: transform,
    title: title,
    extra: extra,
    watchable: true
  })];
}

function generateMutation(node) {
  var nodeMeta = parseMeta(node);

  if (~nodeMeta.extra.classes.indexOf(LAYERS_TEXT_CLASSNAME)) {
    return generateLayersText(node, nodeMeta);
  } else {
    return generateSvgReplacementMutation(node, nodeMeta);
  }
}

function remove(node) {
  if (typeof node.remove === 'function') {
    node.remove();
  } else if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

function searchPseudoElements(root) {
  if (!IS_DOM) return;

  var end = perf.begin('searchPseudoElements');

  disableObservation(function () {
    toArray(root.querySelectorAll('*')).forEach(function (node) {
      [':before', ':after'].forEach(function (pos) {
        var styles = WINDOW.getComputedStyle(node, pos);
        var fontFamily = styles.getPropertyValue('font-family').match(FONT_FAMILY_PATTERN);
        var children = toArray(node.children);
        var pseudoElement = children.filter(function (c) {
          return c.getAttribute(DATA_FA_PSEUDO_ELEMENT) === pos;
        })[0];

        if (pseudoElement) {
          if (pseudoElement.nextSibling && pseudoElement.nextSibling.textContent.indexOf(DATA_FA_PSEUDO_ELEMENT) > -1) {
            remove(pseudoElement.nextSibling);
          }
          remove(pseudoElement);
          pseudoElement = null;
        }

        if (fontFamily && !pseudoElement) {
          var content = styles.getPropertyValue('content');
          var i = DOCUMENT.createElement('i');
          i.setAttribute('class', '' + STYLE_TO_PREFIX[fontFamily[1]]);
          i.setAttribute(DATA_FA_PSEUDO_ELEMENT, pos);
          i.innerText = content.length === 3 ? content.substr(1, 1) : content;
          if (pos === ':before') {
            node.insertBefore(i, node.firstChild);
          } else {
            node.appendChild(i);
          }
        }
      });
    });
  });

  end();
}

function onTree(root) {
  var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  if (!IS_DOM) return;

  var htmlClassList = DOCUMENT.documentElement.classList;
  var hclAdd = function hclAdd(suffix) {
    return htmlClassList.add(HTML_CLASS_I2SVG_BASE_CLASS + '-' + suffix);
  };
  var hclRemove = function hclRemove(suffix) {
    return htmlClassList.remove(HTML_CLASS_I2SVG_BASE_CLASS + '-' + suffix);
  };
  var prefixes = Object.keys(styles);
  var prefixesDomQuery = ['.' + LAYERS_TEXT_CLASSNAME + ':not([' + DATA_FA_I2SVG + '])'].concat(prefixes.map(function (p) {
    return '.' + p + ':not([' + DATA_FA_I2SVG + '])';
  })).join(', ');

  if (prefixesDomQuery.length === 0) {
    return;
  }

  var candidates = toArray(root.querySelectorAll(prefixesDomQuery));

  if (candidates.length > 0) {
    hclAdd('pending');
    hclRemove('complete');
  } else {
    return;
  }

  var mark = perf.begin('onTree');

  var mutations = candidates.reduce(function (acc, node) {
    try {
      var mutation = generateMutation(node);

      if (mutation) {
        acc.push(mutation);
      }
    } catch (e) {
      if (!PRODUCTION) {
        if (e instanceof MissingIcon) {
          console.error(e);
        }
      }
    }

    return acc;
  }, []);

  mark();

  perform(mutations, function () {
    hclAdd('active');
    hclAdd('complete');
    hclRemove('pending');

    if (typeof callback === 'function') callback();
  });
}

function onNode(node) {
  var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  var mutation = generateMutation(node);

  if (mutation) {
    perform([mutation], callback);
  }
}

var baseStyles = "svg:not(:root).svg-inline--fa {\n  overflow: visible; }\n\n.svg-inline--fa {\n  display: inline-block;\n  font-size: inherit;\n  height: 1em;\n  overflow: visible;\n  vertical-align: -.125em; }\n  .svg-inline--fa.fa-lg {\n    vertical-align: -.225em; }\n  .svg-inline--fa.fa-w-1 {\n    width: 0.0625em; }\n  .svg-inline--fa.fa-w-2 {\n    width: 0.125em; }\n  .svg-inline--fa.fa-w-3 {\n    width: 0.1875em; }\n  .svg-inline--fa.fa-w-4 {\n    width: 0.25em; }\n  .svg-inline--fa.fa-w-5 {\n    width: 0.3125em; }\n  .svg-inline--fa.fa-w-6 {\n    width: 0.375em; }\n  .svg-inline--fa.fa-w-7 {\n    width: 0.4375em; }\n  .svg-inline--fa.fa-w-8 {\n    width: 0.5em; }\n  .svg-inline--fa.fa-w-9 {\n    width: 0.5625em; }\n  .svg-inline--fa.fa-w-10 {\n    width: 0.625em; }\n  .svg-inline--fa.fa-w-11 {\n    width: 0.6875em; }\n  .svg-inline--fa.fa-w-12 {\n    width: 0.75em; }\n  .svg-inline--fa.fa-w-13 {\n    width: 0.8125em; }\n  .svg-inline--fa.fa-w-14 {\n    width: 0.875em; }\n  .svg-inline--fa.fa-w-15 {\n    width: 0.9375em; }\n  .svg-inline--fa.fa-w-16 {\n    width: 1em; }\n  .svg-inline--fa.fa-w-17 {\n    width: 1.0625em; }\n  .svg-inline--fa.fa-w-18 {\n    width: 1.125em; }\n  .svg-inline--fa.fa-w-19 {\n    width: 1.1875em; }\n  .svg-inline--fa.fa-w-20 {\n    width: 1.25em; }\n  .svg-inline--fa.fa-pull-left {\n    margin-right: .3em;\n    width: auto; }\n  .svg-inline--fa.fa-pull-right {\n    margin-left: .3em;\n    width: auto; }\n  .svg-inline--fa.fa-border {\n    height: 1.5em; }\n  .svg-inline--fa.fa-li {\n    width: 2em; }\n  .svg-inline--fa.fa-fw {\n    width: 1.25em; }\n\n.fa-layers svg.svg-inline--fa {\n  bottom: 0;\n  left: 0;\n  margin: auto;\n  position: absolute;\n  right: 0;\n  top: 0; }\n\n.fa-layers {\n  display: inline-block;\n  height: 1em;\n  position: relative;\n  text-align: center;\n  vertical-align: -.125em;\n  width: 1em; }\n  .fa-layers svg.svg-inline--fa {\n    -webkit-transform-origin: center center;\n            transform-origin: center center; }\n\n.fa-layers-text, .fa-layers-counter {\n  display: inline-block;\n  position: absolute;\n  text-align: center; }\n\n.fa-layers-text {\n  left: 50%;\n  top: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n  -webkit-transform-origin: center center;\n          transform-origin: center center; }\n\n.fa-layers-counter {\n  background-color: #ff253a;\n  border-radius: 1em;\n  color: #fff;\n  height: 1.5em;\n  line-height: 1;\n  max-width: 5em;\n  min-width: 1.5em;\n  overflow: hidden;\n  padding: .25em;\n  right: 0;\n  text-overflow: ellipsis;\n  top: 0;\n  -webkit-transform: scale(0.25);\n          transform: scale(0.25);\n  -webkit-transform-origin: top right;\n          transform-origin: top right; }\n\n.fa-layers-bottom-right {\n  bottom: 0;\n  right: 0;\n  top: auto;\n  -webkit-transform: scale(0.25);\n          transform: scale(0.25);\n  -webkit-transform-origin: bottom right;\n          transform-origin: bottom right; }\n\n.fa-layers-bottom-left {\n  bottom: 0;\n  left: 0;\n  right: auto;\n  top: auto;\n  -webkit-transform: scale(0.25);\n          transform: scale(0.25);\n  -webkit-transform-origin: bottom left;\n          transform-origin: bottom left; }\n\n.fa-layers-top-right {\n  right: 0;\n  top: 0;\n  -webkit-transform: scale(0.25);\n          transform: scale(0.25);\n  -webkit-transform-origin: top right;\n          transform-origin: top right; }\n\n.fa-layers-top-left {\n  left: 0;\n  right: auto;\n  top: 0;\n  -webkit-transform: scale(0.25);\n          transform: scale(0.25);\n  -webkit-transform-origin: top left;\n          transform-origin: top left; }\n\n.fa-lg {\n  font-size: 1.33333em;\n  line-height: 0.75em;\n  vertical-align: -.0667em; }\n\n.fa-xs {\n  font-size: .75em; }\n\n.fa-sm {\n  font-size: .875em; }\n\n.fa-1x {\n  font-size: 1em; }\n\n.fa-2x {\n  font-size: 2em; }\n\n.fa-3x {\n  font-size: 3em; }\n\n.fa-4x {\n  font-size: 4em; }\n\n.fa-5x {\n  font-size: 5em; }\n\n.fa-6x {\n  font-size: 6em; }\n\n.fa-7x {\n  font-size: 7em; }\n\n.fa-8x {\n  font-size: 8em; }\n\n.fa-9x {\n  font-size: 9em; }\n\n.fa-10x {\n  font-size: 10em; }\n\n.fa-fw {\n  text-align: center;\n  width: 1.25em; }\n\n.fa-ul {\n  list-style-type: none;\n  margin-left: 2.5em;\n  padding-left: 0; }\n  .fa-ul > li {\n    position: relative; }\n\n.fa-li {\n  left: -2em;\n  position: absolute;\n  text-align: center;\n  width: 2em;\n  line-height: inherit; }\n\n.fa-border {\n  border: solid 0.08em #eee;\n  border-radius: .1em;\n  padding: .2em .25em .15em; }\n\n.fa-pull-left {\n  float: left; }\n\n.fa-pull-right {\n  float: right; }\n\n.fa.fa-pull-left,\n.fas.fa-pull-left,\n.far.fa-pull-left,\n.fal.fa-pull-left,\n.fab.fa-pull-left {\n  margin-right: .3em; }\n\n.fa.fa-pull-right,\n.fas.fa-pull-right,\n.far.fa-pull-right,\n.fal.fa-pull-right,\n.fab.fa-pull-right {\n  margin-left: .3em; }\n\n.fa-spin {\n  -webkit-animation: fa-spin 2s infinite linear;\n          animation: fa-spin 2s infinite linear; }\n\n.fa-pulse {\n  -webkit-animation: fa-spin 1s infinite steps(8);\n          animation: fa-spin 1s infinite steps(8); }\n\n@-webkit-keyframes fa-spin {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg); }\n  100% {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg); } }\n\n@keyframes fa-spin {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg); }\n  100% {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg); } }\n\n.fa-rotate-90 {\n  -ms-filter: \"progid:DXImageTransform.Microsoft.BasicImage(rotation=1)\";\n  -webkit-transform: rotate(90deg);\n          transform: rotate(90deg); }\n\n.fa-rotate-180 {\n  -ms-filter: \"progid:DXImageTransform.Microsoft.BasicImage(rotation=2)\";\n  -webkit-transform: rotate(180deg);\n          transform: rotate(180deg); }\n\n.fa-rotate-270 {\n  -ms-filter: \"progid:DXImageTransform.Microsoft.BasicImage(rotation=3)\";\n  -webkit-transform: rotate(270deg);\n          transform: rotate(270deg); }\n\n.fa-flip-horizontal {\n  -ms-filter: \"progid:DXImageTransform.Microsoft.BasicImage(rotation=0, mirror=1)\";\n  -webkit-transform: scale(-1, 1);\n          transform: scale(-1, 1); }\n\n.fa-flip-vertical {\n  -ms-filter: \"progid:DXImageTransform.Microsoft.BasicImage(rotation=2, mirror=1)\";\n  -webkit-transform: scale(1, -1);\n          transform: scale(1, -1); }\n\n.fa-flip-horizontal.fa-flip-vertical {\n  -ms-filter: \"progid:DXImageTransform.Microsoft.BasicImage(rotation=2, mirror=1)\";\n  -webkit-transform: scale(-1, -1);\n          transform: scale(-1, -1); }\n\n:root .fa-rotate-90,\n:root .fa-rotate-180,\n:root .fa-rotate-270,\n:root .fa-flip-horizontal,\n:root .fa-flip-vertical {\n  -webkit-filter: none;\n          filter: none; }\n\n.fa-stack {\n  display: inline-block;\n  height: 2em;\n  position: relative;\n  width: 2em; }\n\n.fa-stack-1x,\n.fa-stack-2x {\n  bottom: 0;\n  left: 0;\n  margin: auto;\n  position: absolute;\n  right: 0;\n  top: 0; }\n\n.svg-inline--fa.fa-stack-1x {\n  height: 1em;\n  width: 1em; }\n\n.svg-inline--fa.fa-stack-2x {\n  height: 2em;\n  width: 2em; }\n\n.fa-inverse {\n  color: #fff; }\n\n.sr-only {\n  border: 0;\n  clip: rect(0, 0, 0, 0);\n  height: 1px;\n  margin: -1px;\n  overflow: hidden;\n  padding: 0;\n  position: absolute;\n  width: 1px; }\n\n.sr-only-focusable:active, .sr-only-focusable:focus {\n  clip: auto;\n  height: auto;\n  margin: 0;\n  overflow: visible;\n  position: static;\n  width: auto; }\n";

var css = function () {
  var dfp = DEFAULT_FAMILY_PREFIX;
  var drc = DEFAULT_REPLACEMENT_CLASS;
  var fp = config$1.familyPrefix;
  var rc = config$1.replacementClass;
  var s = baseStyles;

  if (fp !== dfp || rc !== drc) {
    var dPatt = new RegExp('\\.' + dfp + '\\-', 'g');
    var rPatt = new RegExp('\\.' + drc, 'g');

    s = s.replace(dPatt, '.' + fp + '-').replace(rPatt, '.' + rc);
  }

  return s;
};

function define(prefix, icons) {
  var normalized = Object.keys(icons).reduce(function (acc, iconName) {
    var icon = icons[iconName];
    var expanded = !!icon.icon;

    if (expanded) {
      acc[icon.iconName] = icon.icon;
    } else {
      acc[iconName] = icon;
    }
    return acc;
  }, {});

  if (typeof namespace.hooks.addPack === 'function') {
    namespace.hooks.addPack(prefix, normalized);
  } else {
    namespace.styles[prefix] = _extends({}, namespace.styles[prefix] || {}, normalized);
  }

  /**
   * Font Awesome 4 used the prefix of `fa` for all icons. With the introduction
   * of new styles we needed to differentiate between them. Prefix `fa` is now an alias
   * for `fas` so we'll easy the upgrade process for our users by automatically defining
   * this as well.
   */
  if (prefix === 'fas') {
    define('fa', icons);
  }
}

var Library = function () {
  function Library() {
    classCallCheck(this, Library);

    this.definitions = {};
  }

  createClass(Library, [{
    key: 'add',
    value: function add() {
      var _this = this;

      for (var _len = arguments.length, definitions = Array(_len), _key = 0; _key < _len; _key++) {
        definitions[_key] = arguments[_key];
      }

      var additions = definitions.reduce(this._pullDefinitions, {});

      Object.keys(additions).forEach(function (key) {
        _this.definitions[key] = _extends({}, _this.definitions[key] || {}, additions[key]);
        define(key, additions[key]);
      });
    }
  }, {
    key: 'reset',
    value: function reset() {
      this.definitions = {};
    }
  }, {
    key: '_pullDefinitions',
    value: function _pullDefinitions(additions, definition) {
      var normalized = definition.prefix && definition.iconName && definition.icon ? { 0: definition } : definition;

      Object.keys(normalized).map(function (key) {
        var _normalized$key = normalized[key],
            prefix = _normalized$key.prefix,
            iconName = _normalized$key.iconName,
            icon = _normalized$key.icon;


        if (!additions[prefix]) additions[prefix] = {};

        additions[prefix][iconName] = icon;
      });

      return additions;
    }
  }]);
  return Library;
}();

function prepIcon(icon) {
  var width = icon[0];
  var height = icon[1];
  var vectorData = icon.slice(4);

  return {
    found: true,
    width: width,
    height: height,
    icon: { tag: 'path', attributes: { fill: 'currentColor', d: vectorData[0] } }
  };
}

var _cssInserted = false;

function ensureCss() {
  if (!config$1.autoAddCss) {
    return;
  }

  if (!_cssInserted) {
    insertCss(css());
  }

  _cssInserted = true;
}

function apiObject(val, abstractCreator) {
  Object.defineProperty(val, 'abstract', {
    get: abstractCreator
  });

  Object.defineProperty(val, 'html', {
    get: function get() {
      return val.abstract.map(function (a) {
        return toHtml(a);
      });
    }
  });

  Object.defineProperty(val, 'node', {
    get: function get() {
      if (!IS_DOM) return;

      var container = DOCUMENT.createElement('div');
      container.innerHTML = val.html;
      return container.children;
    }
  });

  return val;
}

function findIconDefinition(params) {
  var _params$prefix = params.prefix,
      prefix = _params$prefix === undefined ? 'fa' : _params$prefix,
      iconName = params.iconName;


  if (!iconName) return;

  return iconFromMapping(library.definitions, prefix, iconName) || iconFromMapping(namespace.styles, prefix, iconName);
}

function resolveIcons(next) {
  return function (maybeIconDefinition) {
    var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var iconDefinition = (maybeIconDefinition || {}).icon ? maybeIconDefinition : findIconDefinition(maybeIconDefinition || {});

    var mask = params.mask;


    if (mask) {
      mask = (mask || {}).icon ? mask : findIconDefinition(mask || {});
    }

    return next(iconDefinition, _extends({}, params, { mask: mask }));
  };
}

var library = new Library();
var noAuto = function noAuto() {
  return auto(false);
};

var dom = {
  i2svg: function i2svg() {
    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    if (IS_DOM) {
      ensureCss();

      var _params$node = params.node,
          node = _params$node === undefined ? DOCUMENT : _params$node,
          _params$callback = params.callback,
          callback = _params$callback === undefined ? function () {} : _params$callback;


      if (config$1.searchPseudoElements) {
        searchPseudoElements(node);
      }

      onTree(node, callback);
    }
  },

  css: css,

  insertCss: function insertCss$$1() {
    insertCss(css());
  }
};

var parse = {
  transform: function transform(transformString) {
    return parseTransformString(transformString);
  }
};

var icon = resolveIcons(function (iconDefinition) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _params$transform = params.transform,
      transform = _params$transform === undefined ? meaninglessTransform : _params$transform,
      _params$symbol = params.symbol,
      symbol = _params$symbol === undefined ? false : _params$symbol,
      _params$mask = params.mask,
      mask = _params$mask === undefined ? null : _params$mask,
      _params$title = params.title,
      title = _params$title === undefined ? null : _params$title,
      _params$classes = params.classes,
      classes = _params$classes === undefined ? [] : _params$classes,
      _params$attributes = params.attributes,
      attributes = _params$attributes === undefined ? {} : _params$attributes,
      _params$styles = params.styles,
      styles = _params$styles === undefined ? {} : _params$styles;


  if (!iconDefinition) return;

  var prefix = iconDefinition.prefix,
      iconName = iconDefinition.iconName,
      icon = iconDefinition.icon;


  return apiObject(_extends({ type: 'icon' }, iconDefinition), function () {
    ensureCss();

    if (config$1.autoA11y) {
      if (title) {
        attributes['aria-labelledby'] = config$1.replacementClass + '-title-' + nextUniqueId();
      } else {
        attributes['aria-hidden'] = 'true';
      }
    }

    return makeInlineSvgAbstract({
      icons: {
        main: prepIcon(icon),
        mask: mask ? prepIcon(mask.icon) : { found: false, width: null, height: null, icon: {} }
      },
      prefix: prefix,
      iconName: iconName,
      transform: _extends({}, meaninglessTransform, transform),
      symbol: symbol,
      title: title,
      extra: {
        attributes: attributes,
        styles: styles,
        classes: classes
      }
    });
  });
});

var text = function text(content) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _params$transform2 = params.transform,
      transform = _params$transform2 === undefined ? meaninglessTransform : _params$transform2,
      _params$title2 = params.title,
      title = _params$title2 === undefined ? null : _params$title2,
      _params$classes2 = params.classes,
      classes = _params$classes2 === undefined ? [] : _params$classes2,
      _params$attributes2 = params.attributes,
      attributes = _params$attributes2 === undefined ? {} : _params$attributes2,
      _params$styles2 = params.styles,
      styles = _params$styles2 === undefined ? {} : _params$styles2;


  return apiObject({ type: 'text', content: content }, function () {
    ensureCss();

    return makeLayersTextAbstract({
      content: content,
      transform: _extends({}, meaninglessTransform, transform),
      title: title,
      extra: {
        attributes: attributes,
        styles: styles,
        classes: [config$1.familyPrefix + '-layers-text'].concat(toConsumableArray(classes))
      }
    });
  });
};

var layer = function layer(assembler) {
  return apiObject({ type: 'layer' }, function () {
    ensureCss();

    var children = [];

    assembler(function (args) {
      Array.isArray(args) ? children = args.map(function (a) {
        children = children.concat(a.abstract);
      }) : children = children.concat(args.abstract);
    });

    return [{
      tag: 'span',
      attributes: { class: config$1.familyPrefix + '-layers' },
      children: children
    }];
  });
};

var api$1 = {
  noAuto: noAuto,
  dom: dom,
  library: library,
  parse: parse,
  findIconDefinition: findIconDefinition,
  icon: icon,
  text: text,
  layer: layer
};

var autoReplace = function autoReplace() {
  if (IS_DOM && config$1.autoReplaceSvg) api$1.dom.i2svg({ node: DOCUMENT });
};

function bootstrap() {
  if (IS_BROWSER) {
    if (!WINDOW.FontAwesome) {
      WINDOW.FontAwesome = api$1;
    }

    domready(function () {
      if (Object.keys(namespace.styles).length > 0) {
        autoReplace();
      }

      if (config$1.observeMutations && typeof MutationObserver === 'function') {
        observe({
          treeCallback: onTree,
          nodeCallback: onNode,
          pseudoElementsCallback: searchPseudoElements
        });
      }
    });
  }

  namespace.hooks = _extends({}, namespace.hooks, {

    addPack: function addPack(prefix, icons) {
      namespace.styles[prefix] = _extends({}, namespace.styles[prefix] || {}, icons);

      build();
      autoReplace();
    },

    addShims: function addShims(shims) {
      var _namespace$shims;

      (_namespace$shims = namespace.shims).push.apply(_namespace$shims, toConsumableArray(shims));

      build();
      autoReplace();
    }
  });
}

Object.defineProperty(api$1, 'config', {
  get: function get() {
    return config$1;
  },

  set: function set(newConfig) {
    update(newConfig);
  }
});

if (IS_DOM) bunker(bootstrap);

var config = api$1.config;

exports.config = config;
exports['default'] = api$1;
exports.icon = icon;
exports.noAuto = noAuto;
exports.layer = layer;
exports.text = text;
exports.library = library;
exports.dom = dom;
exports.parse = parse;
exports.findIconDefinition = findIconDefinition;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],15:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/promise"), __esModule: true };
},{"core-js/library/fn/promise":16}],16:[function(require,module,exports){
require('../modules/es6.object.to-string');
require('../modules/es6.string.iterator');
require('../modules/web.dom.iterable');
require('../modules/es6.promise');
require('../modules/es7.promise.finally');
require('../modules/es7.promise.try');
module.exports = require('../modules/_core').Promise;

},{"../modules/_core":24,"../modules/es6.object.to-string":79,"../modules/es6.promise":80,"../modules/es6.string.iterator":81,"../modules/es7.promise.finally":82,"../modules/es7.promise.try":83,"../modules/web.dom.iterable":84}],17:[function(require,module,exports){
module.exports = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};

},{}],18:[function(require,module,exports){
module.exports = function () { /* empty */ };

},{}],19:[function(require,module,exports){
module.exports = function (it, Constructor, name, forbiddenField) {
  if (!(it instanceof Constructor) || (forbiddenField !== undefined && forbiddenField in it)) {
    throw TypeError(name + ': incorrect invocation!');
  } return it;
};

},{}],20:[function(require,module,exports){
var isObject = require('./_is-object');
module.exports = function (it) {
  if (!isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};

},{"./_is-object":41}],21:[function(require,module,exports){
// false -> Array#indexOf
// true  -> Array#includes
var toIObject = require('./_to-iobject');
var toLength = require('./_to-length');
var toAbsoluteIndex = require('./_to-absolute-index');
module.exports = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
      if (O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

},{"./_to-absolute-index":69,"./_to-iobject":71,"./_to-length":72}],22:[function(require,module,exports){
// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = require('./_cof');
var TAG = require('./_wks')('toStringTag');
// ES3 wrong here
var ARG = cof(function () { return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function (it, key) {
  try {
    return it[key];
  } catch (e) { /* empty */ }
};

module.exports = function (it) {
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};

},{"./_cof":23,"./_wks":76}],23:[function(require,module,exports){
var toString = {}.toString;

module.exports = function (it) {
  return toString.call(it).slice(8, -1);
};

},{}],24:[function(require,module,exports){
var core = module.exports = { version: '2.5.3' };
if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef

},{}],25:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./_a-function');
module.exports = function (fn, that, length) {
  aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

},{"./_a-function":17}],26:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};

},{}],27:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./_fails')(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});

},{"./_fails":31}],28:[function(require,module,exports){
var isObject = require('./_is-object');
var document = require('./_global').document;
// typeof document.createElement is 'object' in old IE
var is = isObject(document) && isObject(document.createElement);
module.exports = function (it) {
  return is ? document.createElement(it) : {};
};

},{"./_global":33,"./_is-object":41}],29:[function(require,module,exports){
// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');

},{}],30:[function(require,module,exports){
var global = require('./_global');
var core = require('./_core');
var ctx = require('./_ctx');
var hide = require('./_hide');
var PROTOTYPE = 'prototype';

var $export = function (type, name, source) {
  var IS_FORCED = type & $export.F;
  var IS_GLOBAL = type & $export.G;
  var IS_STATIC = type & $export.S;
  var IS_PROTO = type & $export.P;
  var IS_BIND = type & $export.B;
  var IS_WRAP = type & $export.W;
  var exports = IS_GLOBAL ? core : core[name] || (core[name] = {});
  var expProto = exports[PROTOTYPE];
  var target = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE];
  var key, own, out;
  if (IS_GLOBAL) source = name;
  for (key in source) {
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if (own && key in exports) continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function (C) {
      var F = function (a, b, c) {
        if (this instanceof C) {
          switch (arguments.length) {
            case 0: return new C();
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if (IS_PROTO) {
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if (type & $export.R && expProto && !expProto[key]) hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library`
module.exports = $export;

},{"./_core":24,"./_ctx":25,"./_global":33,"./_hide":35}],31:[function(require,module,exports){
module.exports = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};

},{}],32:[function(require,module,exports){
var ctx = require('./_ctx');
var call = require('./_iter-call');
var isArrayIter = require('./_is-array-iter');
var anObject = require('./_an-object');
var toLength = require('./_to-length');
var getIterFn = require('./core.get-iterator-method');
var BREAK = {};
var RETURN = {};
var exports = module.exports = function (iterable, entries, fn, that, ITERATOR) {
  var iterFn = ITERATOR ? function () { return iterable; } : getIterFn(iterable);
  var f = ctx(fn, that, entries ? 2 : 1);
  var index = 0;
  var length, step, iterator, result;
  if (typeof iterFn != 'function') throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if (isArrayIter(iterFn)) for (length = toLength(iterable.length); length > index; index++) {
    result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
    if (result === BREAK || result === RETURN) return result;
  } else for (iterator = iterFn.call(iterable); !(step = iterator.next()).done;) {
    result = call(iterator, f, step.value, entries);
    if (result === BREAK || result === RETURN) return result;
  }
};
exports.BREAK = BREAK;
exports.RETURN = RETURN;

},{"./_an-object":20,"./_ctx":25,"./_is-array-iter":40,"./_iter-call":42,"./_to-length":72,"./core.get-iterator-method":77}],33:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self
  // eslint-disable-next-line no-new-func
  : Function('return this')();
if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef

},{}],34:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function (it, key) {
  return hasOwnProperty.call(it, key);
};

},{}],35:[function(require,module,exports){
var dP = require('./_object-dp');
var createDesc = require('./_property-desc');
module.exports = require('./_descriptors') ? function (object, key, value) {
  return dP.f(object, key, createDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

},{"./_descriptors":27,"./_object-dp":52,"./_property-desc":59}],36:[function(require,module,exports){
var document = require('./_global').document;
module.exports = document && document.documentElement;

},{"./_global":33}],37:[function(require,module,exports){
module.exports = !require('./_descriptors') && !require('./_fails')(function () {
  return Object.defineProperty(require('./_dom-create')('div'), 'a', { get: function () { return 7; } }).a != 7;
});

},{"./_descriptors":27,"./_dom-create":28,"./_fails":31}],38:[function(require,module,exports){
// fast apply, http://jsperf.lnkit.com/fast-apply/5
module.exports = function (fn, args, that) {
  var un = that === undefined;
  switch (args.length) {
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
  } return fn.apply(that, args);
};

},{}],39:[function(require,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = require('./_cof');
// eslint-disable-next-line no-prototype-builtins
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
  return cof(it) == 'String' ? it.split('') : Object(it);
};

},{"./_cof":23}],40:[function(require,module,exports){
// check on default Array iterator
var Iterators = require('./_iterators');
var ITERATOR = require('./_wks')('iterator');
var ArrayProto = Array.prototype;

module.exports = function (it) {
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};

},{"./_iterators":47,"./_wks":76}],41:[function(require,module,exports){
module.exports = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

},{}],42:[function(require,module,exports){
// call something on iterator step with safe closing on error
var anObject = require('./_an-object');
module.exports = function (iterator, fn, value, entries) {
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch (e) {
    var ret = iterator['return'];
    if (ret !== undefined) anObject(ret.call(iterator));
    throw e;
  }
};

},{"./_an-object":20}],43:[function(require,module,exports){
'use strict';
var create = require('./_object-create');
var descriptor = require('./_property-desc');
var setToStringTag = require('./_set-to-string-tag');
var IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./_hide')(IteratorPrototype, require('./_wks')('iterator'), function () { return this; });

module.exports = function (Constructor, NAME, next) {
  Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
  setToStringTag(Constructor, NAME + ' Iterator');
};

},{"./_hide":35,"./_object-create":51,"./_property-desc":59,"./_set-to-string-tag":63,"./_wks":76}],44:[function(require,module,exports){
'use strict';
var LIBRARY = require('./_library');
var $export = require('./_export');
var redefine = require('./_redefine');
var hide = require('./_hide');
var has = require('./_has');
var Iterators = require('./_iterators');
var $iterCreate = require('./_iter-create');
var setToStringTag = require('./_set-to-string-tag');
var getPrototypeOf = require('./_object-gpo');
var ITERATOR = require('./_wks')('iterator');
var BUGGY = !([].keys && 'next' in [].keys()); // Safari has buggy iterators w/o `next`
var FF_ITERATOR = '@@iterator';
var KEYS = 'keys';
var VALUES = 'values';

var returnThis = function () { return this; };

module.exports = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
  $iterCreate(Constructor, NAME, next);
  var getMethod = function (kind) {
    if (!BUGGY && kind in proto) return proto[kind];
    switch (kind) {
      case KEYS: return function keys() { return new Constructor(this, kind); };
      case VALUES: return function values() { return new Constructor(this, kind); };
    } return function entries() { return new Constructor(this, kind); };
  };
  var TAG = NAME + ' Iterator';
  var DEF_VALUES = DEFAULT == VALUES;
  var VALUES_BUG = false;
  var proto = Base.prototype;
  var $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT];
  var $default = (!BUGGY && $native) || getMethod(DEFAULT);
  var $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined;
  var $anyNative = NAME == 'Array' ? proto.entries || $native : $native;
  var methods, key, IteratorPrototype;
  // Fix native
  if ($anyNative) {
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base()));
    if (IteratorPrototype !== Object.prototype && IteratorPrototype.next) {
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if (!LIBRARY && !has(IteratorPrototype, ITERATOR)) hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if (DEF_VALUES && $native && $native.name !== VALUES) {
    VALUES_BUG = true;
    $default = function values() { return $native.call(this); };
  }
  // Define iterator
  if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG] = returnThis;
  if (DEFAULT) {
    methods = {
      values: DEF_VALUES ? $default : getMethod(VALUES),
      keys: IS_SET ? $default : getMethod(KEYS),
      entries: $entries
    };
    if (FORCED) for (key in methods) {
      if (!(key in proto)) redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};

},{"./_export":30,"./_has":34,"./_hide":35,"./_iter-create":43,"./_iterators":47,"./_library":48,"./_object-gpo":54,"./_redefine":61,"./_set-to-string-tag":63,"./_wks":76}],45:[function(require,module,exports){
var ITERATOR = require('./_wks')('iterator');
var SAFE_CLOSING = false;

try {
  var riter = [7][ITERATOR]();
  riter['return'] = function () { SAFE_CLOSING = true; };
  // eslint-disable-next-line no-throw-literal
  Array.from(riter, function () { throw 2; });
} catch (e) { /* empty */ }

module.exports = function (exec, skipClosing) {
  if (!skipClosing && !SAFE_CLOSING) return false;
  var safe = false;
  try {
    var arr = [7];
    var iter = arr[ITERATOR]();
    iter.next = function () { return { done: safe = true }; };
    arr[ITERATOR] = function () { return iter; };
    exec(arr);
  } catch (e) { /* empty */ }
  return safe;
};

},{"./_wks":76}],46:[function(require,module,exports){
module.exports = function (done, value) {
  return { value: value, done: !!done };
};

},{}],47:[function(require,module,exports){
module.exports = {};

},{}],48:[function(require,module,exports){
module.exports = true;

},{}],49:[function(require,module,exports){
var global = require('./_global');
var macrotask = require('./_task').set;
var Observer = global.MutationObserver || global.WebKitMutationObserver;
var process = global.process;
var Promise = global.Promise;
var isNode = require('./_cof')(process) == 'process';

module.exports = function () {
  var head, last, notify;

  var flush = function () {
    var parent, fn;
    if (isNode && (parent = process.domain)) parent.exit();
    while (head) {
      fn = head.fn;
      head = head.next;
      try {
        fn();
      } catch (e) {
        if (head) notify();
        else last = undefined;
        throw e;
      }
    } last = undefined;
    if (parent) parent.enter();
  };

  // Node.js
  if (isNode) {
    notify = function () {
      process.nextTick(flush);
    };
  // browsers with MutationObserver, except iOS Safari - https://github.com/zloirock/core-js/issues/339
  } else if (Observer && !(global.navigator && global.navigator.standalone)) {
    var toggle = true;
    var node = document.createTextNode('');
    new Observer(flush).observe(node, { characterData: true }); // eslint-disable-line no-new
    notify = function () {
      node.data = toggle = !toggle;
    };
  // environments with maybe non-completely correct, but existent Promise
  } else if (Promise && Promise.resolve) {
    var promise = Promise.resolve();
    notify = function () {
      promise.then(flush);
    };
  // for other environments - macrotask based on:
  // - setImmediate
  // - MessageChannel
  // - window.postMessag
  // - onreadystatechange
  // - setTimeout
  } else {
    notify = function () {
      // strange IE + webpack dev server bug - use .call(global)
      macrotask.call(global, flush);
    };
  }

  return function (fn) {
    var task = { fn: fn, next: undefined };
    if (last) last.next = task;
    if (!head) {
      head = task;
      notify();
    } last = task;
  };
};

},{"./_cof":23,"./_global":33,"./_task":68}],50:[function(require,module,exports){
'use strict';
// 25.4.1.5 NewPromiseCapability(C)
var aFunction = require('./_a-function');

function PromiseCapability(C) {
  var resolve, reject;
  this.promise = new C(function ($$resolve, $$reject) {
    if (resolve !== undefined || reject !== undefined) throw TypeError('Bad Promise constructor');
    resolve = $$resolve;
    reject = $$reject;
  });
  this.resolve = aFunction(resolve);
  this.reject = aFunction(reject);
}

module.exports.f = function (C) {
  return new PromiseCapability(C);
};

},{"./_a-function":17}],51:[function(require,module,exports){
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject = require('./_an-object');
var dPs = require('./_object-dps');
var enumBugKeys = require('./_enum-bug-keys');
var IE_PROTO = require('./_shared-key')('IE_PROTO');
var Empty = function () { /* empty */ };
var PROTOTYPE = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = require('./_dom-create')('iframe');
  var i = enumBugKeys.length;
  var lt = '<';
  var gt = '>';
  var iframeDocument;
  iframe.style.display = 'none';
  require('./_html').appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while (i--) delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties) {
  var result;
  if (O !== null) {
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty();
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};

},{"./_an-object":20,"./_dom-create":28,"./_enum-bug-keys":29,"./_html":36,"./_object-dps":53,"./_shared-key":64}],52:[function(require,module,exports){
var anObject = require('./_an-object');
var IE8_DOM_DEFINE = require('./_ie8-dom-define');
var toPrimitive = require('./_to-primitive');
var dP = Object.defineProperty;

exports.f = require('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (IE8_DOM_DEFINE) try {
    return dP(O, P, Attributes);
  } catch (e) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

},{"./_an-object":20,"./_descriptors":27,"./_ie8-dom-define":37,"./_to-primitive":74}],53:[function(require,module,exports){
var dP = require('./_object-dp');
var anObject = require('./_an-object');
var getKeys = require('./_object-keys');

module.exports = require('./_descriptors') ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var keys = getKeys(Properties);
  var length = keys.length;
  var i = 0;
  var P;
  while (length > i) dP.f(O, P = keys[i++], Properties[P]);
  return O;
};

},{"./_an-object":20,"./_descriptors":27,"./_object-dp":52,"./_object-keys":56}],54:[function(require,module,exports){
// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has = require('./_has');
var toObject = require('./_to-object');
var IE_PROTO = require('./_shared-key')('IE_PROTO');
var ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function (O) {
  O = toObject(O);
  if (has(O, IE_PROTO)) return O[IE_PROTO];
  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};

},{"./_has":34,"./_shared-key":64,"./_to-object":73}],55:[function(require,module,exports){
var has = require('./_has');
var toIObject = require('./_to-iobject');
var arrayIndexOf = require('./_array-includes')(false);
var IE_PROTO = require('./_shared-key')('IE_PROTO');

module.exports = function (object, names) {
  var O = toIObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) if (key != IE_PROTO) has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (has(O, key = names[i++])) {
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

},{"./_array-includes":21,"./_has":34,"./_shared-key":64,"./_to-iobject":71}],56:[function(require,module,exports){
// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys = require('./_object-keys-internal');
var enumBugKeys = require('./_enum-bug-keys');

module.exports = Object.keys || function keys(O) {
  return $keys(O, enumBugKeys);
};

},{"./_enum-bug-keys":29,"./_object-keys-internal":55}],57:[function(require,module,exports){
module.exports = function (exec) {
  try {
    return { e: false, v: exec() };
  } catch (e) {
    return { e: true, v: e };
  }
};

},{}],58:[function(require,module,exports){
var anObject = require('./_an-object');
var isObject = require('./_is-object');
var newPromiseCapability = require('./_new-promise-capability');

module.exports = function (C, x) {
  anObject(C);
  if (isObject(x) && x.constructor === C) return x;
  var promiseCapability = newPromiseCapability.f(C);
  var resolve = promiseCapability.resolve;
  resolve(x);
  return promiseCapability.promise;
};

},{"./_an-object":20,"./_is-object":41,"./_new-promise-capability":50}],59:[function(require,module,exports){
module.exports = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

},{}],60:[function(require,module,exports){
var hide = require('./_hide');
module.exports = function (target, src, safe) {
  for (var key in src) {
    if (safe && target[key]) target[key] = src[key];
    else hide(target, key, src[key]);
  } return target;
};

},{"./_hide":35}],61:[function(require,module,exports){
module.exports = require('./_hide');

},{"./_hide":35}],62:[function(require,module,exports){
'use strict';
var global = require('./_global');
var core = require('./_core');
var dP = require('./_object-dp');
var DESCRIPTORS = require('./_descriptors');
var SPECIES = require('./_wks')('species');

module.exports = function (KEY) {
  var C = typeof core[KEY] == 'function' ? core[KEY] : global[KEY];
  if (DESCRIPTORS && C && !C[SPECIES]) dP.f(C, SPECIES, {
    configurable: true,
    get: function () { return this; }
  });
};

},{"./_core":24,"./_descriptors":27,"./_global":33,"./_object-dp":52,"./_wks":76}],63:[function(require,module,exports){
var def = require('./_object-dp').f;
var has = require('./_has');
var TAG = require('./_wks')('toStringTag');

module.exports = function (it, tag, stat) {
  if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, { configurable: true, value: tag });
};

},{"./_has":34,"./_object-dp":52,"./_wks":76}],64:[function(require,module,exports){
var shared = require('./_shared')('keys');
var uid = require('./_uid');
module.exports = function (key) {
  return shared[key] || (shared[key] = uid(key));
};

},{"./_shared":65,"./_uid":75}],65:[function(require,module,exports){
var global = require('./_global');
var SHARED = '__core-js_shared__';
var store = global[SHARED] || (global[SHARED] = {});
module.exports = function (key) {
  return store[key] || (store[key] = {});
};

},{"./_global":33}],66:[function(require,module,exports){
// 7.3.20 SpeciesConstructor(O, defaultConstructor)
var anObject = require('./_an-object');
var aFunction = require('./_a-function');
var SPECIES = require('./_wks')('species');
module.exports = function (O, D) {
  var C = anObject(O).constructor;
  var S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
};

},{"./_a-function":17,"./_an-object":20,"./_wks":76}],67:[function(require,module,exports){
var toInteger = require('./_to-integer');
var defined = require('./_defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function (TO_STRING) {
  return function (that, pos) {
    var s = String(defined(that));
    var i = toInteger(pos);
    var l = s.length;
    var a, b;
    if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};

},{"./_defined":26,"./_to-integer":70}],68:[function(require,module,exports){
var ctx = require('./_ctx');
var invoke = require('./_invoke');
var html = require('./_html');
var cel = require('./_dom-create');
var global = require('./_global');
var process = global.process;
var setTask = global.setImmediate;
var clearTask = global.clearImmediate;
var MessageChannel = global.MessageChannel;
var Dispatch = global.Dispatch;
var counter = 0;
var queue = {};
var ONREADYSTATECHANGE = 'onreadystatechange';
var defer, channel, port;
var run = function () {
  var id = +this;
  // eslint-disable-next-line no-prototype-builtins
  if (queue.hasOwnProperty(id)) {
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listener = function (event) {
  run.call(event.data);
};
// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
if (!setTask || !clearTask) {
  setTask = function setImmediate(fn) {
    var args = [];
    var i = 1;
    while (arguments.length > i) args.push(arguments[i++]);
    queue[++counter] = function () {
      // eslint-disable-next-line no-new-func
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id) {
    delete queue[id];
  };
  // Node.js 0.8-
  if (require('./_cof')(process) == 'process') {
    defer = function (id) {
      process.nextTick(ctx(run, id, 1));
    };
  // Sphere (JS game engine) Dispatch API
  } else if (Dispatch && Dispatch.now) {
    defer = function (id) {
      Dispatch.now(ctx(run, id, 1));
    };
  // Browsers with MessageChannel, includes WebWorkers
  } else if (MessageChannel) {
    channel = new MessageChannel();
    port = channel.port2;
    channel.port1.onmessage = listener;
    defer = ctx(port.postMessage, port, 1);
  // Browsers with postMessage, skip WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if (global.addEventListener && typeof postMessage == 'function' && !global.importScripts) {
    defer = function (id) {
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listener, false);
  // IE8-
  } else if (ONREADYSTATECHANGE in cel('script')) {
    defer = function (id) {
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function () {
        html.removeChild(this);
        run.call(id);
      };
    };
  // Rest old browsers
  } else {
    defer = function (id) {
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set: setTask,
  clear: clearTask
};

},{"./_cof":23,"./_ctx":25,"./_dom-create":28,"./_global":33,"./_html":36,"./_invoke":38}],69:[function(require,module,exports){
var toInteger = require('./_to-integer');
var max = Math.max;
var min = Math.min;
module.exports = function (index, length) {
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};

},{"./_to-integer":70}],70:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil = Math.ceil;
var floor = Math.floor;
module.exports = function (it) {
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

},{}],71:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./_iobject');
var defined = require('./_defined');
module.exports = function (it) {
  return IObject(defined(it));
};

},{"./_defined":26,"./_iobject":39}],72:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./_to-integer');
var min = Math.min;
module.exports = function (it) {
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

},{"./_to-integer":70}],73:[function(require,module,exports){
// 7.1.13 ToObject(argument)
var defined = require('./_defined');
module.exports = function (it) {
  return Object(defined(it));
};

},{"./_defined":26}],74:[function(require,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = require('./_is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function (it, S) {
  if (!isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};

},{"./_is-object":41}],75:[function(require,module,exports){
var id = 0;
var px = Math.random();
module.exports = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

},{}],76:[function(require,module,exports){
var store = require('./_shared')('wks');
var uid = require('./_uid');
var Symbol = require('./_global').Symbol;
var USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function (name) {
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;

},{"./_global":33,"./_shared":65,"./_uid":75}],77:[function(require,module,exports){
var classof = require('./_classof');
var ITERATOR = require('./_wks')('iterator');
var Iterators = require('./_iterators');
module.exports = require('./_core').getIteratorMethod = function (it) {
  if (it != undefined) return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};

},{"./_classof":22,"./_core":24,"./_iterators":47,"./_wks":76}],78:[function(require,module,exports){
'use strict';
var addToUnscopables = require('./_add-to-unscopables');
var step = require('./_iter-step');
var Iterators = require('./_iterators');
var toIObject = require('./_to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = require('./_iter-define')(Array, 'Array', function (iterated, kind) {
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var kind = this._k;
  var index = this._i++;
  if (!O || index >= O.length) {
    this._t = undefined;
    return step(1);
  }
  if (kind == 'keys') return step(0, index);
  if (kind == 'values') return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');

},{"./_add-to-unscopables":18,"./_iter-define":44,"./_iter-step":46,"./_iterators":47,"./_to-iobject":71}],79:[function(require,module,exports){

},{}],80:[function(require,module,exports){
'use strict';
var LIBRARY = require('./_library');
var global = require('./_global');
var ctx = require('./_ctx');
var classof = require('./_classof');
var $export = require('./_export');
var isObject = require('./_is-object');
var aFunction = require('./_a-function');
var anInstance = require('./_an-instance');
var forOf = require('./_for-of');
var speciesConstructor = require('./_species-constructor');
var task = require('./_task').set;
var microtask = require('./_microtask')();
var newPromiseCapabilityModule = require('./_new-promise-capability');
var perform = require('./_perform');
var promiseResolve = require('./_promise-resolve');
var PROMISE = 'Promise';
var TypeError = global.TypeError;
var process = global.process;
var $Promise = global[PROMISE];
var isNode = classof(process) == 'process';
var empty = function () { /* empty */ };
var Internal, newGenericPromiseCapability, OwnPromiseCapability, Wrapper;
var newPromiseCapability = newGenericPromiseCapability = newPromiseCapabilityModule.f;

var USE_NATIVE = !!function () {
  try {
    // correct subclassing with @@species support
    var promise = $Promise.resolve(1);
    var FakePromise = (promise.constructor = {})[require('./_wks')('species')] = function (exec) {
      exec(empty, empty);
    };
    // unhandled rejections tracking support, NodeJS Promise without it fails @@species test
    return (isNode || typeof PromiseRejectionEvent == 'function') && promise.then(empty) instanceof FakePromise;
  } catch (e) { /* empty */ }
}();

// helpers
var isThenable = function (it) {
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};
var notify = function (promise, isReject) {
  if (promise._n) return;
  promise._n = true;
  var chain = promise._c;
  microtask(function () {
    var value = promise._v;
    var ok = promise._s == 1;
    var i = 0;
    var run = function (reaction) {
      var handler = ok ? reaction.ok : reaction.fail;
      var resolve = reaction.resolve;
      var reject = reaction.reject;
      var domain = reaction.domain;
      var result, then;
      try {
        if (handler) {
          if (!ok) {
            if (promise._h == 2) onHandleUnhandled(promise);
            promise._h = 1;
          }
          if (handler === true) result = value;
          else {
            if (domain) domain.enter();
            result = handler(value);
            if (domain) domain.exit();
          }
          if (result === reaction.promise) {
            reject(TypeError('Promise-chain cycle'));
          } else if (then = isThenable(result)) {
            then.call(result, resolve, reject);
          } else resolve(result);
        } else reject(value);
      } catch (e) {
        reject(e);
      }
    };
    while (chain.length > i) run(chain[i++]); // variable length - can't use forEach
    promise._c = [];
    promise._n = false;
    if (isReject && !promise._h) onUnhandled(promise);
  });
};
var onUnhandled = function (promise) {
  task.call(global, function () {
    var value = promise._v;
    var unhandled = isUnhandled(promise);
    var result, handler, console;
    if (unhandled) {
      result = perform(function () {
        if (isNode) {
          process.emit('unhandledRejection', value, promise);
        } else if (handler = global.onunhandledrejection) {
          handler({ promise: promise, reason: value });
        } else if ((console = global.console) && console.error) {
          console.error('Unhandled promise rejection', value);
        }
      });
      // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
      promise._h = isNode || isUnhandled(promise) ? 2 : 1;
    } promise._a = undefined;
    if (unhandled && result.e) throw result.v;
  });
};
var isUnhandled = function (promise) {
  return promise._h !== 1 && (promise._a || promise._c).length === 0;
};
var onHandleUnhandled = function (promise) {
  task.call(global, function () {
    var handler;
    if (isNode) {
      process.emit('rejectionHandled', promise);
    } else if (handler = global.onrejectionhandled) {
      handler({ promise: promise, reason: promise._v });
    }
  });
};
var $reject = function (value) {
  var promise = this;
  if (promise._d) return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  promise._v = value;
  promise._s = 2;
  if (!promise._a) promise._a = promise._c.slice();
  notify(promise, true);
};
var $resolve = function (value) {
  var promise = this;
  var then;
  if (promise._d) return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  try {
    if (promise === value) throw TypeError("Promise can't be resolved itself");
    if (then = isThenable(value)) {
      microtask(function () {
        var wrapper = { _w: promise, _d: false }; // wrap
        try {
          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
        } catch (e) {
          $reject.call(wrapper, e);
        }
      });
    } else {
      promise._v = value;
      promise._s = 1;
      notify(promise, false);
    }
  } catch (e) {
    $reject.call({ _w: promise, _d: false }, e); // wrap
  }
};

// constructor polyfill
if (!USE_NATIVE) {
  // 25.4.3.1 Promise(executor)
  $Promise = function Promise(executor) {
    anInstance(this, $Promise, PROMISE, '_h');
    aFunction(executor);
    Internal.call(this);
    try {
      executor(ctx($resolve, this, 1), ctx($reject, this, 1));
    } catch (err) {
      $reject.call(this, err);
    }
  };
  // eslint-disable-next-line no-unused-vars
  Internal = function Promise(executor) {
    this._c = [];             // <- awaiting reactions
    this._a = undefined;      // <- checked in isUnhandled reactions
    this._s = 0;              // <- state
    this._d = false;          // <- done
    this._v = undefined;      // <- value
    this._h = 0;              // <- rejection state, 0 - default, 1 - handled, 2 - unhandled
    this._n = false;          // <- notify
  };
  Internal.prototype = require('./_redefine-all')($Promise.prototype, {
    // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
    then: function then(onFulfilled, onRejected) {
      var reaction = newPromiseCapability(speciesConstructor(this, $Promise));
      reaction.ok = typeof onFulfilled == 'function' ? onFulfilled : true;
      reaction.fail = typeof onRejected == 'function' && onRejected;
      reaction.domain = isNode ? process.domain : undefined;
      this._c.push(reaction);
      if (this._a) this._a.push(reaction);
      if (this._s) notify(this, false);
      return reaction.promise;
    },
    // 25.4.5.1 Promise.prototype.catch(onRejected)
    'catch': function (onRejected) {
      return this.then(undefined, onRejected);
    }
  });
  OwnPromiseCapability = function () {
    var promise = new Internal();
    this.promise = promise;
    this.resolve = ctx($resolve, promise, 1);
    this.reject = ctx($reject, promise, 1);
  };
  newPromiseCapabilityModule.f = newPromiseCapability = function (C) {
    return C === $Promise || C === Wrapper
      ? new OwnPromiseCapability(C)
      : newGenericPromiseCapability(C);
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, { Promise: $Promise });
require('./_set-to-string-tag')($Promise, PROMISE);
require('./_set-species')(PROMISE);
Wrapper = require('./_core')[PROMISE];

// statics
$export($export.S + $export.F * !USE_NATIVE, PROMISE, {
  // 25.4.4.5 Promise.reject(r)
  reject: function reject(r) {
    var capability = newPromiseCapability(this);
    var $$reject = capability.reject;
    $$reject(r);
    return capability.promise;
  }
});
$export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, {
  // 25.4.4.6 Promise.resolve(x)
  resolve: function resolve(x) {
    return promiseResolve(LIBRARY && this === Wrapper ? $Promise : this, x);
  }
});
$export($export.S + $export.F * !(USE_NATIVE && require('./_iter-detect')(function (iter) {
  $Promise.all(iter)['catch'](empty);
})), PROMISE, {
  // 25.4.4.1 Promise.all(iterable)
  all: function all(iterable) {
    var C = this;
    var capability = newPromiseCapability(C);
    var resolve = capability.resolve;
    var reject = capability.reject;
    var result = perform(function () {
      var values = [];
      var index = 0;
      var remaining = 1;
      forOf(iterable, false, function (promise) {
        var $index = index++;
        var alreadyCalled = false;
        values.push(undefined);
        remaining++;
        C.resolve(promise).then(function (value) {
          if (alreadyCalled) return;
          alreadyCalled = true;
          values[$index] = value;
          --remaining || resolve(values);
        }, reject);
      });
      --remaining || resolve(values);
    });
    if (result.e) reject(result.v);
    return capability.promise;
  },
  // 25.4.4.4 Promise.race(iterable)
  race: function race(iterable) {
    var C = this;
    var capability = newPromiseCapability(C);
    var reject = capability.reject;
    var result = perform(function () {
      forOf(iterable, false, function (promise) {
        C.resolve(promise).then(capability.resolve, reject);
      });
    });
    if (result.e) reject(result.v);
    return capability.promise;
  }
});

},{"./_a-function":17,"./_an-instance":19,"./_classof":22,"./_core":24,"./_ctx":25,"./_export":30,"./_for-of":32,"./_global":33,"./_is-object":41,"./_iter-detect":45,"./_library":48,"./_microtask":49,"./_new-promise-capability":50,"./_perform":57,"./_promise-resolve":58,"./_redefine-all":60,"./_set-species":62,"./_set-to-string-tag":63,"./_species-constructor":66,"./_task":68,"./_wks":76}],81:[function(require,module,exports){
'use strict';
var $at = require('./_string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
require('./_iter-define')(String, 'String', function (iterated) {
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var index = this._i;
  var point;
  if (index >= O.length) return { value: undefined, done: true };
  point = $at(O, index);
  this._i += point.length;
  return { value: point, done: false };
});

},{"./_iter-define":44,"./_string-at":67}],82:[function(require,module,exports){
// https://github.com/tc39/proposal-promise-finally
'use strict';
var $export = require('./_export');
var core = require('./_core');
var global = require('./_global');
var speciesConstructor = require('./_species-constructor');
var promiseResolve = require('./_promise-resolve');

$export($export.P + $export.R, 'Promise', { 'finally': function (onFinally) {
  var C = speciesConstructor(this, core.Promise || global.Promise);
  var isFunction = typeof onFinally == 'function';
  return this.then(
    isFunction ? function (x) {
      return promiseResolve(C, onFinally()).then(function () { return x; });
    } : onFinally,
    isFunction ? function (e) {
      return promiseResolve(C, onFinally()).then(function () { throw e; });
    } : onFinally
  );
} });

},{"./_core":24,"./_export":30,"./_global":33,"./_promise-resolve":58,"./_species-constructor":66}],83:[function(require,module,exports){
'use strict';
// https://github.com/tc39/proposal-promise-try
var $export = require('./_export');
var newPromiseCapability = require('./_new-promise-capability');
var perform = require('./_perform');

$export($export.S, 'Promise', { 'try': function (callbackfn) {
  var promiseCapability = newPromiseCapability.f(this);
  var result = perform(callbackfn);
  (result.e ? promiseCapability.reject : promiseCapability.resolve)(result.v);
  return promiseCapability.promise;
} });

},{"./_export":30,"./_new-promise-capability":50,"./_perform":57}],84:[function(require,module,exports){
require('./es6.array.iterator');
var global = require('./_global');
var hide = require('./_hide');
var Iterators = require('./_iterators');
var TO_STRING_TAG = require('./_wks')('toStringTag');

var DOMIterables = ('CSSRuleList,CSSStyleDeclaration,CSSValueList,ClientRectList,DOMRectList,DOMStringList,' +
  'DOMTokenList,DataTransferItemList,FileList,HTMLAllCollection,HTMLCollection,HTMLFormElement,HTMLSelectElement,' +
  'MediaList,MimeTypeArray,NamedNodeMap,NodeList,PaintRequestList,Plugin,PluginArray,SVGLengthList,SVGNumberList,' +
  'SVGPathSegList,SVGPointList,SVGStringList,SVGTransformList,SourceBufferList,StyleSheetList,TextTrackCueList,' +
  'TextTrackList,TouchList').split(',');

for (var i = 0; i < DOMIterables.length; i++) {
  var NAME = DOMIterables[i];
  var Collection = global[NAME];
  var proto = Collection && Collection.prototype;
  if (proto && !proto[TO_STRING_TAG]) hide(proto, TO_STRING_TAG, NAME);
  Iterators[NAME] = Iterators.Array;
}

},{"./_global":33,"./_hide":35,"./_iterators":47,"./_wks":76,"./es6.array.iterator":78}],85:[function(require,module,exports){
'use strict';

// Store setTimeout reference so promise-polyfill will be unaffected by
// other code modifying setTimeout (like sinon.useFakeTimers())
var setTimeoutFunc = setTimeout;

function noop() {}

// Polyfill for Function.prototype.bind
function bind(fn, thisArg) {
  return function() {
    fn.apply(thisArg, arguments);
  };
}

function Promise(fn) {
  if (!(this instanceof Promise))
    throw new TypeError('Promises must be constructed via new');
  if (typeof fn !== 'function') throw new TypeError('not a function');
  this._state = 0;
  this._handled = false;
  this._value = undefined;
  this._deferreds = [];

  doResolve(fn, this);
}

function handle(self, deferred) {
  while (self._state === 3) {
    self = self._value;
  }
  if (self._state === 0) {
    self._deferreds.push(deferred);
    return;
  }
  self._handled = true;
  Promise._immediateFn(function() {
    var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
      return;
    }
    var ret;
    try {
      ret = cb(self._value);
    } catch (e) {
      reject(deferred.promise, e);
      return;
    }
    resolve(deferred.promise, ret);
  });
}

function resolve(self, newValue) {
  try {
    // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
    if (newValue === self)
      throw new TypeError('A promise cannot be resolved with itself.');
    if (
      newValue &&
      (typeof newValue === 'object' || typeof newValue === 'function')
    ) {
      var then = newValue.then;
      if (newValue instanceof Promise) {
        self._state = 3;
        self._value = newValue;
        finale(self);
        return;
      } else if (typeof then === 'function') {
        doResolve(bind(then, newValue), self);
        return;
      }
    }
    self._state = 1;
    self._value = newValue;
    finale(self);
  } catch (e) {
    reject(self, e);
  }
}

function reject(self, newValue) {
  self._state = 2;
  self._value = newValue;
  finale(self);
}

function finale(self) {
  if (self._state === 2 && self._deferreds.length === 0) {
    Promise._immediateFn(function() {
      if (!self._handled) {
        Promise._unhandledRejectionFn(self._value);
      }
    });
  }

  for (var i = 0, len = self._deferreds.length; i < len; i++) {
    handle(self, self._deferreds[i]);
  }
  self._deferreds = null;
}

function Handler(onFulfilled, onRejected, promise) {
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, self) {
  var done = false;
  try {
    fn(
      function(value) {
        if (done) return;
        done = true;
        resolve(self, value);
      },
      function(reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      }
    );
  } catch (ex) {
    if (done) return;
    done = true;
    reject(self, ex);
  }
}

Promise.prototype['catch'] = function(onRejected) {
  return this.then(null, onRejected);
};

Promise.prototype.then = function(onFulfilled, onRejected) {
  var prom = new this.constructor(noop);

  handle(this, new Handler(onFulfilled, onRejected, prom));
  return prom;
};

Promise.prototype['finally'] = function(callback) {
  var constructor = this.constructor;
  return this.then(
    function(value) {
      return constructor.resolve(callback()).then(function() {
        return value;
      });
    },
    function(reason) {
      return constructor.resolve(callback()).then(function() {
        return constructor.reject(reason);
      });
    }
  );
};

Promise.all = function(arr) {
  return new Promise(function(resolve, reject) {
    if (!arr || typeof arr.length === 'undefined')
      throw new TypeError('Promise.all accepts an array');
    var args = Array.prototype.slice.call(arr);
    if (args.length === 0) return resolve([]);
    var remaining = args.length;

    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then;
          if (typeof then === 'function') {
            then.call(
              val,
              function(val) {
                res(i, val);
              },
              reject
            );
            return;
          }
        }
        args[i] = val;
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex);
      }
    }

    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.resolve = function(value) {
  if (value && typeof value === 'object' && value.constructor === Promise) {
    return value;
  }

  return new Promise(function(resolve) {
    resolve(value);
  });
};

Promise.reject = function(value) {
  return new Promise(function(resolve, reject) {
    reject(value);
  });
};

Promise.race = function(values) {
  return new Promise(function(resolve, reject) {
    for (var i = 0, len = values.length; i < len; i++) {
      values[i].then(resolve, reject);
    }
  });
};

// Use polyfill for setImmediate for performance gains
Promise._immediateFn =
  (typeof setImmediate === 'function' &&
    function(fn) {
      setImmediate(fn);
    }) ||
  function(fn) {
    setTimeoutFunc(fn, 0);
  };

Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
  if (typeof console !== 'undefined' && console) {
    console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
  }
};

module.exports = Promise;

},{}],86:[function(require,module,exports){
(function() {
  "use strict"

  var event = KeyboardEvent.prototype
  var desc = Object.getOwnPropertyDescriptor(event, "key")
  if (!desc) return

  var keys = {
    Win: "Meta",
    Scroll: "ScrollLock",
    Spacebar: " ",

    Down: "ArrowDown",
    Left: "ArrowLeft",
    Right: "ArrowRight",
    Up: "ArrowUp",

    Del: "Delete",
    Apps: "ContextMenu",
    Esc: "Escape",

    Multiply: "*",
    Add: "+",
    Subtract: "-",
    Decimal: ".",
    Divide: "/",
  }

  Object.defineProperty(event, "key", {
    get: function() {
      var key = desc.get.call(this)

      return keys.hasOwnProperty(key) ? keys[key] : key
    },
  })
})()

},{}]},{},[12])


//# sourceMappingURL=bundle.js.map
