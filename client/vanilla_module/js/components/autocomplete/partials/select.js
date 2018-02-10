(function () {
	"use strict";

	module.exports = function (elements) {

		let props = {
			"currentOptions": []
		};

		let methods = {
			"renderOptions": function (options) {
				props.currentOptions = options;
				return _builder.buildOptions(props.currentOptions);
			},
			"toggleSelect": function (isClosed) {
				if (isClosed) {
					elements.get("ikt-autocomplete-select").classList.remove("is__hidden");
				} else {
					setTimeout(() => {
						elements.get("ikt-autocomplete-select").classList.add("is__hidden");
					}, 300);
				}
			}
		};
		let events = {
			"click": function () {
				return false
			}
		};

		let _builder = {
			"setSelectClass": function () {
				elements.get("ikt-autocomplete-select").classList.add("ikt-autocomplete-select");
				elements.get("ikt-autocomplete-select").classList.add("is__hidden");
				return this;
			},
			"setEvents": function (element) {
				element.addEventListener("click", function (ev) {
					ev.stopPropagation();
					return events.click(props.currentOptions[this.getAttribute("data-id")]);
				});
				return this;
			},
			"clearOptions": function () {
				while (elements.get("ikt-autocomplete-select").firstChild) {
					elements.get("ikt-autocomplete-select").removeChild(elements.get("ikt-autocomplete-select").firstChild);
				}
			},
			"buildOptionTile": function (key, value) {
				let span = document.createElement("span");
				let info_value = document.createElement("span");
				info_value.appendChild(document.createTextNode(value));
				span.classList.add("ikt-autocomplete-select-option-tile");
				info_value.classList.add("ikt-autocomplete-select-option-tile-value");
				span.appendChild(info_value);
				return span;
			},
			"buildOption": function (option = {}, index) {
				let optionDiv = document.createElement("div");
				this.setEvents(optionDiv);

				if (option.selected) {
					optionDiv.classList.add("is__selected");
				}

				optionDiv.classList.add("ikt-autocomplete-select-option");
				optionDiv.setAttribute("data-id", index);
				for (let prop in option) {
					if (option.hasOwnProperty(prop)&& typeof option[prop] === "string") {
						optionDiv.appendChild(this.buildOptionTile(prop, option[prop]));
					}
				}
				return optionDiv;
			},
			"buildEmptyOption": function () {
				let emptyOptionDiv = document.createElement("div");
				let optionText = document.createElement("span");

				emptyOptionDiv.classList.add("ikt-autocomplete-select-option");
				emptyOptionDiv.classList.add("is__empty");
				optionText.appendChild(document.createTextNode("No results found. Try changing your query"));

				emptyOptionDiv.appendChild(optionText);
				return emptyOptionDiv;
			},
			"buildOptions": function (options = []) {
				let optionsDiv = document.createElement("div");
				optionsDiv.classList.add("ikt-autocomplete-select-options");

				if (options.length) {
					options.forEach((option, index) => {
						optionsDiv.appendChild(this.buildOption(option, index));
					});
				} else {
					optionsDiv.appendChild(this.buildEmptyOption());
				}

				this.clearOptions();
				elements.get("ikt-autocomplete-select").appendChild(optionsDiv);
			},
			"attachToAnchor": function () {
				elements.get("ikt-autocomplete").appendChild(elements.get("ikt-autocomplete-select"));
				return this;
			},
			"createSelect": function () {
				elements.set("ikt-autocomplete-select", document.createElement("div"));
				return this.setSelectClass().attachToAnchor();
			}
		};



		_builder.createSelect();
		return {methods, events};
	}

}());