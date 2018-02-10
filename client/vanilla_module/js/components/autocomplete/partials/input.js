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
			"setIcon": function () {
				let span = document.createElement("span");
				let i = document.createElement("i");
				span.classList.add("icon");
				span.classList.add("is-small");
				span.classList.add("is-left");
				i.classList.add("fal");
				i.classList.add("fa-search");
				span.appendChild(i);
				elements.get("ikt-autocomplete-input-wrapper").appendChild(span);
				return this;
			},
			"setPlaceholder": function () {
				elements.get("ikt-autocomplete-input").setAttribute("placeholder", "Type to search");
				return this;
			},
			"setInputClass": function () {
				elements.get("ikt-autocomplete-input").classList.add("ikt-autocomplete-input");
				elements.get("ikt-autocomplete-input").classList.add("input");
				elements.get("ikt-autocomplete-input-wrapper").classList.add("has-icons-left");
				elements.get("ikt-autocomplete-input-wrapper").classList.add("control");

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
				elements.get("ikt-autocomplete-input-wrapper").appendChild(elements.get("ikt-autocomplete-input"));

				elements.get("ikt-autocomplete").appendChild(elements.get("ikt-autocomplete-input-wrapper"));
				return this;
			},
			"createInput": function () {
				elements.set("ikt-autocomplete-input-wrapper", document.createElement("p"));
				elements.set("ikt-autocomplete-input", document.createElement("input"));
				return this.setInputClass().setPlaceholder().setEvents().setIcon().attachToAnchor();
			}
		};

		_builder.createInput();
		return {methods, events};
	}

}());