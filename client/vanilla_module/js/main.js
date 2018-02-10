(function () {
    "use strict";

	require("shim-keyboard-event-key");
	require("classlist-polyfill");
	if (!Array.prototype.find) {
		Array.prototype.find = require("../../etc/shared_libs/polyfills").find;
	}

	if (!window.Promise) {
		window.Promise = require("promise-polyfill");
	}

	require("@fortawesome/fontawesome");
	require("@fortawesome/fontawesome-pro-light");

	let Autocomplete = require("./components/autocomplete/autocomplete");
	new Autocomplete({
		"anchorReference": "#app-search-autocomplete",
		"queryEndpoint": "url"
	});

}());