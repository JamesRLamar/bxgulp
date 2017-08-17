var args = require('yargs').argv;
var replace = require('gulp-replace');
var path = require('path');
var config = require('./gulp.config')();
var del = require('del');
var gulp = require('gulp');
var runSequence = require('run-sequence');
var $ = require('gulp-load-plugins')({lazy: true});
var _ = require('lodash');
var reload = require('require-reload')(require),
    pkg = reload('./package.json');
var space = args.space || config.defaultSpace;
var user = args.u || config.defaultUser;
var org = args.org || config.bxPath.org;
var version = args.rollback || pkg.version;
var nobump = args.nobump || false;

gulp.task('help', $.taskListing);

gulp.task('default', ['help']);

/*
 EXAMPLE: gulp deploy --u=email@user.com --space=Production
 */
gulp.task('deploy', function (done) {
    runSequence(
        'bx-login',
        'bump',
        'build',
        'bx-target',
        'bx-push',
        'bx-map',
        'bx-unmap',
        'bx-rollback',
        done
    );
});

gulp.task('bx-login', function () {

    return gulp.src('', {read: false})
        .pipe($.plumber())
        .pipe($.shell([
            'bluemix api https://api.ng.bluemix.net',
            'bluemix login -u ' + user + ' -o ' + org + ' -c ' + config.bxPath.acctID
        ]))
});

/**
 * Bump the version
 * --type=patch  (*.*.x) (DEFAULT)
 * --type=pre  (*.*.*-x)
 * --type=minor  (*.x.*)
 * --type=major  (x.*.*)
 * --ver="2.0.0"
 */

gulp.task('bump', function (done) {

    runSequence(
        'bump-package',
        done
    );
});

gulp.task('bump-package', function () {

    var today = new Date();

    if (space === config.defaultSpace && !args.rollback && !nobump) {
        var options = {};

        if (args.ver) {
            options.version = args.ver;
        }
        else if (args.type) {
            options.type = args.type;
        }

        return gulp
            .src('./package.json')
            .pipe($.plumber())
            .pipe(replace(/"date": ".+"/g, '"date": "' + today + '"'))
            .pipe($.print())
            .pipe($.bump(options))
            .pipe(gulp.dest('./'));
    }
    else {
        return space;
    }
});

gulp.task('build', function (done) {
    runSequence(
        'build-clean',
        'build-copy-routes',
        'build-copy-views',
        'build-copy-public',
        'build-copy-root',
        'build-manifest',
        done
    );
});

gulp.task('build-clean', function () {
    return del.sync('./build');
});

gulp.task('build-copy-routes', function () {

    return gulp
        .src('./routes/**/*')
        .pipe($.plumber())
        .pipe(gulp.dest('./build/routes'));
});

gulp.task('build-copy-views', function () {

    return gulp
        .src('./views/**/*')
        .pipe($.plumber())
        .pipe(gulp.dest('./build/views'));
});

gulp.task('build-copy-public', function () {

    return gulp
        .src('./public/**/*')
        .pipe($.plumber())
        .pipe(gulp.dest('./build/public'));
});

gulp.task('build-copy-root', function () {

    return gulp
        .src([
            './app.js',
            './package.json'
        ])
        .pipe($.plumber())
        .pipe(gulp.dest('./build'));
});

gulp.task('build-manifest', function () {

    var memory = config.manifest.dev.memory;
    var instances = config.manifest.dev.instances;
    var disk_quota = config.manifest.dev.disk_quota;

    if (space === config.prodSpace) {
        memory = config.manifest.prod.memory;
        instances = config.manifest.prod.instances;
        disk_quota = config.manifest.prod.disk_quota;
    }

    return gulp
        .src('./manifest.yml')
        .pipe($.plumber())
        .pipe(replace(/memory: .+/g, 'memory: ' + memory))
        .pipe(replace(/instances: .+/g, 'instances: ' + instances))
        .pipe(replace(/domain: .+/g, 'domain: ' + config.bxPath.domain))
        .pipe(replace(/name: .+/g, 'name: ' + config.bxPath.app))
        .pipe(replace(/host: .+/g, 'host: ' + config.bxPath.app))
        .pipe(replace(/disk_quota: .+/g, 'disk_quota: ' + disk_quota))
        .pipe($.print())
        .pipe(gulp.dest('./build'));
});

