const mongoose = require('mongoose');

const RcloneConfigSchema = new mongoose.Schema({
  alias: { type: String, required: true, unique: true },
  rcloneName: { type: String, required: true },
  configText: { type: String, required: true },
  isEphemeral: { type: Boolean, required: true },
  workerId: { type: String }
});

const configModel = mongoose.model('RcloneConfig', RcloneConfigSchema);

async function test() {
  try {
     // Wait for connection to timeout
     await mongoose.connect('mongodb://127.0.0.1:27017/swarm_commander', { serverSelectionTimeoutMS: 2000 });

     await configModel.deleteMany({});
     await configModel.create({ alias: 'my_alias', rcloneName: 'drive:', configText: '...', isEphemeral: false });

     const aliases = await configModel.distinct('alias').exec();
     console.log("Distinct Aliases:", aliases);

     await mongoose.disconnect();
  } catch (e) {
     console.error("DB Error:", e.message);
  }
}
test();
