(function () {
	"use strict";

	const hooks = require("./hooks")();

	module.exports = function () {
		let _state = {
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
			"get": function (prop) {
				if (!_state.hasOwnProperty([prop])) {
					throw new Error(`Property ${prop} not found`)
				} else {
					return _state[prop];
				}
			},
			"commit": function (prop, value = "") {
				if (!prop) {
					throw new Error("Invalid value to set");
				} else {
					_state[prop] = value;
					if (hooks.get(prop)) {

						hooks.propagate(prop, _state[prop]);
					}
				}
			},
			"registerDependency": function (prop, handler) {
				hooks.setDependency(prop, handler);
			}
		}
	}

}());