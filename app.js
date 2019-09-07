'use strict';

const fs = require('fs');

const express = require('express');
const app = express();
var torrentstream = require('torrent-stream');

app.listen(5050, () => {
  console.log(`App is running on http://localhost:5050`);
})

const magnet = process.env.magnet;
let path;

const options = {
  tmp: __dirname + '/tmp',
  path: __dirname + '/tmp/files'
}

const streamTorrent = function(req, res, fl) {
  console.log('path', path)
  const fileSize = fl.length
  const range = req.headers.range
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize - 1
    const chunksize = (end - start) + 1
    const file = fl.createReadStream({ start, end })
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(206, head);
    console.log('streaming directly from torrent')
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head)
    fs.createReadStream(path).pipe(res)
  }
}

let engine;

app.get('/video', (req, res) => {
  console.log('request to video !')
  if (engine) {
    console.log('destroy engine');
    engine.destroy();
  }
  engine = torrentstream(magnet, options);
  let fileSize;

  engine.on('ready', function () {
    console.log('ready');
    engine.files.forEach(function (file) {
      console.log('filename:', file.name);
      console.log(`length ${file.length}`);
      console.log(`path: ${file.path}`)
      if (file.name.includes('.mp4')) {
        path = `${__dirname}/tmp/files/${file.path}`;
        fileSize = file.length;
        console.log('stream torrent')
        streamTorrent(req, res, file)
      }
    })
  })

  engine.on('download', function (piece) {
    const percent = Math.round(engine.swarm.downloaded / fileSize * 100 * 100) / 100;
    console.log('downloaded')
    console.log(piece);
    console.log(percent)
  })
})