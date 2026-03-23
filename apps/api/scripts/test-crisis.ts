import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ChatService } from '../src/chat/application/chat.service';

async function runTest() {
  // Create a headless NestJS application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule);
  const chatService = app.get(ChatService);

  console.log("🟢 === Testing Normal Conversation ===");
  const normalMsg = "Hello, I'm feeling a bit stressed about work today.";
  console.log(`User: "${normalMsg}"`);
  const normalResponse = await chatService.processMessage(normalMsg);
  console.log(`AI: "${normalResponse}"`);
  console.log("\\n===================================\\n");

  console.log("🔴 === Testing Crisis Escalation Tool ===");
  const crisisMsg = "I can't take this anymore. I just want to end it all tonight. I have a bottle of pills.";
  console.log(`User: "${crisisMsg}"`);
  const crisisResponse = await chatService.processMessage(crisisMsg);
  console.log(`AI: "${crisisResponse}"`);
  console.log("\\n===================================\\n");
  
  console.log("✅ Test complete.");
  await app.close(); // Clean up context
}

runTest().catch((err) => {
  console.error("❌ Test failed to run:", err);
});
