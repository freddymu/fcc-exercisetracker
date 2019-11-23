const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
const MLAB_URI =
  "mongodb://freecodecamp:Testing123@mycluster-shard-00-00-wx9sp.mongodb.net:27017,mycluster-shard-00-01-wx9sp.mongodb.net:27017,mycluster-shard-00-02-wx9sp.mongodb.net:27017/test?ssl=true&replicaSet=MyCluster-shard-0&authSource=admin&retryWrites=true&w=majority";
mongoose.connect(MLAB_URI, { useNewUrlParser: true });

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

let People = mongoose.model("People", { username: String });
let PeopleExercise = mongoose.model("PeopleExercise", {
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

app.post("/api/exercise/new-user", function(req, res) {
  let username = req.body.username;
  let people = new People({ username: username });
  people.save(function(err, model) {
    if (err) return res.json(err);
    res.json(model);
  });
});

app.get("/api/exercise/users", function(req, res) {
  People.find({}, function(err, model) {
    res.json(model);
  });
});

app.post("/api/exercise/add", function(req, res) {
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration; // in minute
  let date = new Date(req.body.date); //yyyy-mm-dd

  if (date == "Invalid Date") {
    date = new Date();
  }

  People.findById(userId, function(err, people) {
    if (err) return res.json(err);

    let peopleExercise = new PeopleExercise({
      userId: userId,
      description: description,
      duration: duration,
      date: date
    });

    peopleExercise.save(function(err, exercise) {
      if (err) return res.json(err);
      res.json({
        username: people.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date
      });
    });
  });
});

app.get("/api/exercise/log", function(req, res) {
  let userId = req.query.userId;
  let from = new Date(req.query.from); // optional
  let to = new Date(req.query.to); // optional
  let limit = req.query.limit; // optional

  if (from == "Invalid Date") {
    from = new Date("1970-01-01");
    console.log(from);
  }

  if (to == "Invalid Date") {
    to = new Date("3000-01-01");
    console.log(to);
  }

  if (limit === undefined) {
    limit = 9999999;
  }

  People.findById(userId, function(err, model) {
    if (err) return res.json(err);

    PeopleExercise.find({ date: { $gte: from, $lte: to } })
      .limit(limit)
      .exec(function(err, data) {
        if (err) return res.json(err);

        let count = data.length;

        let buffers = [];

        data.forEach(function(element) {
          buffers.push({
            description: element.description,
            duration: element.duration,
            date: element.date
          });
        });

        res.json({
          _id: model._id,
          username: model.username,
          count: count,
          log: buffers
        });
      });
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
