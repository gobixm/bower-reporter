var args = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var reporter = require('./bower-reporter');

var report = args.report ? args.report : 'csv';
var savePath = args.path ? args.path : 'report.' + report;
var projPath = args._[0] ? args._[0] : process.cwd();

var ws = fs.createWriteStream(savePath);
reporter.report(ws, args._[0], report);
ws.on('finish', function () {
   console.log('report saved at '+savePath);
});
