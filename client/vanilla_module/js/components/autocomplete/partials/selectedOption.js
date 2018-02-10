(function () {
	"use strict";

	module.exports = function (elements) {

		let props = {
			"selectedOption": []
		};

		let methods = {
			"renderResult": function (option) {
				props.selectedOption = option;
				_builder.clearOptions();
				return _builder.buildResults(props.selectedOption);
			}
		};
		let events = {
			"click": function () {
				return false
			}
		};

		let _builder = {
			"setSelectClass": function () {
				elements.get("ikt-autocomplete-result").classList.add("ikt-autocomplete-result");
				return this;
			},
			"setEvents": function (element) {
				element.addEventListener("click", function (ev) {
					ev.stopPropagation();
					return events.click(this);
				});
				return this;
			},
			"buildResults": function () {
				if (props.selectedOption) {
					let div = document.createElement("div");
					let country = document.createElement("span");
					let countryCode = document.createElement("span");

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
			"clearOptions": function () {
				while (elements.get("ikt-autocomplete-result").firstChild) {
					elements.get("ikt-autocomplete-result").removeChild(elements.get("ikt-autocomplete-result").firstChild);
				}
			},
			"attachToAnchor": function () {
				elements.get("app-results").appendChild(elements.get("ikt-autocomplete-result"));
				return this;
			},
			"createHolder": function () {
				elements.set("ikt-autocomplete-result", document.createElement("div"));
				return this.setSelectClass().attachToAnchor();
			}
		};



		_builder.createHolder();
		return {methods, events};
	}

}());