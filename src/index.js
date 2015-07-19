"use strict";

const triton = require("react-server"),
	http = require('http'),
	express = require('express'),
	logging = triton.logging,
	// TODO: do we need a post-processor here?
	logger = logging.getLogger({name: "react-server-cli/index.js", color: {server: 9}}),
	path = require("path"),
	compression = require("compression"),
	webpack = require("webpack"),
	WebpackDevServer = require("webpack-dev-server"),
	compileClient = require("./compileClient")
;

function startServer(routesRelativePath, {
		port = 3000, 
		jsPort = 3001, 
		hot = true,
		minify = false,
	} = {}) {

	const routesPath = path.join(process.cwd(), routesRelativePath);
	const routes = require(routesPath);

	const {serverRoutes, compiler} = compileClient(routes, {
		routesDir: path.dirname(routesPath),
		hot,
		minify,
		outputUrl: `http://localhost:${jsPort}/`,
	});

	const startJsServer = hot ? startHotLoadJsServer : startStaticJsServer;

	logger.notice("Starting HTML & JavaScript servers...")
	Promise.all([
		// TODO: make JS port a parameter
		startJsServer(compiler, jsPort),
		startHtmlServer(serverRoutes, port)
	])
		.then(() => logger.notice(`Started HTML & JavaScript servers; ready for requests on port ${port}.`));
}

const startHtmlServer = (serverRoutes, port) => {
	logger.info("Starting HTML server...");

	const server = express();
	server.use(compression());
	triton.middleware(server, require(serverRoutes));

	http.createServer(server).listen(port, function () {
		logger.info(`Started HTML server on port ${port}`);	
	});
};

const startStaticJsServer = (compiler, port) => {
	return new Promise((resolve, reject) => {
		compiler.run(function(err, stats) {
		    if(err) {
		    	logger.error("Error during webpack build.");
		    	logger.error(err);
		    	reject(err);
		    	// TODO: inspect stats to see if there are errors -sra.
		    } else {
			    logger.debug("Successfully compiled static JavaScript.");
	    		// TODO: make this parameterized based on what is returned from compileClient
	    		let server = express();
				server.use('/', compression(), express.static('__clientTemp/build'));
				logger.info("Starting static JavaScript server...");

				http.createServer(server).listen(port, function() {
					logger.info(`Started static JavaScript server on port ${port}`);
					resolve();
				});
		    }
		});
	});
};

const startHotLoadJsServer = (compiler, port) => {
	logger.info("Starting hot reload JavaScript server...");
	const compiledPromise = new Promise((resolve, reject) => compiler.plugin("done", () => resolve()));
	const jsServer = new WebpackDevServer(compiler, {
		noInfo: true,
		hot: true,
		headers: { 'Access-Control-Allow-Origin': '*' },
	});
	const serverStartedPromise = new Promise((resolve, reject) => {
		jsServer.listen(port, () => resolve() );
	});
	return Promise.all([compiledPromise, serverStartedPromise])
		.then(() => logger.info(`Started hot reload JavaScript server on port ${port}`));
};

module.exports = () => {
	const isProduction = (process.env.NODE_ENV === "production");

	const argv = require("yargs")
		.usage('Usage: $0 [options]')
		.option("routes", {
			default: "./routes.js",
			describe: "The routes file to load.",
		})
		.option("p", {
			alias: "port",
			default: 3000,
			describe: "Port to start listening for react-server",
			type: "number",
		})
		.option("jsPort", {
			default: 3001,
			describe: "Port to start listening for react-server's JavaScript",
			type: "number",
		})
		.option("h", {
			alias: "hot",
			default: !isProduction,
			describe: "Load the app so that it can be hot reloaded in the browser. Default is false in production mode, true otherwise.",
			type: "boolean",
		})
		.option("m", {
			alias: "minify",
			default: isProduction,
			describe: "Optimize client JS when option is present. Takes a bit longer to compile. Default is true in production mode, false otherwise.",
			type: "boolean",
		})
		.option("loglevel", {
			default: isProduction ? "notice" : "debug",
			describe: "Set the severity level for the logs being reported. Values are, in ascending order of severity: 'debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'. Default is 'notice' in production mode, 'debug' otherwise.",
			type: "string",
		})
		.help('?')
		.alias('?', 'help')
		.demand(0)
		.argv;

	// Logging setup. This typically wouldn't be handled here,
	// but the application integration stuff isn't part of this project
	logging.setLevel('main',  argv.loglevel);
	logging.setLevel('time',  'fast');
	logging.setLevel('gauge', 'ok');

	if (argv.hot || !argv.minify) {
		logger.warning("PRODUCTION WARNING: the following current settings are discouraged in production environments. (If you are developing, carry on!):");
		if (argv.hot) {
			logger.warning("-- Hot reload is enabled. Either pass --hot=false or set NODE_ENV=production to turn off.");
		}

		if (!argv.minify) {
			logger.warning("-- Minification is disabled. Either pass --minify or set NODE_ENV=production to turn on.");
		}
	}

	startServer(argv.routes, {
		port: argv.port, 
		jsPort: argv.jsPort, 
		hot: argv.hot,
		minify: argv.minify
	});

}
