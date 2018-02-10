(function () {
	"use strict";

	module.exports = function (anchorElement) {
		if (!anchorElement) {
			throw new Error("Can not proceed without a valid HTML element to hold the element");
		} else {
			anchorElement.classList.add("ikt-autocomplete");
		}
		let _elements = {
			"ikt-autocomplete": anchorElement,
			"app-results": document.querySelector("#app-results")
		};

		return {
			"get": function (el) {
				if (!_elements[el]) {
					throw new Error(`Element ${el} not found`)
				} else {
					return _elements[el];
				}
			},
			"set": function (el, value = "") {
				if (!el) {
					throw new Error("Invalid element to set");
				} else {
					_elements[el] = value;
				}
			}
		}
	}

}());