const cheerio = require('cheerio');
const http = require('http');
const fs = require('fs');
const rimraf = require('rimraf');

const pathToProblems = './problems',
      startFolderName = 'A',
      pathToTests = '/tests',
      pathToLinks = './links.txt';

const format = {
  task: '.tsk',
  answer: '.ans'
}

if (fs.existsSync('./first_launch.bat')) fs.unlink('./first_launch.bat', () => {});

if (fs.existsSync(pathToProblems)) rimraf.sync(pathToProblems);
fs.mkdirSync(pathToProblems);

if (!fs.existsSync(pathToLinks)) {
  console.log('Створіть файл з посиланнями');
  return 0;
}

var links = fs.readFileSync(pathToLinks, 'utf8').split('\r\n');

function getTests(link) {
  return new Promise((resolve, reject) => {
    http.get(link, function (resp) {
      var tsk = [],
          ans = [],
          data = "";
      resp.on('data', function (d) {data += d;});
      resp.on('end', function () {
        var $ = cheerio.load(data);
        $('.file.input-view').each(function (i, val) {
          var input = $(val).find('.text pre').text(),
              output = $(val).next().find('.text pre').text(); 
          if (input.indexOf('...') == -1 && output.indexOf('...') == -1) {
            tsk.push(input);
            ans.push(output);
          }
        });
        resolve({task: tsk, answer: ans});
      });
      resp.on('error', function (err) {
        reject(err);
      })
    });
  });
}

function saveTests(path, tsk, ans) {
  return new Promise((resolve, reject) => {
    for(var i=0;i<tsk.length;i++) {
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
  for(var _i = 0;_i<links.length;_i++) {
    console.log(String.fromCharCode(startFolderName.charCodeAt(0) + _i));
    var result = await getTests(links[_i]);

    var tsk = result.task,
        ans = result.answer,
        name = '/' + String.fromCharCode(startFolderName.charCodeAt(0) + _i),
        tmpPath = pathToProblems + name;
    console.log(tmpPath);
    fs.mkdirSync(tmpPath);
    tmpPath += pathToTests;
    console.log(tmpPath);
    fs.mkdirSync(tmpPath);
    await saveTests(tmpPath, tsk, ans);
  }
}

start();