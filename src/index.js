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
	WebpackDevServer = require("webpack-dev-server")
;

function startServer(routesRelativePath, port, optimize) {

	// Logging setup. This typically wouldn't be handled here,
	// but the application integration stuff isn't part of this project
	logging.setLevel('main',  'debug');
	logging.setLevel('time',  'fast');
	logging.setLevel('gauge', 'ok');


	const routesPath = path.join(process.cwd(), routesRelativePath);
	const routes = require(routesPath);

	const {serverRoutes, webpackConfig} = triton.compileClient(routes, {
		routesDir: path.dirname(routesPath),
		optimize,
		outputUrl: "http://localhost:3001/",
	});

	const startJsServer = optimize ? startStaticJsServer : startHotLoadJsServer;

	Promise.all([
		// TODO: make JS port a parameter
		startJsServer(webpackConfig, 3001),
		startHtmlServer(serverRoutes, port)
	])
		.then(() => logger.info("Started HTML & JavaScript servers; ready for requests."))
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

const startStaticJsServer = (webpackConfig, port) => {
	return new Promise((resolve, reject) => {
		webpack(webpackConfig, function(err, stats) {
		    if(err) {
		    	logger.error("Error during webpack build.");
		    	logger.error(err);
		    	reject(err);
		    	// TODO: inspect stats to see if there are errors -sra.
		    } else {
			    logger.debug("Successfully compiled static JavaScript.");
	    		// TODO: make this parameterized based on what is returned from triton.compileClient
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

const startHotLoadJsServer = (webpackConfig, port) => {
	logger.info("Starting hot reload JavaScript server...");
	const compiler = webpack(webpackConfig);
	const compiledPromise = new Promise((resolve, reject) => compiler.plugin("done", () => resolve()));
	const jsServer = new WebpackDevServer(compiler, {
		contentBase: webpackConfig.output.path,
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

// if routeFile is falsey, this method requires a route file on the command line. if routeFile is a string,
// it uses that file and just parses options from the command line.
module.exports = (routeFile) => {
	var argv = require("yargs")
		.usage('Usage: $0 [options] routeFile.js')
		.option("p", {
			alias: "port",
			default: 3000,
			describe: "Port to start listening for react-server",
			type: "number",
		})
		.option("o", {
			alias: "optimize",
			default: false,
			describe: "Optimize client JS when option is present. Takes a bit longer to compile",
			type: "boolean",
		})
		.demand(routeFile ? 0 : 1)
		.argv;

	routeFile = routeFile || argv._[0];

	startServer(routeFile, argv.port, argv.optimize);

}
