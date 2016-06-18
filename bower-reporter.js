var bower = require('bower');
var args = require('minimist')(process.argv.slice(2));
var _ = require('lodash');
var fs = require('fs');
var fromArray = require('from2-array');
var through = require('through2');

var rootDir = process.cwd();
process.chdir(args._[0]);

function getDependenciesStream(cb) {
    bower.commands.list()
        .on('error', function (err) {
            cb(err);
        })
        .on('end', function (result) {
            if (!result.dependencies) {
                cb('dependencies not found');
                return;
            }
            var dependencies = [];
            _.forOwn(result.dependencies, function (value) {
                dependencies.push(getPackageInfo(value));
            });
            cb(null, fromArray.obj(dependencies));
        });
}

function getPackageInfo(dependency) {
    return {
        name: dependency.pkgMeta.name,
        version: {
            current: dependency.pkgMeta.version,
            target: dependency.update.target,
            latest: dependency.update.latest
        },
        homepage: dependency.pkgMeta.homepage,
        source: dependency.pkgMeta._source,
        license: dependency.pkgMeta.license
    }
}

getDependenciesStream(function (err, dependencies) {
    dependencies.pipe(through.obj(function (dependency, enc, done) {
        console.log(dependency);
        done();
    }))
        .on('finish', function () {
            process.chdir(rootDir);
        })
});