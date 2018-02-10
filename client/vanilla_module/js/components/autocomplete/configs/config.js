(function () {
    "use strict";

    module.exports = function Constructor(configs) {
		if (!configs || !configs.queryEndpoint || !configs.anchorReference) {
			throw new Error("Invalid constructor params");
		}
		let _configs = {
			"anchorReference": configs.anchorReference,
			"queryEndpoint": configs.queryEndpoint
		};

		return {
			"get": function (prop) {
				if (!configs[prop]) {
					throw new Error(`Invalid prop ${prop}`);
				} else {
					return _configs[prop];
				}
			},
			"set": function (key, value) {
				if (!key) {
					throw new Error("Invalid key to set");
				} else {
					_configs[key] = value;
				}
			}
		};
	}

}());