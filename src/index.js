	// TODO: do we need a post-processor for logger here?
const logging = require("react-server").logging,
	logger = logging.getLogger({name: "react-server-cli/index.js", color: {server: 9}}),
	startServer = require("./startServer"),
	yargs = require("yargs")
;

export default function () {
	// weirdly, we parse the args twice. the first time we are just looking for --production, which
	// affects the default values for the other args.
	const productionCliArg = parseCliArgs(false).production;
	const argv = parseCliArgs(productionCliArg || (process.env.NODE_ENV === "production"));

	// Logging setup. This typically wouldn't be handled here,
	// but the application integration stuff isn't part of this project
	logging.setLevel('main',  argv.loglevel);
	logging.setLevel('time',  'fast');
	logging.setLevel('gauge', 'ok');

	if (!argv.bundleperroute && argv.compileonly) {
		logger.warning("WARNING: It is not valid to use --compileonly without --bundleperroute. Setting bundleperroute to true.");
		argv.bundleperroute = true;
	}

	if (argv.hot || !argv.minify || !argv.bundleperroute) {
		logger.warning("PRODUCTION WARNING: the following current settings are discouraged in production environments. (If you are developing, carry on!):");
		if (argv.hot) {
			logger.warning("-- Hot reload is enabled. Either pass --hot=false, or --production, or set NODE_ENV=production to turn off.");
		}

		if (!argv.minify) {
			logger.warning("-- Minification is disabled. Either pass --minify, or --production, or set NODE_ENV=production to turn on.");
		}

		if (!argv.bundleperroute) {
			logger.warning("-- Bundle per route is disabled. Either pass --bundleperroute, or --production, or set NODE_ENV=production to turn on.");
		}
	}

	startServer(argv.routes, {
		port: argv.port, 
		jsPort: argv.jsPort, 
		hot: argv.hot,
		minify: argv.minify,
		bundlePerRoute: argv.bundleperroute,
		compileOnly: argv.compileonly,
	});

}

const parseCliArgs = (isProduction) => {
	return yargs(process.argv)
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
		.option("bundleperroute", {
			default: isProduction,
			describe: "Create a separate client JavaScript bundle for every route in the routes file, which increases compile time, but makes JavaScript loading faster at runtime. Defaults is true in production mode, false otherwise.",
			type: "boolean",
		})
		.option("compileonly", {
			default: false,
			describe: "Compile the client JavaScript only, and don't start any servers. This is what you want to do if you are building the client JavaScript to be hosted on a CDN. Unless you have a very specific reason, it's almost alway a good idea to only do this in production mode. Defaults to false.",
			type: "boolean",
		})
		.option("production", {
			default: false,
			describe: "Forces production mode. If this is not set (or set to false), the CLI falls back to NODE_ENV to determine what mode we are in. Note that production mode only affects the default settings for other options; individual options can still be overridden by setting them directly.",
			type: "boolean",
		})
		.help('?')
		.alias('?', 'help')
		.demand(0)
		.argv;
}
