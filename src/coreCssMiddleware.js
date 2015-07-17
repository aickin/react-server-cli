
module.exports = function(pathToStatic) {
	return class CoreCssMiddleware {
		getHeadStylesheets(next) {
			const routeName = this.getRequest().getRouteName(); 
			return [`${pathToStatic}${routeName}.css`, ...next()];
		}
	}
}