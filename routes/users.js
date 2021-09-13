var express = require("express");
var router = express.Router();
const https = require("https");
const fs = require("fs");
const { exec } = require("child_process");

var ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
var ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
var command = ffmpeg();
var timemark = null;

var list = "";

var listFilePath = "public/uploads/" + Date.now() + "list.txt";
var inputFilePath = "public/uploads/big_buck_bunny_720p_2mb.mp4";
var outputFilePath = Date.now() + "output.mp4";

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});
router.post("/api/process-interval", (req, res, next) => {
  var duration = 0;
  videoSizeCommand = exec(
    `ffprobe -v error -i ${inputFilePath} -show_entries format=duration -of default=noprint_wrappers=1`
  );

  videoLengthCommand.stdout.on("data", (data) => {

    //Getting video duration(length if the video)
    videoSize = data.split("=")[1];

    const intervalDuration = req.body.interval_duration;
    while (duration < videoSize) {

      //Video segmentation
      exec(
        `ffmpeg -ss ${duration} -i ${inputFilePath} -t ${intervalDuration} -c:v h264 output-${duration}.mp4`,
        (error, stdout, stderr) => {
          duration = duration + intervalDuration;
          if (error) {
            console.log(`error: ${error.message}`);
            return;
          } else {
            res.download(outputFilePath, (err) => {
              if (err) throw err;

              req.files.forEach((file) => {
                fs.unlinkSync(file.path);
              });

              fs.unlinkSync(listFilePath);
              fs.unlinkSync(outputFilePath);
            });
          }
        }
      );
    }
  });
});

//Combine videos
/** Input parameters to run this
 * {
    "segments" : [{
        "video_url": "big_buck_bunny_720p_2mb.mp4"
        "start" : 5,
        "end": 10
    }, {
        "video_url": "big_buck_bunny_720p_2mb.mp4"
        "start" : 5,
        "end": 10
    }],
    "width" : 480,
    "height" : 640
}
 */
router.post("/api/combine-video", (req, res, next) => {
  if (req.body.segments) {
    req.body.segments.forEach((file) => {
      list += `file ${file.video_url}`;
      list += "\n";
    });

    //Reading files names and writing to txt file
    var writeStream = fs.createWriteStream(listFilePath);

    writeStream.write(list);

    writeStream.end();

    //Concatinating video segments
    exec(
      `ffmpeg -safe 0 -f concat -i ${listFilePath} -c copy ${outputFilePath}`,
      (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        } else {
          console.log("videos are successfully merged");
          res.download(outputFilePath, (err) => {
            if (err) throw err;

            req.files.forEach((file) => {
              fs.unlinkSync(file.path);
            });

            fs.unlinkSync(listFilePath);
            fs.unlinkSync(outputFilePath);
          });
        }
      }
    );
  }
});

module.exports = router;
