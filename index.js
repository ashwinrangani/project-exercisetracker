const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = require("mongoose");
const bodyParser = require("body-parser");
const { serialize } = require("mongodb");

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const user = new Schema({
  username: {
    type: String,
    required: true,
  },

  exercises: [
    {
      description: String,
      duration: Number,
      date: Date,
    },
  ],
});
const Users = mongoose.model("Users", user);

//Routes

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const newUser = new Users({ username });

  try {
    const data = await newUser.save();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while saving the user." });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const data = await Users.find().exec();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching users." });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { duration, description, date } = req.body;
  const newDuration = parseInt(duration);

  let excerciseDate;
  if (date) {
    excerciseDate = new Date(date).toDateString();
  } else {
    excerciseDate = new Date().toDateString();
  }

  try {
    const user = await Users.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newExercise = {
      description,
      duration: newDuration,
      date: excerciseDate,
    };
    user.exercises.push(newExercise);
    await user.save();

    res.json({
      username: user.username,
      description,
      duration: newDuration,
      date: excerciseDate,
      _id: user._id,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const { _id } = req.params;

  try {
    const user = await Users.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const exerciseQuery = { _id: user._id };
    if (from && to) {
      exerciseQuery.date = {
        $gte: new Date(from),
        $lt: new Date(to),
      };
    }

    let exercises = user.exercises;

    exercises = exercises.filter((exercise) => {
      const exerciseDate = new Date(exercise.date);
      return (
        !exerciseQuery.date ||
        (exerciseQuery.date.$gte <= exerciseDate &&
          exerciseQuery.date.$lt > exerciseDate)
      );
    });

    if (limit) {
      exercises = exercises.slice(0, parseInt(limit));
    }

    const exerciseCount = exercises.length;

    const formattedExercises = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    }));

    const response = {
      username: user.username,
      count: exerciseCount,
      log: formattedExercises,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
