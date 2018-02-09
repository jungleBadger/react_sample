(function () {
    "use strict";

	if (!Array.prototype.find) {
		Array.prototype.find = require("../../etc/shared_libs/polyfills").find;
	}

	if (!window.Promise) {
		window.Promise = require("promise-polyfill");
	}

}());