(function () {
	"use strict";

	module.exports = function (elements) {
		let methods = {};
		let events = {
			"keyUp": function () {
				return false
			},
			"focus": function () {
				return false;
			},
			"blur": function () {
				return false;
			}
		};

		let _builder = {
			"setInputClass": function () {
				elements.get("ikt-autocomplete-input").classList.add("ikt-autocomplete-input");
				return this;
			},
			"setEvents": function () {
				elements.get("ikt-autocomplete-input").addEventListener("keyup", function (ev) {
					ev.stopPropagation();
					return (ev.key.length > 1 && ev.key !== "Backspace") ? false : events.keyUp(elements.get("ikt-autocomplete-input").value || "");
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
			"attachToAnchor": function () {
				elements.get("ikt-autocomplete").appendChild(elements.get("ikt-autocomplete-input"));
				return this;
			},
			"createInput": function () {
				elements.set("ikt-autocomplete-input", document.createElement("input"));
				return this.setInputClass().setEvents().attachToAnchor();
			}
		};

		_builder.createInput();
		return {methods, events};
	}

}());