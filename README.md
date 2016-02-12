# react-server-cli

## NOTE: THIS PROJECT IS IN ALPHA. PLEASE DO NOT USE IN PRODUCTION.

A simple command line app that will compile a routes file for the client and start up express. To use:

1. Add `react-server-cli` to your project's `package.json`
2. `npm install`
3. `./node_modules/react-server-cli/bin/react-server-cli` from the directory that has your routes.js file, or you can make an executable script that calls `react-server-cli`.

We would like to make `react-server-cli` a globally installable package so that projects don't have to add it to their package.json, but that will take some more work.

## Routes Format

Note that the routes file needs to be in a bit different format than what we have used in the past in `react-server`. Rather than `routes.route.page` being a function, it needs to be a path to a file that exports a page class. For example:

```javascript
module.exports = {
	// these will be applied to every page in the site.
	middleware: ["./FooMiddleware", "./BarMiddleware"],

	// this maps URLs to modules that export a Page class.
	routes: {
		BazRoute: {
			path: ["/"],
			method: "get",
			page: "./BazPage"
		},
		BakRoute: {
			path: ["/bak"],
			method: "get",
			page: "./BakPage"
		}
	}
};
```

##What It Does

The CLI builds and runs a `react-server` project, using Express. It compiles JS(X) and CSS into efficiently loadable bundles using webpack, and it supports hot reloading of React components on the client-side.

##Built-in Features

###Babel Compilation
It's rare to see a project these days in the JavaScript world that isn't at least experimenting with ES2015 and ES7. To make this easier, all code in your project will be run through Babel using default options, and source maps will be generated back to the original file.

If you want to customize your Babel options, create a `.babelrc` file in your root code directory, expressing your Babel config as a JSON object. (Note that JSON syntax is more restrictive than JavaScript; all key names must be quoted, and trailing commas in an object or array are forbidden.)

##Options
Smart defaults are the goal, so it support Babel out of the box, and it has two base modes: **development** and **production**. `react-server-cli` will determine which base mode it's in by looking at (in order):

1. If the `--production` flag was sent in, it's **production**.
1. If `process.env.NODE_ENV` is `'production'`, it's **production**.
1. Otherwise, the base mode is **development**.

###Development mode: making a great DX

Development mode is the default, and its goals are rapid startup and code-test loops. Hot mode is enabled for all code, although at this time, editing the routes file or modules that export a Page class still requires a browser reload to see changes.

In development mode, code is not minified in order to speed up startup time, so please do not think that the sizes of bundles in development mode is indicative of how big they will be in production. In fact, it's really best not to do any kind of perf testing in development mode; it will just lead you astray.

We are also considering completely getting rid of server-side rendering in development mode by default to speed startup.

###Production mode: optimizing delivery

Production mode's priority is optimization at the expense of startup time. A separate code bundle is generated for every entry point into your app so that there is at most just one JS and one CSS file loaded by the framework. All code is minified, and hot reloading is turned off.

###Setting Options Manually

While development and production mode are good starting points, you can of course choose to override any of the setup by passing in options at the command line:

#### --routes
The routes file to load.

Defaults to **"./routes.js"**.

#### --port, -p
The port to start up the main server, which will serve the pre-rendered HTML files.

Defaults to **3000**.

#### --jsPort
The port to use when `react-server-cli` is serving up the client JavaScript.

Defaults to **3001**.

#### --hot, -h
Use hot reloading of client JavaScript.

Defaults to **true** in development mode and **false** in production mode.

#### --minify, -m
Minify client JavaScript and CSS.

Defaults to **false** in development mode and **true** in production.

#### --compileonly
Compile the client JavaScript only, and don't start any servers. This is what you want to do if you are building the client JavaScript to be hosted on a CDN. Unless you have a very specific reason, it's almost always a good idea to only do this in production mode.

For maximum compatibility between servers and compiled JavaScript, this option implies --bundleperroute.

Defaults to **false**.

#### --jsurl
A URL base for the pre-compiled client JavaScript. Setting a value for jsurl means that react-server-cli will not compile the client JavaScript at all, and it will not serve up any JavaScript. Obviously, this means that --jsurl overrides all of the options related to JavaScript compilation: --hot, --minify, and --bundleperroute.

Defaults to **null**.

#### --loglevel
Sets the severity level for the logs being reported. Values are, in ascending order of severity: 'debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'.

Default is **'debug'** in development mode and **'warning'** in production.

#### --help, -?
Shows command line options.

##Future Directions

Here are a few of the things on the unordered wishlist to add to `react-server-cli`:

* Default to https, with http as a special case. If no cert & key specified, make a self-signed cert/key combo.
* Ability to output a completely static site, if the user wants to forgo server-side rendering.
* Ability to forgo server rendering in development mode.
* Add an argument to specify a CDN URL where pre-built JavaScript lives.
* A "dist" command that will output just the bundled client code for upload to a CDN/static server.
* A programmatic API.
* Automatic compilation of SASS and LESS.
* Ability to opt out of Babel compilation.
* Help with proxying API endpoints.
