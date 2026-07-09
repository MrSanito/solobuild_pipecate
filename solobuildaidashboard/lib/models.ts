import mongoose, { Schema, model, Document, Model, Types } from 'mongoose';

/* =========================================================
   SUB-SCHEMAS (embedded, no separate collections)
   ========================================================= */

interface INote {
  text: string;
  addedBy?: Types.ObjectId;
  createdAt: Date;
}
const NoteSchema = new Schema<INote>(
  {
    text: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'Client' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

interface IStatusHistoryEntry {
  status: string;
  subStatus?: string;
  changedAt: Date;
}
const StatusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: { type: String, required: true },
    subStatus: { type: String },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export interface IContact {
  _id: Types.ObjectId;
  name: string;
  number: string;
  detail?: string;
  notes: INote[];
  status: string;
  subStatus?: string;
  statusHistory: IStatusHistoryEntry[];
  callAttempts: number;
  lastCallAt?: Date;
  lastCallStatus?: string;
}
const ContactSchema = new Schema<IContact>({
  name: { type: String, required: true },
  number: { type: String, required: true },
  detail: { type: String },
  notes: { type: [NoteSchema], default: [] },
  status: {
    type: String,
    enum: ['new', 'queued', 'calling', 'contacted', 'completed', 'failed', 'do_not_call'],
    default: 'new',
  },
  subStatus: { type: String },
  statusHistory: { type: [StatusHistorySchema], default: [] },
  callAttempts: { type: Number, default: 0 },
  lastCallAt: { type: Date },
  lastCallStatus: { type: String },
});

interface ISubStatusOption {
  code: string;
  label: string;
}
interface IStatusOption {
  code: string;
  label: string;
  subStatuses?: ISubStatusOption[];
}
const StatusOptionSchema = new Schema<IStatusOption>(
  {
    code: { type: String, required: true },
    label: { type: String, required: true },
    subStatuses: [
      {
        code: { type: String, required: true },
        label: { type: String, required: true },
      },
    ],
  },
  { _id: false }
);

/* =========================================================
   CLIENT (linked to Vobiz integration)
   ========================================================= */

interface IVobizConfig {
  authId: string; // VOBIZ_AUTH_ID
  authToken: string; // VOBIZ_AUTH_TOKEN (stored ENCRYPTED)
  phoneNumber: string; // VOBIZ_PHONE_NUMBER outbound caller ID
  webhookSecret?: string;
  encoding?: string; // audio/x-mulaw | audio/x-l16
  sampleRate?: number; // 8000 | 16000
  l16Endian?: string; // le | be
}
const VobizConfigSchema = new Schema<IVobizConfig>(
  {
    authId: { type: String, required: true },
    authToken: { type: String, required: true, select: false }, // never returned unless explicitly requested
    phoneNumber: { type: String, required: true },
    webhookSecret: { type: String, select: false },
    encoding: { type: String, default: 'audio/x-mulaw' },
    sampleRate: { type: Number, default: 8000 },
    l16Endian: { type: String, default: 'le' },
  },
  { _id: false }
);

export interface IClient extends Document {
  name: string;
  slug: string;
  email: string;
  passwordHash: string;
  phone?: string;
  timezone?: string;
  plan: 'trial' | 'starter' | 'pro';
  isActive: boolean;
  vobiz: IVobizConfig;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String },
    timezone: { type: String, default: 'Asia/Kolkata' },
    plan: { type: String, enum: ['trial', 'starter', 'pro'], default: 'trial' },
    isActive: { type: Boolean, default: true },
    vobiz: { type: VobizConfigSchema, required: true },
  },
  { timestamps: true }
);

export const Client: Model<IClient> =
  mongoose.models.Client || model<IClient>('Client', ClientSchema);

/* =========================================================
   AGENT (new schema configuration)
   ========================================================= */

export interface IAgent extends Document {
  clientId: Types.ObjectId;
  name: string;
  agentName: string; // Pipecat Cloud Agent name
  orgName: string; // Pipecat Cloud Org name
  prompt: string; // The system instructions / persona prompt
  voice: string; // e.g., "Puck"
  language: string; // e.g., "hi-IN"
  aiModel: string; // e.g., "gemini-3.1-flash-live-preview"
  temperature: number;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    name: { type: String, required: true },
    agentName: { type: String, required: true },
    orgName: { type: String, required: true },
    prompt: { type: String, required: true },
    voice: { type: String, default: 'Puck' },
    language: { type: String, default: 'hi-IN' },
    aiModel: { type: String, default: 'gemini-3.1-flash-live-preview' },
    temperature: { type: Number, default: 0.6 },
  },
  { timestamps: true }
);

