# react-server-cli

A simple command line app that will compile a routes file for the client and start up express. To use:

```
npm install
./bin/react-server <routesfile>
```

Note that the routes file needs to be in a bit different format than what we have used in the past. Rather than `routes.route.page` being a function, it needs to be a path to a file that exports a page class.

The following options can currently be used with the CLI:

```
Usage: bin/react-server [options] routeFile.js

Options:
  -p, --port      Port to start listening for react-server       [default: 3000]
  -o, --optimize  Optimize client JS when option is present. Takes a bit longer
                  to compile                          [boolean] [default: false]
```
