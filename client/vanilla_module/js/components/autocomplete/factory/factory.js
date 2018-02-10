(function () {
	"use strict";

	const countries = require("../model/countries");

	module.exports = {
		//SIMULATING A KIND OF FILTER QUERY. WOULD TO IT THROUGH A REST API ENCODING/DECODING
		"queryCountries": function (queryString = "", fieldToSearch = "") {
			return new Promise((resolve) => {
				setTimeout(() => {
					if (!queryString) {
						resolve([]);
					} else {
						if (fieldToSearch) {
							resolve(countries.filter(country => country[fieldToSearch].indexOf(queryString) > -1))
						} else {
							resolve(countries.filter((country) => {
								let found;
								for (let prop in country) {
									if (country.hasOwnProperty(prop)) {
										found = country[prop].indexOf(queryString) > -1;
										if (found) {
											return true;
										}
									}
								}
								return false;
							}));
						}
					}
				}, 300);
			});
		},
		"queryCache": function (results = [], queryString = "", fieldToSearch = "") {
			if (fieldToSearch) {
				return results.filter(result => result[fieldToSearch].indexOf(queryString) > -1)
			} else {
				return results.filter((result) => {
					let found;

					for (let prop in result) {
						if (result.hasOwnProperty(prop)) {
							found = result[prop].indexOf(queryString) > -1;
							if (found) {
								return true;
							}
						}
					}
					return found;
				});
			}
		}
	};


}());