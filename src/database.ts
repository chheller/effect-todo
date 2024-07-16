import mongoose from "mongoose";

// Connect to the MongoDB database
const mongoDBURI = process.env.MONGODB_URI ?? "mongodb://localhost:27017";

mongoose.connect(mongoDBURI).then(() => {
	console.log("logged into mongo");
});
export default mongoose;
