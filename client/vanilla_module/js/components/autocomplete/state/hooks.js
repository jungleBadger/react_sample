(function () {
	"use strict";

	module.exports = function () {
		let _hooks = {
			"queryResults": [],
			"openSelect": [],
			"selectedCode": []
		};
		return {
			"get": function (prop) {
				return _hooks[prop]
			},
			"setDependency": function (prop, handler) {
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
			"resetDependencies": function (prop) {
				_hooks[prop] = [];
			},
			"propagate": function (prop, newValue) {
				if (!prop) {
					throw new Error("Invalid value to set");
				} else {
					_hooks[prop].forEach(dependency => dependency(newValue));
				}
			}
		}
	}

}());