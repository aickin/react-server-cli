
module.exports = function(pathToStatic) {
	return class CoreJsMiddleware {
		getSystemScripts(next) {
			const routeName = this.getRequest().getRouteName(); 
			return [`${pathToStatic}${routeName}.bundle.js`, ...next()];
		}
	}
}