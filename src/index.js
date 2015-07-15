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

	let compiler = webpack(webpackConfig, function(err, stats) {
	    if(err) {
	    	logger.error("Error during webpack build.");
	    	logger.error(err);
	    } else {
		    logger.debug("Successfully packaged react-server app for client.");
			let jsServer;
	    	if (optimize) {
	    		// TODO: make this parameterized based on what is returned from triton.compileClient
	    		let server = express();
				server.use('/', compression(), express.static('__clientTemp/build'));
				logger.info("Starting JavaScript server...");
				jsServer = http.createServer(server);
			} else {
				jsServer = new WebpackDevServer(compiler, {
					contentBase: webpackConfig.output.path,
					noInfo: true,
				});
				logger.info("Starting JavaScript server in dev mode...");
			}
			// TODO: make JS port a parameter
			jsServer.listen(3001, function() {
				logger.info(`Started JavaScript server on port ${3001}`);
			});
	    }
	});

	const server = express();
	triton.middleware(server, require(serverRoutes));

	logger.info("Starting server...");
	http.createServer(server).listen(port, function () {
		logger.info(`Started listening on port ${port}`);	
	});
}

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