export const Agent: Model<IAgent> =
  mongoose.models.Agent || model<IAgent>('Agent', AgentSchema);

/* =========================================================
   CAMPAIGN
   ========================================================= */

interface ICampaignStats {
  totalContacts: number;
  totalCalls: number;
  completed: number;
  inProgress: number;
}
const CampaignStatsSchema = new Schema<ICampaignStats>(
  {
    totalContacts: { type: Number, default: 0 },
    totalCalls: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
  },
  { _id: false }
);

export interface ICampaign extends Document {
  clientId: Types.ObjectId;
  name: string;
  goal?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  agentId: Types.ObjectId; // References the Agent model
  contacts: Types.DocumentArray<IContact>;
  statusOptions: IStatusOption[];
  stats: ICampaignStats;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    name: { type: String, required: true },
    goal: { type: String },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed', 'archived'],
      default: 'draft',
    },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    contacts: { type: [ContactSchema], default: [] },
    statusOptions: { type: [StatusOptionSchema], default: [] },
    stats: { type: CampaignStatsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

CampaignSchema.index({ 'contacts.number': 1 });

export const Campaign: Model<ICampaign> =
  mongoose.models.Campaign || model<ICampaign>('Campaign', CampaignSchema);

/* =========================================================
   CALL
   ========================================================= */

interface ITranscriptTurn {
  speaker: 'agent' | 'contact';
  text: string;
  ts: number;
}
const TranscriptTurnSchema = new Schema<ITranscriptTurn>(
  {
    speaker: { type: String, enum: ['agent', 'contact'], required: true },
    text: { type: String, required: true },
    ts: { type: Number, required: true },
  },
  { _id: false }
);

interface ICallAnalysis {
  sentiment?: string;
  intent?: string;
  actionItems?: string[];
}
const CallAnalysisSchema = new Schema<ICallAnalysis>(
  {
    sentiment: { type: String },
    intent: { type: String },
    actionItems: { type: [String], default: [] },
  },
  { _id: false }
);

export interface ICall extends Document {
  clientId: Types.ObjectId;
  campaignId?: Types.ObjectId;
  contactId?: Types.ObjectId;
  direction: 'outbound' | 'inbound';
  providerCallId: string;
  agentSessionId?: string;
  fromNumber: string;
  toNumber: string;
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
  callStatus: string;
  outcome?: string;
  recordingId?: string; // Vobiz Recording ID
  recordingUri?: string; // Vobiz Recording remote download URI
  recordingLocalPath?: string; // Downloaded file location on local storage
  transcript: ITranscriptTurn[];
  transcriptSummary?: string;
  analysis?: ICallAnalysis;
  cost?: number;
  createdAt: Date;
}

const CallSchema = new Schema<ICall>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    contactId: { type: Schema.Types.ObjectId, index: true },
    direction: { type: String, enum: ['outbound', 'inbound'], required: true },
    providerCallId: { type: String, required: true, unique: true },
    agentSessionId: { type: String },
    fromNumber: { type: String, required: true },
    toNumber: { type: String, required: true },
    startedAt: { type: Date },
    answeredAt: { type: Date },
    endedAt: { type: Date },
    durationSeconds: { type: Number },
    callStatus: {
      type: String,
      enum: ['initiated', 'ringing', 'answered', 'completed', 'no_answer', 'busy', 'failed', 'voicemail'],
      default: 'initiated',
    },
    outcome: { type: String },
    recordingId: { type: String },
    recordingUri: { type: String },
    recordingLocalPath: { type: String },
    transcript: { type: [TranscriptTurnSchema], default: [] },
    transcriptSummary: { type: String },
    analysis: { type: CallAnalysisSchema },
    cost: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CallSchema.index({ campaignId: 1, createdAt: -1 });
CallSchema.index({ contactId: 1, createdAt: -1 });

export const Call: Model<ICall> = mongoose.models.Call || model<ICall>('Call', CallSchema);
