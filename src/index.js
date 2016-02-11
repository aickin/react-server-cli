const yargs = require("yargs");

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
		.option("compileonly", {
			default: false,
			describe: "Compile the client JavaScript only, and don't start any servers. This is what you want to do if you are building the client JavaScript to be hosted on a CDN. Unless you have a very specific reason, it's almost alway a good idea to only do this in production mode. Defaults to false.",
			type: "boolean",
		})
		.option("jsurl", {
			describe: "A URL base for the pre-compiled client JavaScript. Setting a value for jsurl means that react-server-cli will not compile the client JavaScript at all, and it will not serve up any JavaScript. Obviously, this means that --jsurl overrides all of the options related to JavaScript compilation: --hot, --minify, and --bundleperroute.",
			type: "string",
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

// TODO: take this out when PR #7 in react-server is merged.
process.env.TRITON_CONFIGS = process.cwd();

// weirdly, we parse the args twice. the first time we are just looking for --production, which
// affects the default values for the other args.
const isProduction = parseCliArgs(false).production || (process.env.NODE_ENV === "production");
// now if production was sent in on the command line, let's set NODE_ENV if it's unset.
if (isProduction && !process.env.NODE_ENV) {
	process.env.NODE_ENV = "production";
}
const argv = parseCliArgs(isProduction);

// TODO: do we need a post-processor for logger here?
// these require calls are after the argument parsing because we want to set NODE_ENV
// before they get loaded.
const logging = require("react-server").logging,
	logger = logging.getLogger({name: "react-server-cli/index.js", color: {server: 9}}),
	startServer = require("./startServer");

// Logging setup. This typically wouldn't be handled here,
// but the application integration stuff isn't part of this project
logging.setLevel('main',  argv.loglevel);
logging.setLevel('time',  'fast');
logging.setLevel('gauge', 'ok');

// if the server is being launched with some bad practices for production mode, then we
// should output a warning. if arg.jsurl is set, then hot and minify are moot, since
// we aren't serving JavaScript & CSS at all.
if ((!argv.jsurl && (argv.hot || !argv.minify)) ||  process.env.NODE_ENV !== "production") {
	logger.warning("PRODUCTION WARNING: the following current settings are discouraged in production environments. (If you are developing, carry on!):");
	if (argv.hot) {
		logger.warning("-- Hot reload is enabled. Pass --hot=false, pass --production, or set NODE_ENV=production to turn off.");
	}

	if (!argv.minify) {
		logger.warning("-- Minification is disabled. Pass --minify, pass --production, or set NODE_ENV=production to turn on.");
	}

	if (process.env.NODE_ENV !== "production") {
		logger.warning("-- NODE_ENV is not set to \"production\".");
	}
}

startServer(argv.routes, {
	port: argv.port,
	jsPort: argv.jsPort,
	hot: argv.hot,
	minify: argv.minify,
	compileOnly: argv.compileonly,
	jsUrl: argv.jsurl,
});
