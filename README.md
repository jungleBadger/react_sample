
## About this project
The **Cognitive Technician Scheduler** (CTS) is a tool developed by Holmes Squad in collaboration with IBM Proxxi to deliver a cognitive application that have its main goal to automatically assign a Technician to a Ticket. It also have many other informations that helps the client to analyse the clients and help to make decisions.

This is the main web application that uses `Node.js` to build the necessary interfaces. We also have several Microservices developed in `Python`.

**Guides:**

* [The app is not working. What should I do?](https://github.ibm.com/Holmes/proxxi-cts-node/wiki/Application-Problems)
* [How to open an issue](https://github.ibm.com/Holmes/proxxi-cts-node/wiki/Report-an-Issue)

**Bookmarks:**

* [Open a new issue](https://github.ibm.com/Holmes/proxxi-cts-node/issues/new)
* Sign up [Slack Worksplace](https://join.slack.com/t/ibmholmessupport/signup) and join at `#cts_notification` channel to receive notifications about system status

---

## Technical Notes
### How to work on this project?

Clone the repo and commit your changes on DEV branch or any relevant branch that you like. After that you should file a pull request to BETA or PROD environment, after merge Bluemix Continuous Integration will build the app on selected environment.

### Dependencies

* node version 6.x
* npm version 3.x
* .env file on root folder to load environment variables

How to build?

* run `npm install` from within the root folder
* run `gulp build-all -w` to run lint and build all client modules on watch mode
* run `npm run test` to execute unit tests
* run `node app` or `npm start` from within the root folder

### Who should I contact in case of problems?

You can open an [issue](https://github.ibm.com/Holmes/proxxi-cts-node/issues) or reach one of the developers

* dcerag@br.ibm.com
* jfreddy@br.ibm.com
* rafalima@br.ibm.com
* thirauj@br.ibm.com
