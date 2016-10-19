var cv = require('opencv');
var EventEmitter = require('events');
var sharp = require('sharp');
var socket = require('socket.io-client')('http://localhost:8080');

var camera = new cv.VideoCapture(0);

var clock = new EventEmitter();
var tickDelay = 20;

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
              socket.emit('facedetected', { face: data.toString('base64') });
              return 'ok';
              //console.log(b64);
            })
          );
        }

        Promise.all(plist).then(() => {
          setTimeout(() => clock.emit('tick'), tickDelay);
        });
      });
    }
  });
});

socket.on('connect', function(){
  console.log('connected');
  clock.emit('tick');
});

// window.blockingWaitKey(0, 50);
