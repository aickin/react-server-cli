
module.exports = function(pathToStatic, bundlePerRoute) {
	return class CoreJsMiddleware {
		getSystemScripts(next) {
			const routeName = bundlePerRoute ? this.getRequest().getRouteName() : "__runtime"; 
			return [`${pathToStatic}${routeName}.bundle.js`, ...next()];
		}
	}
}