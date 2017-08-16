# bxgulp
Gulp CI (Continuous Integration) for IBM Bluemix / CloudFoundry (https://github.com/JamesRLamar/bxgulp)

## APP SETUP

This sample application in this repo is based on the Node.js Cloudant Sample. Follow README instructions to setup this app in Bluemix.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/IBM-Bluemix/nodejs-cloudant)

## CI SETUP
      - Create account at https://console.bluemix.net
      - Install the latest Bluemix CLI tool: https://clis.ng.bluemix.net/ui/home.html (Currently 0.5.6)
      - Run `npm install`

## CI DEPLOYMENT

All deployment parameters may be configured in `gulp.config.js`

`gulp deploy` (default user and default space)
      OR
`gulp deploy --u=email@user.com --space=Production`


## ROLLBACK

`gulp deploy --rollback=*.*.*` 

Works only for PRODUCTION app and rolls back to the specified version and stops the current production version.

Special Note: "production": "0.0.0" in package.json is reserved to tell the app that no version has ever been pushed to Production.


## VERSION BUMP

`gulp bump` 

This will automatically bump the package.json. Bump is automatically called when defaultSpace is used.

### VERSION BUMP PARAMETERS

      --type=patch  (*.*.x) (DEFAULT)
      --type=pre  (*.*.*-x)
      --type=minor  (*.x.*)
      --type=major  (x.*.*)
      --ver="2.0.0"
      --nobump


## BUILD

`gulp build` 

Builds application files and manifest.yml to `build` folder