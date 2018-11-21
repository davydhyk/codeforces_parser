const cheerio = require('cheerio'),
  http = require('http'),
  https = require('https'),
  fs = require('fs'),
  rimraf = require('rimraf'),
  Entities = require('html-entities').XmlEntities,
  entities = new Entities(),
  pretty = require('pretty');

const pathToProblems = './problems',
  startFolderName = 'A',
  pathToTests = '/tests',
  pathToLinks = './links.txt',
  statementLinkSelector = '#pageContent > div.datatable > div:nth-child(6) > table > tbody > tr:nth-child(2) > td:nth-child(3) > a',
  statementSelector = '#pageContent > div.problemindexholder > div > div',
  statementFileName = '/statement.html';

const format = {
  task: '.dat',
  answer: '.ans'
}

if (fs.existsSync('./first_launch.bat')) fs.unlink('./first_launch.bat', () => {});

if (fs.existsSync(pathToProblems)) rimraf.sync(pathToProblems);
fs.mkdirSync(pathToProblems);

if (!fs.existsSync(pathToLinks)) {
  console.log('Створіть файл з посиланнями');
  return 0;
}

var links = [];
fs.readFile(pathToLinks, 'utf8', (err, data) => {
  links = data.split('\r\n');
  start();
});

function getTests(link) {
  if (link.indexOf('https') != -1) var query = https;
  else var query = http;
  return new Promise((resolve, reject) => {
    query.get(link, function(resp) {
      var tsk = [],
        ans = [],
        data = "";
      resp.on('data', function(d) {
        data += d;
      });
      resp.on('end', function() {
        var $ = cheerio.load(data);
        $('.file.input-view').each(function(i, val) {
          var input = $(val).find('.text pre').text(),
            output = $(val).next().find('.text pre').text();
          if (input.indexOf('...') == -1 && output.indexOf('...') == -1) {
            tsk.push(input);
            ans.push(output);
          }
        });
        resolve({
          task: tsk,
          answer: ans,
          link: $(statementLinkSelector).attr('href')
        });
      });
      resp.on('error', function(err) {
        reject(err);
      })
    });
  });
}

function getStatement(link) {
  if (link.indexOf('https') != -1) var query = https;
  else var query = http;
  return new Promise((resolve, reject) => {
    query.get(link, function(resp) {
      var data = "";
      resp.on('data', function(d) {
        data += d;
      });
      resp.on('end', function() {
        var $ = cheerio.load(data);
        resolve(pretty(entities.decode($(statementSelector).html())));
      });
      resp.on('error', function(err) {
        reject(err);
      })
    });
  });
}

function saveTests(path, tsk, ans) {
  return new Promise((resolve, reject) => {
    for (var i = 0; i < tsk.length; i++) {
      var j = i + 1;
      num = '/' + parseInt(j / 100) + parseInt(j % 100 / 10) + parseInt(j % 10);
      fs.writeFile(path + num + format.task, tsk[i], () => {});
      fs.writeFile(path + num + format.answer, ans[i], () => {});
    }
    resolve();
  })
}

console.log(links.length);

async function start() {
  for (var _i = 0; _i < links.length; _i++) {
    console.log(String.fromCharCode(startFolderName.charCodeAt(0) + _i));
    try {
      var result = await getTests(links[_i]);
      var statementLink = links[_i].split('/problemset')[0] + result.link + '?lang=ru';
      var tsk = result.task,
        ans = result.answer,
        name = '/' + String.fromCharCode(startFolderName.charCodeAt(0) + _i),
        tmpPath = pathToProblems + name;
      fs.mkdirSync(tmpPath);
      fs.writeFileSync(tmpPath + statementFileName, await getStatement(statementLink));
      tmpPath += pathToTests;
      console.log(tmpPath);
      fs.mkdirSync(tmpPath);
      await saveTests(tmpPath, tsk, ans);
    } catch (err) {
      console.log(err);
    }
  }
}