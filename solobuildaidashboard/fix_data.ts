import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Client, Agent, Campaign, Call } from './lib/models';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("password123", salt);

  // 1. Create vishal@voiceai.com if not exists
  let vishal = await Client.findOne({ email: "vishal@voiceai.com" });
  if (!vishal) {
    vishal = await Client.create({
      name: "Vishal VoiceAI",
      slug: "vishal-voiceai",
      email: "vishal@voiceai.com",
      passwordHash: hash,
      vobiz: {
        authId: "dummy",
        authToken: "dummy",
        phoneNumber: "dummy",
        encoding: "audio/x-mulaw",
        sampleRate: 8000,
        l16Endian: "le"
      }
    });
    console.log("Created vishal@voiceai.com");
  } else {
    console.log("vishal@voiceai.com already exists");
  }

  // 2. Make sure contact@solobuildai.com has all existing data
  const contact = await Client.findOne({ email: "contact@solobuildai.com" });
  if (contact) {
    const contactId = contact._id;
    
    // Update agents
    const agentsResult = await Agent.updateMany({}, { $set: { clientId: contactId } });
    console.log(`Updated ${agentsResult.modifiedCount} agents to contact@solobuildai.com`);
    
    // Update campaigns
    const campaignsResult = await Campaign.updateMany({}, { $set: { clientId: contactId } });
    console.log(`Updated ${campaignsResult.modifiedCount} campaigns to contact@solobuildai.com`);
    
    // Update calls
    const callsResult = await Call.updateMany({}, { $set: { clientId: contactId } });
    console.log(`Updated ${callsResult.modifiedCount} calls to contact@solobuildai.com`);
  }

  process.exit(0);
}

run();
