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

	require("./components/Autocomplete.jsx");

}());