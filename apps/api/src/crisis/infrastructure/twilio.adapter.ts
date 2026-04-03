import { Injectable, Logger } from "@nestjs/common";
import twilio from "twilio";

@Injectable()
export class TwilioAdapter {
	private readonly logger = new Logger(TwilioAdapter.name);
	private readonly client: twilio.Twilio;
	private readonly fromNumber = process.env.TWILIO_PHONE_NUMBER!;
	private readonly streamBaseUrl = process.env.STREAM_BASE_URL!; // ngrok URL for apps/stream
	private readonly apiBaseUrl = process.env.API_BASE_URL!;

	constructor() {
		this.client = twilio(
			process.env.TWILIO_ACCOUNT_SID!,
			process.env.TWILIO_AUTH_TOKEN!,
		);
	}

	/**
	 * Initiates an outbound call that connects to the apps/stream WebSocket server.
	 * Twilio will stream bidirectional audio to wss://{STREAM_BASE_URL}/crisis/stream.
	 */
	async makeCall(toNumber: string, patientId: string): Promise<string> {
		this.logger.log(`Initiating outbound crisis call to: ${toNumber}`);

		// We use a TwiML URL rather than inline TwiML to keep it clean
		const twiml = `<Response>
  <Connect>
    <Stream url="wss://${this.streamBaseUrl.replace(/^https?:\/\//, "")}/crisis/stream" />
  </Connect>
</Response>`;

		const call = await this.client.calls.create({
			to: toNumber,
			from: this.fromNumber,
			twiml,
			statusCallback: `${this.apiBaseUrl}/api/crisis/twilio/status?patientId=${patientId}`,
			statusCallbackMethod: "POST",
			statusCallbackEvent: ["completed", "no-answer", "busy", "failed"],
			timeout: 30,
		});

		this.logger.log(`Call initiated. SID: ${call.sid}`);
		return call.sid;
	}

	async sendSms(toNumber: string, message: string): Promise<void> {
		this.logger.log(`Sending SMS to emergency contact: ${toNumber}`);
		await this.client.messages.create({
			to: toNumber,
			from: this.fromNumber,
			body: message,
		});
		this.logger.log(`SMS sent to emergency contact.`);
	}
}