gulp.task('bx-target', function () {

    return gulp.src('', {read: false})
        .pipe($.plumber())
        .pipe($.shell([
            'bluemix target -o ' + org + ' -s ' + space + ' -c ' + config.bxPath.acctID
        ]))
});

gulp.task('bx-push', function () {

    if (args.rollback) {
        return gulp.src('', {read: false})
            .pipe($.plumber())
            .pipe($.shell([
                'bluemix app start ' + config.bxPath.app + '-prod' + '-' + version
            ]))
    }
    else if (space === config.prodSpace) {
        return gulp.src('', {read: false})
            .pipe($.plumber())
            .pipe($.shell([
                'bluemix cf push "' + config.bxPath.app + '-prod-' + version + '" --no-route -p "./build" -f "./build/manifest.yml"'
            ]))
    }
    else {
        return gulp.src('', {read: false})
            .pipe($.plumber())
            .pipe($.shell([
                'bluemix cf push "' + config.bxPath.app + '-' + space + '" -n "' + config.bxPath.app + '-' + space + '" -p "./build" -f "./build/manifest.yml"'
            ]))
    }
});

gulp.task('bx-map', function () {

    if (space === config.prodSpace || args.rollback) { // Map route to point to newly created app
        return gulp.src('', {read: false})
            .pipe($.plumber())
            .pipe($.shell([
                'bluemix app route-map ' + config.bxPath.app + '-prod' + '-' + version + ' ' + config.bxPath.domain + ' -n ' + config.bxPath.app
            ]))
    }
    else {
        return space;
    }
});

gulp.task('bx-unmap', function () {

    if (args.rollback) {
        return gulp.src('', {read: false})
            .pipe($.plumber())
            .pipe($.shell([
                'bluemix app route-unmap ' + config.bxPath.app + '-prod' + '-' + pkg.production + ' ' + config.bxPath.domain + ' -n ' + config.bxPath.app,
                'bluemix app stop ' + config.bxPath.app + '-prod' + '-' + pkg.production
            ]))
    }
    else if (space === config.prodSpace && pkg.version !== pkg.production && pkg.production !== '0.0.0') { // Unmap route to former app
        return gulp.src('', {read: false})
            .pipe($.plumber())
            .pipe($.shell([
                'bluemix app route-unmap ' + config.bxPath.app + '-prod' + '-' + pkg.production + ' ' + config.bxPath.domain + ' -n ' + config.bxPath.app,
                'bluemix app stop ' + config.bxPath.app + '-prod' + '-' + pkg.production
            ]))
    }
    else {
        return space;
    }
});

gulp.task('bx-rollback', function () {

    if (space === config.prodSpace) {

        var msg = {
            title: 'Deployment Successful!',
            subtitle: 'Deployed Version: ' + version + ' to ' + space,
            message: config.bxPath.app + '.' + config.bxPath.domain + '/info'
        };
        notify(msg);

        var rollback = version;
        var options = {};
        options.key = 'production';
        options.version = rollback;

        return gulp
            .src('./package.json')
            .pipe($.plumber())
            .pipe($.print())
            .pipe($.bump(options))
            .pipe(gulp.dest('./'));
    }
    else if (args.rollback) {

        var msg = {
            title: 'Rollback Successful!',
            subtitle: 'Deployed Version: ' + version + ' to ' + space,
            message: config.bxPath.app + '.' + config.bxPath.domain + '/info'
        };
        notify(msg);

        var rollback = version;
        var options = {};
        options.key = 'production';
        options.version = rollback;

        return gulp
            .src('./package.json')
            .pipe($.plumber())
            .pipe($.print())
            .pipe($.bump(options))
            .pipe(gulp.dest('./'));
    }
    else {

        var pkg = reload('./package.json');

        var msg = {
            title: 'Deployment Successful!',
            subtitle: 'Deployed Version: ' + pkg.version + ' to ' + space,
            message: config.bxPath.app + '.' + space  + '.' + config.bxPath.domain + '/info'
        };
        notify(msg);

        return space;
    }
});

/**
 * Show OS level notification using node-notifier
 */
function notify(options) {
    var notifier = require('node-notifier');
    var notifyOptions = {
        sound: 'Bottle',
        contentImage: path.join(__dirname, 'bx.png'),
        icon: path.join(__dirname, 'bx.png')
    };
    _.assign(notifyOptions, options);
    console.log(options);
    notifier.notify(notifyOptions);
}