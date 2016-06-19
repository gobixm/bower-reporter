var bower = require('bower');
var _ = require('lodash');
var fs = require('fs');
var fromArray = require('from2-array');
var through = require('through2');
var combine = require('multipipe');
var q = require('q');

function getDependenciesStream() {
    var defer = q.defer();
    bower.commands.list()
        .on('error', function (err) {
            cb(err);
        })
        .on('end', function (result) {
            if (!result.dependencies) {
                defer.reject('dependencies not found');
                return;
            }
            var dependencies = [];
            _.forOwn(result.dependencies, function (value) {
                dependencies.push(getPackageInfo(value));
            });
            defer.resolve(fromArray.obj(dependencies));
        });
    return defer.promise;
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

function fillInfo(dependency, info, done) {
    var dep = _.cloneDeep(dependency);
    dep.version.latestStable = info.latest.version;
    dep.description = info.latest.description;
    done(null, dep);
}

function getDetailedPackageInfo(dependency, enc, done) {
    bower.commands.info(dependency.name)
        .on('error', function (err) {
            done(err);
        })
        .on('end', function (result) {
            fillInfo(dependency, result, done);
        });
}

function csvString(value) {
    return value ? value : "";
}

function getFormattedCsv(dependency, enc, done) {
    done(null, _.join([csvString(dependency.name),
                csvString(dependency.homepage),
                csvString(dependency.version.current),
                csvString(dependency.version.latest),
                csvString(dependency.license),
                csvString(dependency.description)],
            ',') + '\n'
    );
}

function getFormattedHtml(dependency, enc, done) {

}

function getFormattedDependency(report) {
    if (report === 'csv') {
        return getFormattedCsv;
    }
    if (report === 'html') {
        return getFormattedHtml;
    }
}

module.exports.report = function (outStream, projectPath, report) {
    var rootDir = process.cwd();
    process.chdir(projectPath);
    getDependenciesStream()
        .then(function (depStream) {
                combine(depStream,
                    through.obj(getDetailedPackageInfo),
                    through.obj(getFormattedDependency(report)),
                    outStream
                )
                    .on('error', function (err) {
                        process.chdir(rootDir);
                    })
                    .on('finish', function () {
                        process.chdir(rootDir);
                    })
            },
            function (err) {
                process.chdir(rootDir);
            })
};