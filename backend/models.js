const mongoose = require("mongoose");

const User = mongoose.model("User",{
 name:String,
 email:String,
 password:String
});

const Project = mongoose.model("Project",{
 name:String,
 deadline:Date
});

const Task = mongoose.model("Task",{
 projectId:String,
 estimated:Number,
 actual:Number,
 completion:Number
});

module.exports={User,Project,Task};