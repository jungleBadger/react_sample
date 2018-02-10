(function () {
    "use strict";

	require("shim-keyboard-event-key");
	if (!Array.prototype.find) {
		Array.prototype.find = require("../../etc/shared_libs/polyfills").find;
	}

	if (!window.Promise) {
		window.Promise = require("promise-polyfill");
	}

	let Autocomplete = require("./components/autocomplete/autocomplete");
	new Autocomplete({
		"anchorReference": "#autocomplete",
		"queryEndpoint": "url"
	});

}());