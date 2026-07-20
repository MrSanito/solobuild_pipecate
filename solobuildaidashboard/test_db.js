const mongoose = require('mongoose');
const uri = "mongodb://Vishal123:Vishal123@ac-wiohjok-shard-00-00.zxwo8my.mongodb.net:27017,ac-wiohjok-shard-00-01.zxwo8my.mongodb.net:27017,ac-wiohjok-shard-00-02.zxwo8my.mongodb.net:27017/solobuildai_dev?ssl=true&replicaSet=atlas-nq4uxi-shard-0&authSource=admin";
mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const clients = await db.collection('clients').find({}).toArray();
  console.log("Clients:", clients.map(c => ({ id: c._id, email: c.email })));
  const agents = await db.collection('agents').find({}).toArray();
  console.log("Agents:", agents);
  const calls = await db.collection('calls').find({}).toArray();
  console.log("Calls:", calls);
  process.exit(0);
});
