
module.exports = function(pathToStatic, bundlePerRoute) {
	return class CoreJsMiddleware {
		getSystemScripts(next) {
			const routeName = bundlePerRoute ? this.getRequest().getRouteName() : "__runtime"; 
			const baseUrl = pathToStatic || "/";
			return [
				`${baseUrl}${routeName}.bundle.js`, 
				{
					type: "text/javascript", 
					text: baseUrl ? `
						if (typeof window !== "undefined" && window.__setReactServerBase) {
							window.__setReactServerBase(${JSON.stringify(baseUrl)});
						}` : ""
				},
				...next()
			];
		}
	}
}