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
  connections: 100,     // Max amount of peers to be connected to.
  uploads: 10,
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

let engines = new Map();

app.get('/video_two', (req, res) => {
  console.log('request to video_two !')
  if (engines.has('video_two')) {
    console.log('destroy engine two');
    engines.get('video_two').destroy();
    engines.delete('video_two');
  }
  let mengine = torrentstream(process.env.magnet_two, options);
  let fileSize;

  let ourFile;
  mengine.on('ready', function () {
    console.log('ready video two');
    mengine.files.forEach(function (file) {
      console.log('filename:', file.name);
      console.log(`length ${file.length}`);
      console.log(`file path: ${file.path}`)
      file.select();
      if (file.name.includes('.mp4')) {
        console.log('file name')
        path = `${__dirname}/tmp/files/${file.path}`;
        fileSize = file.length;
        ourFile = file;
        console.log('this is an mp4', file.name)
        console.log('stream torrent')
        streamTorrent(req, res, file)
      }
    })
  })
  mengine.on('download', function (piece) {
    console.log(`[video_two] pcs: ${piece}`)
  })

  mengine.on('upload', function(pieces, offset, length) {
    console.log(`[video_two] upload [pieces: ${pieces}| offset: ${offset}| length: ${length}]`);
  })

  mengine.on('idle', function() {
    console.log(`[video_two] all files downloaded.`)
    ourFile.select();
  })

  engines.set('video_two', mengine)
})

app.get('/video', (req, res) => {
  console.log('request to video !')
  if (engines.has('video')) {
    console.log('destroy engine');
    engines.get('video').destroy();
    engines.delete('video');
  }
  let engine = torrentstream(magnet, options);
  let fileSize;

  engines.set('video', engine)

  let ourFile;
  engine.on('ready', function () {
    console.log('ready');
    engine.files.forEach(function (file) {
      console.log('filename:', file.name);
      console.log(`length ${file.length}`);
      console.log(`path: ${file.path}`)
      if (file.name.includes('.mp4')) {
        path = `${__dirname}/tmp/files/${file.path}`;
        fileSize = file.length;
        ourFile = file;
        console.log('stream torrent')
        streamTorrent(req, res, file)
      }
    })
  })

  engine.on('download', function (piece) {
    console.log(`[video_one] pcs: ${piece}`)
  })

  engine.on('upload', function(pieces, offset, length) {
    console.log(`[video_one] upload [pieces: ${pieces}| offset: ${offset}| length: ${length}]`);
  })

  engine.on('idle', function() {
    console.log(`[video_one] all files downloaded.`)
    ourFile.select();
  })
})

setInterval(() => console.log(engines.size), 3000)