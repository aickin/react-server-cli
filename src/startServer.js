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

export default function(routesRelativePath, {
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
