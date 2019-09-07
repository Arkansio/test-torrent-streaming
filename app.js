'use strict';

const express = require('express');
const app = express();
var torrentstream = require('torrent-stream');

app.listen(5050, () => {
  console.log(`App is running on http://localhost:5050`);
})

const magnet = 'magnet:?xt=urn:btih:BDBEB3CCFC6D3C844C8468B998F02BC09405A7D0&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://torrent.gresille.org:80/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969&tr=udp://p4p.arenabg.ch:1337&tr=udp://tracker.internetwarriors.net:1337';
let path;

const options = {
  tmp: __dirname + '/tmp'
}

let engine = torrentstream(magnet, options);

engine.on('ready', function () {
  engine.files.forEach(function (file) {
    console.log('filename:', file.name);
    console.log(`length ${file.length}`);
    console.log(`path: ${file.path}`)
    if (file.filename.includes('.mp4'))
      path = file.path;
    var stream = file.createReadStream();
  })
})

engine.on('download', function (name, unknown) {
  console.log('downloaded')
  console.log(name);
  console.log(unknown)
})

app.get('/video', (req, res) => {
  console.log('path', path)
  const stat = fs.statSync(path)
  const fileSize = stat.size
  const range = req.headers.range
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize - 1
    const chunksize = (end - start) + 1
    const file = fs.createReadStream(path, { start, end })
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head)
    fs.createReadStream(path).pipe(res)
  }
})