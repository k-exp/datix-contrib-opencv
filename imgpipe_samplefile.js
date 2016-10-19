var cv = require('opencv');
var EventEmitter = require('events');
var sharp = require('sharp');
var socket = require('socket.io-client')('http://localhost:8080');
var uuid = require('node-uuid');
var moment = require('moment');
var fs = require('fs');

var camera = new cv.VideoCapture(0);

var clock = new EventEmitter();
var tickDelay = 20;

var stop = false;
var outobj = { images: [] }

clock.on('tick', () => {

  camera.read((err, im) => {
    if (err) throw err;

    if (im.size()[0] > 0 && im.size()[1] > 0){
      im.detectObject(cv.FACE_CASCADE, {}, (err, faces) => {
        if (err) throw err;

        let plist = [];

        for (var i = 0; i < faces.length; i++){
          var face = faces[i];
          //im.ellipse(face.x + face.width / 2, face.y + face.height / 2, face.width / 2, face.height / 2);
          //im.rectangle([face.x, face.y], [face.width, face.height]);
          var faceres = im.crop(face.x, face.y, face.width, face.height);

          // convert to buffer
          var buf = faceres.toBuffer();

          // load into sharp, resize 60
          plist.push(sharp(buf)
            .resize(60)
            .toBuffer()
            .then(data => {
              // var b64 = 'data:image/png;base64,' + data.toString('base64');
              // socket.emit('facedetected', { face: data.toString('base64') });
              return { id: uuid.v4(), timestamp: moment().format(), face: data.toString('base64') };
              //console.log(b64);
            })
          );
        }

        Promise.all(plist).then((res) => {
          for(var i = 0; i < res.length; i++) {
            outobj.images.push(res[i]);
          }
          if(!stop) {
            setTimeout(() => clock.emit('tick'), tickDelay);
          }
        });
      });
    }
  });
});

let runningTime = 8000;
clock.emit('tick');
setTimeout(() => {
  stop = true;
  fs.writeFile('sample.json', JSON.stringify(outobj), 'utf8', (err) => {
    if(err) {
      console.log('ERROR');
    }
    else {
      console.log(outobj.images.length);
    }
  });

}, runningTime);


// window.blockingWaitKey(0, 50);
