(function () {
    "use strict";

    const Elements = require("./elements/elements");
    const Config = require("./configs/config");
    const State = require("./state/state");
    const factory = require("./factory/factory");
    const inputElement = require("./partials/input");
	const selectElement = require("./partials/select");

    module.exports = function Constructor(params = {}) {
		let configs = new Config(params);
		let elements = new Elements(document.querySelector(params.anchorReference));
		let state = new State();

		let _methods = {
			"isDecreasing": function (currentValueLength = 0, newValueLength = 0) {
				return newValueLength < currentValueLength;
			},
			"isOnCooldown": function () {
				return state.get("lastUpdate") ? Date.now() - state.get("lastUpdate") < state.get("queryCooldown") : false;
			},
			"shouldQuery": function (valueLength) {
				return valueLength >= state.get("minLengthToQuery");
			},
			"performQuery": function () {
				factory.queryCountries(state.get("queryString"))
					.then(result => {
						console.log(result);
						state.commit("queryResults", result);
						state.commit("lastUpdate", Date.now());
					})
					.catch(err => err)
					.then(() => {
						if (state.get("queryResults").length >= 1) {
							state.commit("queryCache", state.get("queryResults"));
						}
					});
			},
			"performCacheFilter": function () {
				state.commit("queryResults",
					factory.queryCache(
						state.get("queryCache"),
						state.get("queryString")
					)
				);
			},
			"receiveInput": function (value) {
				if (!value.length) {
					state.commit("queryString", "");
					state.commit("queryResults", []);
				} else {

					let isDecreasing = _methods.isDecreasing(
						state.get("queryString").length,
						value.length
					);
					let shouldQuery = _methods.shouldQuery(value.length);
					let isOnCooldown = _methods.isOnCooldown();

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
			"handleFocus": function () {
				state.commit("openSelect", true);
				console.log("focus");
			},
			"handleBlur": function () {
				state.commit("openSelect", false);
				console.log("blur")
			},
			"selectOption": function (option) {
				console.log(option);
			}
		};

		return (function () {
			const input = inputElement(elements, configs);
			const select = selectElement(elements, configs, state);
			input.events.keyUp = _methods.receiveInput;
			input.events.focus = _methods.handleFocus;
			input.events.blur = _methods.handleBlur;
			select.events.click = _methods.selectOption;
			state.registerDependency("queryResults", select.methods.renderOptions);
			state.registerDependency("openSelect", select.methods.toggleSelect);

			return {configs, elements, input, select};
		}());
	}

}());