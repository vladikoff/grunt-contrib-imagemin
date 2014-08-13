'use strict';
var fs = require('fs');
var os = require('os');
var path = require('path');
var async = require('async');
var chalk = require('chalk');
var prettyBytes = require('pretty-bytes');
var Imagemin = require('imagemin');

/*
 * grunt-contrib-imagemin
 * http://gruntjs.com/
 *
 * Copyright (c) 2014 Sindre Sorhus, contributors
 * Licensed under the MIT license.
 */

module.exports = function (grunt) {
    grunt.registerMultiTask('imagemin', 'Minify PNG, JPEG, GIF and SVG images', function () {
        var done = this.async();
        var files = this.files;
        var totalSaved = 0;
        var options = this.options({
            interlaced: true,
            optimizationLevel: 3,
            progressive: true
        });
        // XXX: custom cache directory
        var CACHE_DIR = '.imagemin';

        async.forEachLimit(files, os.cpus().length, function (file, next) {
            var msg;
            var cachedPath = path.dirname(path.join(CACHE_DIR, file.dest));
            var baseName = path.basename(file.dest);

            var imagemin = new Imagemin()
                .src(file.src[0])
                .dest(cachedPath)
                .use(Imagemin.jpegtran(options))
                .use(Imagemin.gifsicle(options))
                .use(Imagemin.pngquant(options))
                .use(Imagemin.optipng(options))
                .use(Imagemin.svgo({ plugins: options.svgoPlugins || [] }));

            if (options.use) {
                options.use.forEach(imagemin.use.bind(imagemin));
            }

            fs.stat(file.src[0], function (err, stats) {
                if (err) {
                    grunt.warn(err + ' in file ' + file.src[0]);
                    return next();
                }

                imagemin.run(function (err, data) {
                    if (err) {
                        grunt.warn(err + ' in file ' + file.src[0]);
                        return next();
                    }

                    var origSize = stats.size;
                    var diffSize = origSize - data[0].contents.length;

                    totalSaved += diffSize;

                    if (diffSize < 10) {
                        msg = 'already optimized';
                    } else {
                      // XXX: only write the optimized file if it was not already optimized
                      fs.writeFileSync(file.dest, fs.readFileSync(path.join(cachedPath, baseName)));

                      msg = [
                            'saved ' + prettyBytes(diffSize) + ' -',
                            (diffSize / origSize * 100).toFixed() + '%'
                        ].join(' ');
                    }

                    grunt.verbose.writeln(chalk.green('✔ ') + file.src[0] + chalk.gray(' (' + msg + ')'));
                    process.nextTick(next);
                });
            });
        }, function (err) {
            if (err) {
                grunt.warn(err);
            }

            var msg = [
                'Minified ' + files.length,
                files.length === 1 ? 'image' : 'images',
                chalk.gray('(saved ' + prettyBytes(totalSaved) + ')')
            ].join(' ');

            grunt.log.writeln(msg);
            done();
        });
    });
};
