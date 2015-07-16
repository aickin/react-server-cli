
module.exports = function(pathToStatic) {
	return class CoreJsMiddleware {
		getSystemScripts() {
			const routeName = this.getRequest().getRouteName(); 
			return `${pathToStatic}${routeName}.bundle.js`;
		}
	}
}