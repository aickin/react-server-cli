const webpack = require("webpack"),
	logger = require('react-server').logging.getLogger({name: "react-server-cli/compileClient.js", color: {server: 164}}),
	path = require("path"),
	mkdirp = require("mkdirp"),
	fs = require("fs"),
	Q = require("Q");

/** 
 * Compiles the routes file in question for browser clients using webpack.
 */
 // TODO: add options for sourcemaps.
module.exports = (routes, 
		{
			workingDir = "./__clientTemp", 
			routesDir = ".", 
			outputDir = workingDir + "/build",
			outputUrl = "/static/",
			optimize = false,
		} = {}
	) => {
	const workingDirAbsolute = path.resolve(process.cwd(), workingDir);
	mkdirp.sync(workingDirAbsolute);
	const outputDirAbsolute = path.resolve(process.cwd(), outputDir);
	mkdirp.sync(outputDirAbsolute);

	const routesDirAbsolute = path.resolve(process.cwd(), routesDir);

	// for each route, let's create an entrypoint file that includes the page file and the routes file
	let bootstrapFile = writeClientBootstrapFile(workingDirAbsolute);
	const entrypointBase = optimize ? [] : [`webpack-dev-server/client?${outputUrl}`,"webpack/hot/only-dev-server"];
	let entrypoints = {};
	for (let routeName in routes.routes) {
		let route = routes.routes[routeName];
		var absolutePathToPage = path.resolve(routesDirAbsolute, route.page);

		entrypoints[routeName] = [
			...entrypointBase,
			bootstrapFile,
			absolutePathToPage,
		];
	}

	// now rewrite the routes file out in a webpack-compatible way.
	const serverRoutes = writeWebpackCompatibleRoutesFile(routes, routesDir, workingDirAbsolute, outputUrl, false);
	const clientRoutes = writeWebpackCompatibleRoutesFile(routes, routesDir, workingDirAbsolute, outputUrl, true);

	// finally, let's pack this up with webpack. 
	return {
		serverRoutes,
		webpackConfig: packageCodeForBrowser(entrypoints, outputDirAbsolute, outputUrl, optimize),
	};
}

const packageCodeForBrowser = (entrypoints, outputDir, outputUrl, optimize) => {
	let webpackConfig = {
		entry: entrypoints,
		output: {
			path: outputDir,
			publicPath: outputUrl,
			filename: "[name].bundle.js",
			chunkFilename: "[id].bundle.js",
		},
		module: {
			loaders: [{
				test: /\.jsx?$/,
				loader: "babel",
				exclude: /node_modules/,
				query: {
					stage: 1, 
					optional: [
						"runtime",
					],
				},
			}]
		},
	};

	if (optimize) {
		webpackConfig.plugins = [
			new webpack.DefinePlugin({
				'process.env': {NODE_ENV: '"production"'}
			}),
			// TODO: should this be done as babel plugin?
			new webpack.optimize.UglifyJsPlugin(),
		];
	} else {
		webpackConfig.devtool = "#cheap-module-eval-source-map";
		webpackConfig.module.loaders.unshift({
				test: /\.jsx?$/,
				loader: "react-hot",
				exclude: /node_modules/,
		});
		webpackConfig.plugins = [
			new webpack.HotModuleReplacementPlugin(),
			new webpack.NoErrorsPlugin()
		];
	}

	logger.debug("Attempting to package react-server app for client.");

	return webpackConfig;
};

const writeWebpackCompatibleRoutesFile = (routes, routesDir, workingDirAbsolute, staticUrl, isClient) => {
	let routesOutput = [];

	const existingMiddleware = routes.middleware.map((middlewareRelativePath) => {
		return `require("${path.relative(workingDirAbsolute, path.resolve(routesDir, middlewareRelativePath))}")`
	});
	routesOutput.push("var coreJsMiddleware = require('react-server-cli/target/coreJsMiddleware');\n");
	routesOutput.push(`module.exports = { middleware:[coreJsMiddleware('${staticUrl}'),${existingMiddleware.join(",")}], routes:{`);
	
	for (let routeName in routes.routes) {
		let route = routes.routes[routeName];

		var relativePathToPage = path.relative(workingDirAbsolute, path.resolve(routesDir, route.page));

		routesOutput.push("\n\t\t" + routeName + ": {");
		for (let name of ["path", "method"]) {
			routesOutput.push("\n\t\t\t" + `${name}: "${route[name]}",`);
		}
		routesOutput.push(`
			page: function() { 
				return {
					done: function(cb) {`);
		if (isClient) {
			routesOutput.push(`require.ensure("${relativePathToPage}", function() {
								cb(require("${relativePathToPage}"));
							});`);
		} else {
			routesOutput.push(`cb(require("${relativePathToPage}"));`);
		}
		routesOutput.push(`					}
				};
			},`);
		routesOutput.push("\n\t\t},");
	}
	routesOutput.push("\n\t}\n}; \n");

	const routesFilePath = `${workingDirAbsolute}/routes_${isClient ? "client" : "server"}.js`;
	fs.writeFileSync(routesFilePath, routesOutput.join(""));

	return routesFilePath;
};

const writeClientBootstrapFile = (outputDir) => {
	var outputFile = outputDir + "/entry.js";
	fs.writeFileSync(outputFile, `
		var reactServer = require("react-server");
		reactServer.renderClient(require("./routes_client"), window);
	`
	);
	return outputFile;
};